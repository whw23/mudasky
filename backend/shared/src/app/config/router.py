"""系统配置路由层。"""

from fastapi import APIRouter, Depends, Header, Response

from app.config.schemas import ConfigDetailResponse, ConfigResponse, ConfigUpdateRequest
from app.config.service import ConfigService
from app.core.cache import set_cache_headers
from app.core.dependencies import DbSession, require_permission

router = APIRouter(tags=["config"])


@router.get("/config/{key}")
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


@router.get(
    "/admin/config",
    response_model=list[ConfigDetailResponse],
    dependencies=[
        Depends(require_permission("admin.settings.view"))
    ],
)
async def list_configs(
    session: DbSession,
) -> list[ConfigDetailResponse]:
    """获取所有配置（需要系统设置查看权限）。"""
    svc = ConfigService(session)
    return await svc.list_all()


@router.put(
    "/admin/config/{key}",
    response_model=ConfigResponse,
    dependencies=[
        Depends(require_permission("admin.settings.edit"))
    ],
)
async def update_config(
    key: str,
    data: ConfigUpdateRequest,
    session: DbSession,
) -> ConfigResponse:
    """更新配置值（需要系统设置编辑权限）。"""
    svc = ConfigService(session)
    return await svc.update_value(key, data.value)
