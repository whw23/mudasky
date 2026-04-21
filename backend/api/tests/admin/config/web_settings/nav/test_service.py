"""NavService 单元测试。

测试导航栏配置的获取、排序、添加、删除业务逻辑。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.nav.schemas import (
    NavConfig,
    NavCustomItem,
)
from api.admin.config.web_settings.nav.service import (
    BUILTIN_KEYS,
    DEFAULT_NAV_CONFIG,
    NavService,
)
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
)

REPO = "api.admin.config.web_settings.nav.service.config_repo"
CONTENT_REPO = (
    "api.admin.config.web_settings.nav.service.content_repo"
)


def _make_config_record(value: dict) -> MagicMock:
    """创建模拟 SystemConfig 记录。"""
    record = MagicMock()
    record.value = value
    return record


def _nav_with_custom() -> NavConfig:
    """创建包含自定义导航项的 NavConfig。"""
    return NavConfig(
        order=list(BUILTIN_KEYS) + ["custom-1"],
        custom_items=[
            NavCustomItem(
                slug="custom-1",
                name="自定义页面",
                category_id="cat-100",
            )
        ],
    )


@pytest.fixture
def service() -> NavService:
    """构建 NavService 实例，注入 mock session。"""
    session = AsyncMock()
    return NavService(session)


# ---- get_nav_config ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_nav_config_default(mock_repo, service):
    """无配置记录时返回默认值。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    result = await service.get_nav_config()

    assert len(result.order) == 9
    assert result.custom_items == []
    assert result == DEFAULT_NAV_CONFIG


@pytest.mark.asyncio
@patch(REPO)
async def test_get_nav_config_existing(mock_repo, service):
    """已有配置时返回解析后的 NavConfig。"""
    nav_data = {
        "order": ["home", "about"],
        "custom_items": [
            {
                "slug": "extra",
                "name": "额外页面",
                "category_id": "cat-99",
            }
        ],
    }
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav_data)
    )

    result = await service.get_nav_config()

    assert result.order == ["home", "about"]
    assert len(result.custom_items) == 1
    assert result.custom_items[0].slug == "extra"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_nav_config_with_all_builtins(
    mock_repo, service
):
    """配置包含全部预设项时正确解析。"""
    nav_data = {
        "order": list(BUILTIN_KEYS),
        "custom_items": [],
    }
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav_data)
    )

    result = await service.get_nav_config()

    assert set(result.order) == BUILTIN_KEYS
    assert result.custom_items == []


# ---- reorder ----


@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_success_builtin_only(
    mock_repo, service
):
    """仅使用预设项重排序成功。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()

    new_order = ["about", "home", "news"]
    result = await service.reorder(new_order)

    assert result.order == new_order


@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_success_with_custom(
    mock_repo, service
):
    """包含自定义项的重排序成功。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()

    new_order = ["custom-1", "home", "about"]
    result = await service.reorder(new_order)

    assert result.order == new_order


@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_invalid_key(mock_repo, service):
    """排序包含无效 key 时抛出 BadRequestException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(BadRequestException) as exc_info:
        await service.reorder(["home", "invalid-key"])

    assert exc_info.value.code == "INVALID_NAV_KEY"


@pytest.mark.asyncio
@patch(REPO)
async def test_reorder_unknown_custom_key(
    mock_repo, service
):
    """排序包含未注册的自定义 key 时抛出异常。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(BadRequestException):
        await service.reorder(["home", "nonexistent-custom"])


# ---- add_item ----


@pytest.mark.asyncio
@patch(CONTENT_REPO)
@patch(REPO)
async def test_add_item_success_str_name(
    mock_repo, mock_content_repo, service
):
    """使用字符串名称添加自定义导航项成功。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()
    category = MagicMock()
    category.id = "cat-new"
    mock_content_repo.create_category = AsyncMock(
        return_value=category
    )

    result = await service.add_item(
        "my-page", "我的页面", "页面描述"
    )

    assert "my-page" in result.order
    assert any(
        i.slug == "my-page" for i in result.custom_items
    )
    mock_content_repo.create_category.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONTENT_REPO)
@patch(REPO)
async def test_add_item_success_dict_name(
    mock_repo, mock_content_repo, service
):
    """使用字典名称（多语言）添加自定义导航项成功。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()
    category = MagicMock()
    category.id = "cat-new-2"
    mock_content_repo.create_category = AsyncMock(
        return_value=category
    )

    name = {"zh": "多语言页面", "en": "Multilingual"}
    result = await service.add_item("multi-page", name)

    assert "multi-page" in result.order
    item = next(
        i
        for i in result.custom_items
        if i.slug == "multi-page"
    )
    assert item.name == name


@pytest.mark.asyncio
@patch(REPO)
async def test_add_item_builtin_slug_conflict(
    mock_repo, service
):
    """slug 与预设项冲突时抛出 BadRequestException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(BadRequestException) as exc_info:
        await service.add_item("home", "首页重复")

    assert exc_info.value.code == "NAV_ITEM_EXISTS"


@pytest.mark.asyncio
@patch(REPO)
async def test_add_item_custom_slug_conflict(
    mock_repo, service
):
    """slug 与已有自定义项冲突时抛出 BadRequestException。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )

    with pytest.raises(BadRequestException) as exc_info:
        await service.add_item("custom-1", "重复自定义项")

    assert exc_info.value.code == "NAV_ITEM_EXISTS"


# ---- remove_item ----


@pytest.mark.asyncio
@patch(REPO)
async def test_remove_item_success(mock_repo, service):
    """删除自定义导航项成功。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()

    result = await service.remove_item("custom-1")

    assert "custom-1" not in result.order
    assert not any(
        i.slug == "custom-1" for i in result.custom_items
    )


@pytest.mark.asyncio
@patch(CONTENT_REPO)
@patch(REPO)
async def test_remove_item_with_delete_content(
    mock_repo, mock_content_repo, service
):
    """delete_content=True 时级联删除文章和分类。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()
    mock_content_repo.delete_articles_by_category = (
        AsyncMock()
    )
    category = MagicMock()
    mock_content_repo.get_category_by_id = AsyncMock(
        return_value=category
    )
    mock_content_repo.delete_category = AsyncMock()

    result = await service.remove_item(
        "custom-1", delete_content=True
    )

    assert "custom-1" not in result.order
    mock_content_repo.delete_articles_by_category.assert_awaited_once_with(
        service.session, "cat-100"
    )
    mock_content_repo.delete_category.assert_awaited_once_with(
        service.session, category
    )


@pytest.mark.asyncio
@patch(CONTENT_REPO)
@patch(REPO)
async def test_remove_item_delete_content_category_gone(
    mock_repo, mock_content_repo, service
):
    """delete_content=True 但分类已不存在时不调用 delete_category。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )
    mock_repo.update_value = AsyncMock()
    mock_content_repo.delete_articles_by_category = (
        AsyncMock()
    )
    mock_content_repo.get_category_by_id = AsyncMock(
        return_value=None
    )
    mock_content_repo.delete_category = AsyncMock()

    result = await service.remove_item(
        "custom-1", delete_content=True
    )

    assert "custom-1" not in result.order
    mock_content_repo.delete_category.assert_not_awaited()


@pytest.mark.asyncio
async def test_remove_item_builtin_key(service):
    """删除预设导航项抛出 BadRequestException。"""
    with pytest.raises(BadRequestException) as exc_info:
        await service.remove_item("home")

    assert exc_info.value.code == "BUILTIN_NAV_ITEM"


@pytest.mark.asyncio
async def test_remove_item_builtin_about(service):
    """删除预设导航项 about 抛出 BadRequestException。"""
    with pytest.raises(BadRequestException) as exc_info:
        await service.remove_item("about")

    assert exc_info.value.code == "BUILTIN_NAV_ITEM"


@pytest.mark.asyncio
@patch(REPO)
async def test_remove_item_not_found(mock_repo, service):
    """删除不存在的自定义导航项抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.remove_item("nonexistent-slug")

    assert exc_info.value.code == "NAV_ITEM_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_remove_item_slug_not_in_custom(
    mock_repo, service
):
    """slug 不在 custom_items 中时抛出 NotFoundException。"""
    nav = _nav_with_custom()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(nav.model_dump())
    )

    with pytest.raises(NotFoundException):
        await service.remove_item("other-slug")


# ---- _save ----


@pytest.mark.asyncio
@patch(REPO)
async def test_save_creates_when_no_config(
    mock_repo, service
):
    """_save 在无配置时创建新记录。"""
    # First call for get_nav_config, second for _save
    mock_repo.get_by_key = AsyncMock(return_value=None)
    mock_repo.create = AsyncMock()

    await service.reorder(["home", "about"])

    mock_repo.create.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_save_updates_when_config_exists(
    mock_repo, service
):
    """_save 在有配置时更新现有记录。"""
    existing = _make_config_record(
        DEFAULT_NAV_CONFIG.model_dump()
    )
    mock_repo.get_by_key = AsyncMock(
        return_value=existing
    )
    mock_repo.update_value = AsyncMock()

    await service.reorder(["home", "about"])

    mock_repo.update_value.assert_awaited_once()
