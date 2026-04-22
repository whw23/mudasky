"""HTML 中图片 URL ↔ base64 转换工具。"""

import base64
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.image import repository as image_repo


IMAGE_URL_PATTERN = re.compile(
    r'(<img\s+[^>]*?)src="(/api/public/images/detail\?id=([a-f0-9-]+))"([^>]*?>)',
    re.IGNORECASE,
)

BASE64_PATTERN = re.compile(
    r'(<img\s+[^>]*?)src="data:([^;]+);base64,([^"]+)"([^>]*?>)',
    re.IGNORECASE,
)


async def urls_to_base64(session: AsyncSession, html: str) -> str:
    """将 HTML 中的图片 URL 替换为 base64 data URI。"""
    matches = list(IMAGE_URL_PATTERN.finditer(html))
    if not matches:
        return html

    result = html
    for match in reversed(matches):
        image_id = match.group(3)
        image = await image_repo.get_by_id(session, image_id)
        if not image:
            continue
        b64 = base64.b64encode(image.file_data).decode("ascii")
        data_uri = f"data:{image.mime_type};base64,{b64}"
        new_tag = f'{match.group(1)}src="{data_uri}"{match.group(4)}'
        result = result[:match.start()] + new_tag + result[match.end():]

    return result


async def base64_to_urls(session: AsyncSession, html: str) -> str:
    """将 HTML 中的 base64 data URI 替换为服务器图片 URL。"""
    matches = list(BASE64_PATTERN.finditer(html))
    if not matches:
        return html

    result = html
    for match in reversed(matches):
        mime_type = match.group(2)
        b64_data = match.group(3)
        file_data = base64.b64decode(b64_data)
        ext = mime_type.split("/")[-1].split("+")[0]
        filename = f"imported.{ext}"
        image = await image_repo.create_image(
            session, file_data, filename, mime_type,
        )
        url = f"/api/public/images/detail?id={image.id}"
        new_tag = f'{match.group(1)}src="{url}"{match.group(4)}'
        result = result[:match.start()] + new_tag + result[match.end():]

    return result
