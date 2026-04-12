"""系统配置路由层。"""

from fastapi import APIRouter, Header, Response

from app.config.schemas import ConfigDetailResponse, ConfigResponse, ConfigUpdateRequest
from app.config.service import ConfigService
from app.core.cache import set_cache_headers
from app.core.dependencies import DbSession

public_config_router = APIRouter(tags=["config"])

admin_general_settings_router = APIRouter(
    prefix="/admin/general-settings", tags=["admin-settings"]
)

admin_web_settings_router = APIRouter(
    prefix="/admin/web-settings", tags=["admin-settings"]
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


@public_config_router.get("/public/panel-config")
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


@admin_general_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
)
async def list_general_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有通用配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@admin_general_settings_router.post(
    "/edit/{key}",
    response_model=ConfigResponse,
)
async def update_general_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新通用配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)


@admin_web_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
)
async def list_web_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有网站配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@admin_web_settings_router.post(
    "/edit/{key}",
    response_model=ConfigResponse,
)
async def update_web_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新网站配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
