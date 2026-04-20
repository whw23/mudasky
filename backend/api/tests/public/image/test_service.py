"""ImageService 单元测试。

测试图片读取业务逻辑。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.image.service import ImageService
from app.core.exceptions import NotFoundException
from app.db.image.models import Image

REPO = "api.public.image.service.repository"


def _make_image(image_id: str = "img-1", mime_type: str = "image/png") -> MagicMock:
    """创建模拟 Image 对象。"""
    img = MagicMock(spec=Image)
    img.id = image_id
    img.filename = "test.png" if mime_type == "image/png" else "test.jpg"
    img.mime_type = mime_type
    img.file_data = b"\x89PNG\r\n\x1a\n" if mime_type == "image/png" else b"\xff\xd8\xff"
    img.file_size = len(img.file_data)
    img.file_hash = "abc123"
    return img


@pytest.fixture
def service(mock_session) -> ImageService:
    """构建 ImageService 实例，注入 mock session。"""
    return ImageService(mock_session)


# ---- get_image ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_image_success(mock_repo, service):
    """获取 PNG 图片成功。"""
    image = _make_image("img-1", "image/png")
    mock_repo.get_by_id = AsyncMock(return_value=image)

    file_data, mime_type = await service.get_image("img-1")

    assert file_data == b"\x89PNG\r\n\x1a\n"
    assert mime_type == "image/png"
    mock_repo.get_by_id.assert_awaited_once_with(service.session, "img-1")


@pytest.mark.asyncio
@patch(REPO)
async def test_get_image_success_jpeg(mock_repo, service):
    """获取 JPEG 图片成功。"""
    image = _make_image("img-2", "image/jpeg")
    mock_repo.get_by_id = AsyncMock(return_value=image)

    file_data, mime_type = await service.get_image("img-2")

    assert file_data == b"\xff\xd8\xff"
    assert mime_type == "image/jpeg"
    mock_repo.get_by_id.assert_awaited_once_with(service.session, "img-2")


@pytest.mark.asyncio
@patch(REPO)
async def test_get_image_not_found(mock_repo, service):
    """图片不存在应抛出 NotFoundException。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.get_image("nonexistent")

    assert exc_info.value.code == "IMAGE_NOT_FOUND"
    mock_repo.get_by_id.assert_awaited_once_with(service.session, "nonexistent")


@pytest.mark.asyncio
@patch(REPO)
async def test_get_image_not_found_empty_id(mock_repo, service):
    """空字符串 ID 时图片不存在应抛出 NotFoundException。"""
    mock_repo.get_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.get_image("")

    assert exc_info.value.code == "IMAGE_NOT_FOUND"
    mock_repo.get_by_id.assert_awaited_once_with(service.session, "")
