"""Portal 会话管理路由层。

提供会话列表、撤销指定会话、撤销所有其他会话等 API 端点。
"""

from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from api.core.dependencies import CurrentUserId, DbSession

from .schemas import SessionResponse
from .service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


class MessageResponse(BaseModel):
    """通用消息响应。"""

    message: str


class RevokeSessionBody(BaseModel):
    """撤销指定会话请求体。"""

    token_id: str = Field(..., description="要撤销的会话 ID")


@router.get(
    "/list",
    response_model=list[SessionResponse],
    summary="查看所有活跃会话",
)
async def list_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> list[SessionResponse]:
    """列出当前用户所有活跃会话。"""
    svc = SessionService(session)
    return await svc.list_sessions(user_id, x_refresh_token_hash)


@router.post(
    "/list/revoke",
    response_model=MessageResponse,
    summary="撤销指定会话",
)
async def revoke_session(
    data: RevokeSessionBody,
    user_id: CurrentUserId,
    session: DbSession,
) -> MessageResponse:
    """撤销指定会话。"""
    svc = SessionService(session)
    await svc.revoke_session(data.token_id, user_id)
    return MessageResponse(message="会话已撤销")


@router.post(
    "/list/revoke-all",
    response_model=MessageResponse,
    summary="撤销所有其他会话",
)
async def revoke_all_sessions(
    user_id: CurrentUserId,
    session: DbSession,
    x_refresh_token_hash: str = Header(""),
) -> MessageResponse:
    """撤销除当前设备外的所有会话。"""
    svc = SessionService(session)
    await svc.revoke_all_sessions(user_id, x_refresh_token_hash)
    return MessageResponse(message="已撤销所有其他会话")
