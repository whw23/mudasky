"""认证领域业务逻辑层。

处理短信验证码发送、用户注册、三种登录方式、二步验证、令牌续签等业务。
"""

import secrets
from datetime import datetime, timedelta, timezone

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import repository
from app.auth.models import RefreshToken, SmsCode
from app.auth.sms import send_sms_code
from app.core.exceptions import (
    ConflictException,
    NotFoundException,
    TooManyRequestsException,
    UnauthorizedException,
)
from app.core.config import settings
from app.core.crypto import decrypt_password
from app.core.security import hash_password, verify_password
from app.rbac import repository as rbac_repo
from app.user import repository as user_repo
from app.user.models import User
from app.user.schemas import UserResponse


class AuthService:
    """认证业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def send_code(self, phone: str) -> str | None:
        """发送短信验证码。

        限流规则：同一手机号 60 秒内只能发送一次，每小时最多 5 次。
        DEBUG 模式下返回验证码，生产环境返回 None。
        """
        await self._check_sms_rate_limit(phone)
        # 清理该手机号的已过期验证码
        await repository.delete_expired_sms_codes(self.session, phone)
        code = self._generate_code()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        sms_code = SmsCode(
            phone=phone, code=code, expires_at=expires_at
        )
        await repository.create_sms_code(self.session, sms_code)
        await send_sms_code(phone, code)
        return code if settings.DEBUG else None

    async def register(
        self,
        phone: str,
        code: str,
        username: str | None = None,
        encrypted_password: str | None = None,
        nonce: str | None = None,
    ) -> User:
        """用户注册。

        验证短信验证码后创建用户，可选设置用户名和密码。
        """
        await repository.verify_sms_code(self.session, phone, code)
        existing = await user_repo.get_by_phone(self.session, phone)
        if existing:
            raise ConflictException(message="手机号已注册")
        if username:
            existing_name = await user_repo.get_by_username(
                self.session, username
            )
            if existing_name:
                raise ConflictException(message="用户名已被使用")
        password = None
        if encrypted_password and nonce:
            password = decrypt_password(encrypted_password, nonce)
        password_hash = hash_password(password) if password else None
        user = User(
            phone=phone,
            username=username,
            password_hash=password_hash,
        )
        user = await user_repo.create(self.session, user)
        return user

    async def login(
        self,
        phone: str | None = None,
        username: str | None = None,
        encrypted_password: str | None = None,
        nonce: str | None = None,
        code: str | None = None,
        totp: str | None = None,
        sms_code_2fa: str | None = None,
    ) -> tuple[User, str | None]:
        """用户登录，返回 (用户, 二步验证步骤)。

        支持三种登录方式：
        1. 手机号 + 短信验证码：直接登录，不需要二步验证
        2. 用户名 + 密码：需检查二步验证
        3. 手机号 + 密码：需检查二步验证
        """
        # 解密密码
        password = None
        if encrypted_password and nonce:
            password = decrypt_password(encrypted_password, nonce)
        if phone and code and not password:
            return await self._login_by_sms(phone, code)
        if username and password:
            user = await self._get_user_by_username(username)
            return await self._login_with_password(
                user, password, totp, sms_code_2fa
            )
        if phone and password:
            user = await self._get_user_by_phone(phone)
            return await self._login_with_password(
                user, password, totp, sms_code_2fa
            )
        raise UnauthorizedException(message="请提供有效的登录凭据")

    async def refresh(self, token_hash: str) -> User:
        """刷新令牌续签，返回用户信息。

        验证令牌哈希、删除旧令牌、检查用户状态。
        """
        token = await repository.get_refresh_token_by_hash(
            self.session, token_hash
        )
        if not token:
            raise UnauthorizedException(message="刷新令牌无效")
        now = datetime.now(timezone.utc)
        if token.expires_at < now:
            raise UnauthorizedException(message="刷新令牌已过期")
        await repository.revoke_user_refresh_tokens(
            self.session, token.user_id
        )
        user = await user_repo.get_by_id(
            self.session, token.user_id
        )
        if not user or not user.is_active:
            raise UnauthorizedException(message="用户不存在或已禁用")
        return user

    async def save_refresh_token_hash(
        self,
        user_id: str,
        token_hash: str,
        expire_days: int = 30,
    ) -> None:
        """保存刷新令牌哈希。"""
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=expire_days
        )
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        await repository.save_refresh_token(self.session, token)

    async def build_user_response(
        self, user: User
    ) -> UserResponse:
        """构建包含权限和权限组的用户响应。"""
        permissions = await rbac_repo.get_user_permissions(
            self.session, user.id
        )
        group_name = await rbac_repo.get_user_group_name(
            self.session, user.id
        )
        return UserResponse(
            id=user.id,
            phone=user.phone,
            username=user.username,
            user_type=user.user_type,
            is_superuser=user.is_superuser,
            is_active=user.is_active,
            two_factor_enabled=user.two_factor_enabled,
            storage_quota=user.storage_quota,
            permissions=permissions,
            group_id=user.group_id,
            group_name=group_name,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    # ---- 私有方法 ----

    async def _check_sms_rate_limit(self, phone: str) -> None:
        """检查短信发送频率限制。"""
        # 60 秒内不能重复发送
        latest = await repository.get_latest_sms_code(
            self.session, phone
        )
        if latest:
            elapsed = datetime.now(timezone.utc) - latest.created_at
            if elapsed < timedelta(seconds=60):
                raise TooManyRequestsException(
                    message="验证码发送过于频繁，请稍后再试"
                )
        # 每小时最多 5 次
        count = await repository.count_recent_sms(
            self.session, phone, minutes=60
        )
        if count >= 5:
            raise TooManyRequestsException(
                message="验证码发送次数已达上限，请一小时后再试"
            )

    async def _login_by_sms(
        self, phone: str, code: str
    ) -> tuple[User, str | None]:
        """手机号 + 短信验证码登录，不需要二步验证。

        如果手机号未注册，自动创建用户。
        """
        await repository.verify_sms_code(self.session, phone, code)
        user = await user_repo.get_by_phone(self.session, phone)
        if not user:
            user = await self._auto_register(phone)
        self._check_user_active(user)
        return user, None

    async def _auto_register(self, phone: str) -> User:
        """手机号验证码登录时自动注册新用户。"""
        from app.core.config import settings

        user = User(phone=phone, storage_quota=settings.default_storage_quota_bytes)
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def _login_with_password(
        self,
        user: User,
        password: str,
        totp: str | None,
        sms_code_2fa: str | None,
    ) -> tuple[User, str | None]:
        """密码登录，检查二步验证。"""
        self._check_user_active(user)
        if not user.password_hash:
            raise UnauthorizedException(message="用户未设置密码")
        if not verify_password(password, user.password_hash):
            raise UnauthorizedException(message="密码不正确")
        if not user.two_factor_enabled:
            return user, None
        return await self._handle_2fa(
            user, totp, sms_code_2fa
        )

    async def _handle_2fa(
        self,
        user: User,
        totp: str | None,
        sms_code_2fa: str | None,
    ) -> tuple[User, str | None]:
        """处理二步验证逻辑。

        根据用户的 two_factor_method 决定验证方式：
        - totp: 优先使用 TOTP 验证器，也接受短信备选
        - sms: 只使用短信验证
        """
        # TOTP 验证（仅 totp 模式）
        if totp and user.two_factor_method == "totp" and user.totp_secret:
            totp_obj = pyotp.TOTP(user.totp_secret)
            if not totp_obj.verify(totp):
                raise UnauthorizedException(
                    message="TOTP 验证码不正确"
                )
            return user, None
        # 短信验证码（totp 和 sms 模式都接受）
        if sms_code_2fa:
            await repository.verify_sms_code(
                self.session, user.phone, sms_code_2fa
            )
            return user, None
        # 未提供验证码，自动发送短信
        await self.send_code(user.phone)
        return user, "2fa_required"

    async def _get_user_by_phone(self, phone: str) -> User:
        """根据手机号获取用户，不存在则抛出异常。"""
        user = await user_repo.get_by_phone(self.session, phone)
        if not user:
            raise NotFoundException(message="用户不存在")
        return user

    async def _get_user_by_username(
        self, username: str
    ) -> User:
        """根据用户名获取用户，不存在则抛出异常。"""
        user = await user_repo.get_by_username(
            self.session, username
        )
        if not user:
            raise NotFoundException(message="用户不存在")
        return user

    @staticmethod
    def _check_user_active(user: User) -> None:
        """检查用户是否处于活跃状态。"""
        if not user.is_active:
            raise UnauthorizedException(message="用户已被禁用")

    @staticmethod
    def _generate_code() -> str:
        """生成 6 位数字验证码。"""
        return f"{secrets.randbelow(1000000):06d}"
