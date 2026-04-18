"""导航栏配置路由层。"""

from fastapi import APIRouter

from api.core.dependencies import DbSession

from .schemas import (
    NavAddItemRequest,
    NavConfig,
    NavRemoveItemRequest,
    NavReorderRequest,
)
from .service import NavService

router = APIRouter(prefix="/nav", tags=["admin-nav"])


@router.get(
    "/list",
    response_model=NavConfig,
    summary="获取导航栏配置",
)
async def get_nav_config(
    session: DbSession,
) -> NavConfig:
    """获取导航栏配置。"""
    svc = NavService(session)
    return await svc.get_nav_config()


@router.post(
    "/reorder",
    response_model=NavConfig,
    summary="更新导航栏排序",
)
async def reorder_nav(
    data: NavReorderRequest, session: DbSession
) -> NavConfig:
    """更新导航栏排序。"""
    svc = NavService(session)
    return await svc.reorder(data.order)


@router.post(
    "/add-item",
    response_model=NavConfig,
    summary="新增导航项",
)
async def add_nav_item(
    data: NavAddItemRequest, session: DbSession
) -> NavConfig:
    """新增自定义导航项（同时创建对应分类）。"""
    svc = NavService(session)
    return await svc.add_item(
        data.slug, data.name, data.description
    )


@router.post(
    "/remove-item",
    response_model=NavConfig,
    summary="删除导航项",
)
async def remove_nav_item(
    data: NavRemoveItemRequest, session: DbSession
) -> NavConfig:
    """删除自定义导航项。"""
    svc = NavService(session)
    return await svc.remove_item(
        data.slug, data.delete_content
    )
