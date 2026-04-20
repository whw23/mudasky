"""公开图片读取接口。"""

from fastapi import APIRouter, Header, Response

from api.core.cache import set_cache_headers
from api.core.dependencies import DbSession

from .service import ImageService

router = APIRouter(prefix="/images", tags=["images"])


@router.get(
    "/detail",
    summary="获取图片",
    responses={200: {"content": {"image/*": {}}}},
)
async def get_image(
    id: str,
    session: DbSession,
    response: Response,
    if_none_match: str | None = Header(None),
) -> Response:
    """根据 ID 获取图片二进制数据。"""
    svc = ImageService(session)
    file_data, mime_type = await svc.get_image(id)

    seed = f"img:{id}"
    if set_cache_headers(response, seed, 86400, if_none_match):
        return response

    return Response(
        content=file_data,
        media_type=mime_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
