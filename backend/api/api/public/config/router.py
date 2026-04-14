"""系统配置公开路由层。"""

from fastapi import APIRouter, Header, Response

from .schemas import ConfigResponse
from .service import ConfigService
from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession

router = APIRouter(tags=["config"])


@router.get("/config/{key}", summary="获取单个配置值")
async def get_config(
    key: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> ConfigResponse:
    """获取单个配置值（公开接口，支持 ETag 缓存）。"""
    svc = ConfigService(session)
    config, updated_at = await svc.get_value_with_timestamp(key)

    if set_cache_headers(
        response, f"{key}:{updated_at.isoformat()}", 3600, if_none_match
    ):
        return response  # type: ignore[return-value]

    return config


@router.get("/panel-config", summary="获取面板页面配置")
async def get_panel_config(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> ConfigResponse:
    """获取面板页面配置（公开接口，支持 ETag 缓存）。"""
    svc = ConfigService(session)
    config, updated_at = await svc.get_value_with_timestamp("panel_pages")

    if set_cache_headers(
        response, f"panel_pages:{updated_at.isoformat()}", 3600, if_none_match
    ):
        return response  # type: ignore[return-value]

    return config
