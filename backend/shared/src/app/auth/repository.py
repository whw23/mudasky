"""认证领域数据访问层。

封装短信验证码和刷新令牌的数据库操作。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import RefreshToken, SmsCode


async def create_sms_code(
    session: AsyncSession, sms_code: SmsCode
) -> SmsCode:
    """创建短信验证码记录。"""
    session.add(sms_code)
    await session.commit()
    await session.refresh(sms_code)
    return sms_code


async def get_latest_sms_code(
    session: AsyncSession, phone: str
) -> SmsCode | None:
    """获取最新的有效短信验证码。

    条件：未使用、未过期、尝试次数小于 5 次。
    """
    now = datetime.now(timezone.utc)
    stmt = (
        select(SmsCode)
        .where(
            SmsCode.phone == phone,
            SmsCode.is_used.is_(False),
            SmsCode.expires_at > now,
            SmsCode.attempts < 5,
        )
        .order_by(SmsCode.created_at.desc())
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def count_recent_sms(
    session: AsyncSession, phone: str, minutes: int = 60
) -> int:
    """统计指定时间段内发送的短信数量。"""
    since = datetime.now(timezone.utc) - timedelta(minutes=minutes)
    stmt = (
        select(func.count())
        .select_from(SmsCode)
        .where(
            SmsCode.phone == phone,
            SmsCode.created_at > since,
        )
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def save_refresh_token(
    session: AsyncSession, token: RefreshToken
) -> RefreshToken:
    """保存刷新令牌。"""
    session.add(token)
    await session.commit()
    await session.refresh(token)
    return token


async def get_refresh_token_by_hash(
    session: AsyncSession, token_hash: str
) -> RefreshToken | None:
    """根据令牌哈希查询刷新令牌。"""
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def revoke_user_refresh_tokens(
    session: AsyncSession, user_id: str
) -> None:
    """撤销用户所有刷新令牌。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.user_id == user_id
    )
    await session.execute(stmt)
    await session.commit()
