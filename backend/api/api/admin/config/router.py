"""系统配置管理路由层。

提供通用配置和网站配置的管理员 API 端点。
"""

from fastapi import APIRouter

from api.core.dependencies import DbSession

from .schemas import ConfigDetailResponse, ConfigResponse, ConfigUpdateRequest
from .service import ConfigService

router = APIRouter(tags=["admin-settings"])

general_settings_router = APIRouter(
    prefix="/general-settings", tags=["admin-settings"]
)

web_settings_router = APIRouter(
    prefix="/web-settings", tags=["admin-settings"]
)


@general_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
    summary="获取所有通用配置",
)
async def list_general_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有通用配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@general_settings_router.post(
    "/list/edit",
    response_model=ConfigResponse,
    summary="更新通用配置值",
)
async def update_general_config(
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新通用配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(data.key, data.value)


@web_settings_router.get(
    "/list",
    response_model=list[ConfigDetailResponse],
    summary="获取所有网站配置",
)
async def list_web_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有网站配置。"""
    svc = ConfigService(session)
    return await svc.list_all()


@web_settings_router.post(
    "/list/edit",
    response_model=ConfigResponse,
    summary="更新网站配置值",
)
async def update_web_config(
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新网站配置值。"""
    svc = ConfigService(session)
    return await svc.update_value(data.key, data.value)


# 挂载子路由到主路由
router.include_router(general_settings_router)
router.include_router(web_settings_router)
