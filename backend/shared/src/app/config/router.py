"""系统配置路由层。"""

from fastapi import APIRouter, Depends, Response

from app.config.schemas import ConfigDetailResponse, ConfigResponse, ConfigUpdateRequest
from app.config.service import ConfigService
from app.core.dependencies import DbSession, require_superuser

router = APIRouter(tags=["config"])


@router.get("/config/{key}")
async def get_config(
    key: str,
    session: DbSession,
    response: Response,
) -> ConfigResponse:
    """获取单个配置值（公开接口）。"""
    svc = ConfigService(session)
    config = await svc.get_value(key)
    response.headers["Cache-Control"] = "public, max-age=300"
    return config


@router.get(
    "/admin/config",
    response_model=list[ConfigDetailResponse],
    dependencies=[Depends(require_superuser())],
)
async def list_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置（仅超级管理员）。"""
    svc = ConfigService(session)
    return await svc.list_all()


@router.put(
    "/admin/config/{key}",
    response_model=ConfigResponse,
    dependencies=[Depends(require_superuser())],
)
async def update_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值（仅超级管理员）。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
