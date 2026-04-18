"""CategoryService 单元测试。

测试分类的 CRUD 业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.content.models import Category
from api.admin.config.web_settings.categories.schemas import (
    CategoryCreate,
    CategoryUpdate,
)
from api.admin.config.web_settings.categories.service import (
    CategoryService,
)
from app.core.exceptions import NotFoundException


REPO = "api.admin.config.web_settings.categories.service.repository"


def _make_category(category_id: str = "cat-1") -> Category:
    """创建模拟 Category 对象。"""
    c = MagicMock(spec=Category)
    c.id = category_id
    c.name = "测试分类"
    c.slug = "test-cat"
    c.description = "描述"
    c.sort_order = 0
    c.created_at = datetime.now(timezone.utc)
    return c


@pytest.fixture
def service() -> CategoryService:
    """构建 CategoryService 实例，注入 mock session。"""
    session = AsyncMock()
    return CategoryService(session)


# ---- 分类：list_categories ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_categories(mock_repo, service):
    """查询所有分类。"""
    categories = [_make_category(), _make_category("cat-2")]
    mock_repo.list_categories = AsyncMock(
        return_value=categories
    )

    result = await service.list_categories()

    assert len(result) == 2


# ---- 分类：create_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_category_success(mock_repo, service):
    """创建分类成功。"""
    category = _make_category()
    mock_repo.create_category = AsyncMock(
        return_value=category
    )

    data = CategoryCreate(
        name="测试分类", slug="test-cat"
    )
    result = await service.create_category(data)

    assert result.id == "cat-1"
    mock_repo.create_category.assert_awaited_once()


# ---- 分类：update_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_success(mock_repo, service):
    """更新分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(
        return_value=category
    )
    mock_repo.update_category = AsyncMock(
        return_value=category
    )

    data = CategoryUpdate(category_id="cat-1", name="新分类名")
    result = await service.update_category("cat-1", data)

    assert result is not None
    mock_repo.update_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_category_not_found(
    mock_repo, service
):
    """更新不存在的分类抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(
        return_value=None
    )

    data = CategoryUpdate(category_id="cat-1", name="新分类名")
    with pytest.raises(NotFoundException):
        await service.update_category("nonexistent", data)


# ---- 分类：delete_category ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_success(mock_repo, service):
    """删除分类成功。"""
    category = _make_category()
    mock_repo.get_category_by_id = AsyncMock(
        return_value=category
    )
    mock_repo.delete_category = AsyncMock()

    await service.delete_category("cat-1")

    mock_repo.delete_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_category_not_found(
    mock_repo, service
):
    """删除不存在的分类抛出 NotFoundException。"""
    mock_repo.get_category_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_category("nonexistent")
