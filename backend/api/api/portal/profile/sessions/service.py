"""Portal 会话管理业务逻辑层。

处理用户会话列表、撤销等业务。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.auth import repository as auth_repo

from .schemas import SessionResponse


class SessionService:
    """会话管理业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def list_sessions(
        self, user_id: str, current_token_hash: str
    ) -> list[SessionResponse]:
        """列出当前用户所有活跃会话。"""
        tokens = await auth_repo.list_user_refresh_tokens(
            self.session, user_id
        )
        return [
            SessionResponse(
                id=token.id,
                user_agent=token.user_agent,
                ip_address=token.ip_address,
                created_at=token.created_at,
                is_current=(token.token_hash == current_token_hash),
            )
            for token in tokens
        ]

    async def revoke_session(
        self, token_id: str, user_id: str
    ) -> None:
        """撤销指定会话。"""
        success = await auth_repo.revoke_refresh_token_by_id(
            self.session, token_id, user_id
        )
        if not success:
            raise NotFoundException(
                message="会话不存在或已被撤销",
                code="SESSION_NOT_FOUND",
            )

    async def revoke_all_sessions(
        self, user_id: str, current_token_hash: str
    ) -> None:
        """撤销除当前设备外的所有会话。"""
        await auth_repo.revoke_other_refresh_tokens(
            self.session, user_id, current_token_hash
        )
