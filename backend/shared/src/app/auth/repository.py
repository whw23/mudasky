"""认证领域数据访问层。

封装短信验证码和刷新令牌的数据库操作。
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedException

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


async def verify_sms_code(
    session: AsyncSession, phone: str, code: str
) -> None:
    """校验短信验证码。

    验证通过后标记为已使用，失败则抛出异常。
    """
    sms_code = await get_latest_sms_code(session, phone)
    if not sms_code:
        raise UnauthorizedException(message="验证码无效或已过期", code="SMS_CODE_EXPIRED")
    sms_code.attempts += 1
    if sms_code.code != code:
        await session.commit()
        raise UnauthorizedException(message="验证码不正确", code="SMS_CODE_INCORRECT")
    sms_code.is_used = True
    await session.commit()


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


async def delete_expired_sms_codes(
    session: AsyncSession, phone: str
) -> None:
    """删除指定手机号的已过期或已使用的验证码。"""
    now = datetime.now(timezone.utc)
    stmt = delete(SmsCode).where(
        SmsCode.phone == phone,
        (SmsCode.expires_at <= now) | (SmsCode.is_used.is_(True)),
    )
    await session.execute(stmt)


async def delete_expired_refresh_tokens(
    session: AsyncSession,
) -> int:
    """删除所有已过期的刷新令牌，返回删除数量。"""
    now = datetime.now(timezone.utc)
    stmt = delete(RefreshToken).where(RefreshToken.expires_at <= now)
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount


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


async def revoke_refresh_token_by_hash(
    session: AsyncSession, token_hash: str
) -> None:
    """根据令牌哈希撤销单个刷新令牌。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    await session.execute(stmt)
    await session.commit()


async def revoke_other_refresh_tokens(
    session: AsyncSession, user_id: str, current_hash: str
) -> None:
    """撤销用户除当前令牌外的所有刷新令牌。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.user_id == user_id,
        RefreshToken.token_hash != current_hash,
    )
    await session.execute(stmt)
    await session.commit()


async def list_user_refresh_tokens(
    session: AsyncSession, user_id: str
) -> list[RefreshToken]:
    """列出用户所有未过期的刷新令牌。"""
    now = datetime.now(timezone.utc)
    stmt = (
        select(RefreshToken)
        .where(
            RefreshToken.user_id == user_id,
            RefreshToken.expires_at > now,
        )
        .order_by(RefreshToken.created_at.desc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def revoke_refresh_token_by_id(
    session: AsyncSession, token_id: str, user_id: str
) -> bool:
    """根据令牌 ID 撤销单个刷新令牌，返回是否成功。"""
    stmt = delete(RefreshToken).where(
        RefreshToken.id == token_id,
        RefreshToken.user_id == user_id,
    )
    result = await session.execute(stmt)
    await session.commit()
    return result.rowcount > 0
