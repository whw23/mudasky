"""公开学科分类接口。"""

from fastapi import APIRouter, Header, Response

from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession

from .schemas import DisciplineCategoryTree
from .service import DisciplinePublicService

router = APIRouter(prefix="/disciplines", tags=["disciplines"])


@router.get(
    "/list",
    response_model=list[DisciplineCategoryTree],
    summary="查询学科分类树",
)
async def list_disciplines(
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> list[DisciplineCategoryTree]:
    """获取学科分类树形结构。"""
    svc = DisciplinePublicService(session)
    tree = await svc.get_discipline_tree()
    seed = f"disc:tree:{len(tree)}"
    if set_cache_headers(response, seed, 3600, if_none_match):
        return response  # type: ignore[return-value]
    return tree
