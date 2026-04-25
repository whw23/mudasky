"""university/repository 单元测试（院校图片集）。

测试院校图片的查询、添加、删除操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.university.image_models import UniversityImage
from app.db.university.repository import (
    add_university_image,
    count_university_images,
    delete_university_image,
    get_university_image_by_id,
    list_university_images,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    s = AsyncMock()
    s.refresh = AsyncMock()
    return s


# ---- list_university_images ----


async def test_list_university_images(session):
    """获取院校图片集。"""
    images = [
        MagicMock(spec=UniversityImage),
        MagicMock(spec=UniversityImage),
    ]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = images
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_university_images(session, "uni-1")

    assert len(result) == 2
    session.execute.assert_awaited_once()


async def test_list_university_images_empty(session):
    """院校无图片返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_university_images(
        session, "uni-no-images"
    )

    assert result == []


# ---- count_university_images ----


async def test_count_university_images(session):
    """统计院校图片数量。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 3
    session.execute.return_value = mock_result

    result = await count_university_images(session, "uni-1")

    assert result == 3


async def test_count_university_images_zero(session):
    """院校无图片返回 0。"""
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = 0
    session.execute.return_value = mock_result

    result = await count_university_images(
        session, "uni-no-images"
    )

    assert result == 0


# ---- add_university_image ----


async def test_add_university_image(session):
    """添加院校图片。"""
    img = UniversityImage(
        university_id="uni-1", image_id="img-1", sort_order=0
    )

    result = await add_university_image(session, img)

    session.add.assert_called_once_with(img)
    session.commit.assert_awaited_once()
    session.refresh.assert_awaited_once_with(img)
    assert result == img


# ---- delete_university_image ----


async def test_delete_university_image(session):
    """删除院校图片。"""
    img = MagicMock(spec=UniversityImage)

    await delete_university_image(session, img)

    session.delete.assert_awaited_once_with(img)
    session.commit.assert_awaited_once()


# ---- get_university_image_by_id ----


async def test_get_university_image_by_id_found(session):
    """根据 ID 查询图片记录存在时返回。"""
    img = MagicMock(spec=UniversityImage)
    session.get = AsyncMock(return_value=img)

    result = await get_university_image_by_id(session, "img-1")

    session.get.assert_awaited_once_with(
        UniversityImage, "img-1"
    )
    assert result == img


async def test_get_university_image_by_id_not_found(session):
    """图片记录不存在时返回 None。"""
    session.get = AsyncMock(return_value=None)

    result = await get_university_image_by_id(
        session, "nonexistent"
    )

    assert result is None
