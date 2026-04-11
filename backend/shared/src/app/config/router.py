"""系统配置路由层。"""

from fastapi import APIRouter, Header, Response

from app.config.schemas import ConfigDetailResponse, ConfigResponse, ConfigUpdateRequest
from app.config.service import ConfigService
from app.core.cache import set_cache_headers
from app.core.dependencies import DbSession

public_config_router = APIRouter(tags=["config"])

admin_settings_router = APIRouter(
    prefix="/admin/settings", tags=["admin-settings"]
)


@public_config_router.get("/public/config/{key}")
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


@admin_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
)
async def list_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@admin_settings_router.post(
    "/edit/{key}",
    response_model=ConfigResponse,
)
async def update_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
