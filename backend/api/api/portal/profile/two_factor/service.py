"""Portal 双因素认证业务逻辑层。

处理 TOTP 启用/确认、短信 2FA 启用、2FA 关闭等业务。
"""

import pyotp
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.db.auth import repository as auth_repo
from app.db.user import repository
from app.db.user.models import User


class TwoFactorService:
    """双因素认证业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def _get_user(self, user_id: str) -> User:
        """获取用户 ORM 对象，不存在则抛出异常。"""
        user = await repository.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(
                message="用户不存在", code="USER_NOT_FOUND"
            )
        return user

    async def enable_totp(self, user_id: str) -> tuple[str, User]:
        """启用 TOTP 双因素认证，生成密钥。

        返回 (TOTP 密钥, 用户对象) 元组。
        """
        user = await self._get_user(user_id)
        secret = pyotp.random_base32()
        user.totp_secret = secret
        await repository.update(self.session, user)
        return secret, user

    async def confirm_totp(
        self, user_id: str, totp_code: str
    ) -> None:
        """确认启用 TOTP 双因素认证。

        验证 TOTP 代码正确后，设置 two_factor_enabled 和 method。
        """
        user = await self._get_user(user_id)
        if not user.totp_secret:
            raise ConflictException(
                message="请先启用双因素认证",
                code="TWO_FA_NOT_ENABLED",
            )
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(totp_code):
            raise ConflictException(
                message="验证码不正确",
                code="TWO_FA_CODE_INCORRECT",
            )
        user.two_factor_enabled = True
        user.two_factor_method = "totp"
        await repository.update(self.session, user)

    async def enable_sms(
        self, user_id: str, phone: str, code: str
    ) -> None:
        """启用短信双因素认证。

        验证手机号匹配和短信验证码后直接启用。
        """
        user = await self._get_user(user_id)
        if not user.phone:
            raise ConflictException(
                message="请先绑定手机号",
                code="PHONE_NOT_BOUND",
            )
        if user.phone != phone:
            raise ConflictException(
                message="手机号与当前账号不匹配",
                code="PHONE_MISMATCH",
            )
        await auth_repo.verify_sms_code(self.session, phone, code)
        user.two_factor_enabled = True
        user.two_factor_method = "sms"
        user.totp_secret = None
        await repository.update(self.session, user)

    async def disable(
        self, user_id: str, phone: str, code: str
    ) -> None:
        """关闭双因素认证。

        需验证手机短信验证码。
        """
        user = await self._get_user(user_id)
        if user.phone != phone:
            raise ConflictException(
                message="手机号不匹配",
                code="PHONE_MISMATCH",
            )
        await auth_repo.verify_sms_code(self.session, phone, code)
        user.two_factor_enabled = False
        user.two_factor_method = None
        user.totp_secret = None
        await repository.update(self.session, user)
