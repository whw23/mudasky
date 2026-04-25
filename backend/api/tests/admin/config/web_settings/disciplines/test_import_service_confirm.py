"""DisciplineImportService 单元测试 - 确认导入。

测试学科分类批量导入的 confirm 方法。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.disciplines.import_service import (
    DisciplineImportService,
)
from app.db.discipline.models import Discipline, DisciplineCategory

DISC_REPO = (
    "api.admin.config.web_settings.disciplines.import_service.disc_repo"
)


def _make_category(
    category_id: str = "cat-1", name: str = "工学"
) -> MagicMock:
    """创建模拟 DisciplineCategory 对象。"""
    cat = MagicMock(spec=DisciplineCategory)
    cat.id = category_id
    cat.name = name
    return cat


def _make_discipline(
    discipline_id: str = "disc-1", name: str = "计算机科学"
) -> MagicMock:
    """创建模拟 Discipline 对象。"""
    disc = MagicMock(spec=Discipline)
    disc.id = discipline_id
    disc.name = name
    return disc


@pytest.fixture
def service(mock_session) -> DisciplineImportService:
    """构建 DisciplineImportService 实例。"""
    return DisciplineImportService(mock_session)


class TestConfirm:
    """confirm 确认导入测试。"""

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_create_new_category_and_discipline(
        self, mock_repo, service
    ):
        """新建大分类和小分类。"""
        items = [{
            "status": "new",
            "category_name": "文学",
            "discipline_name": "古典文学",
        }]

        cat = _make_category("cat-new", "文学")
        mock_repo.get_category_by_name = AsyncMock(
            return_value=None
        )
        mock_repo.create_category = AsyncMock(
            return_value=cat
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=None
        )
        mock_repo.create_discipline = AsyncMock()

        result = await service.confirm(items)

        assert result["created"] == 1
        assert result["skipped"] == 0
        mock_repo.create_category.assert_awaited_once()
        mock_repo.create_discipline.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_existing_category_create_discipline(
        self, mock_repo, service
    ):
        """大分类已存在，只创建小分类。"""
        items = [{
            "status": "update",
            "category_name": "工学",
            "discipline_name": "新专业",
        }]

        cat = _make_category()
        mock_repo.get_category_by_name = AsyncMock(
            return_value=cat
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=None
        )
        mock_repo.create_discipline = AsyncMock()

        result = await service.confirm(items)

        assert result["created"] == 1
        mock_repo.create_category.assert_not_called()
        mock_repo.create_discipline.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_skip_unchanged(
        self, mock_repo, service
    ):
        """unchanged 状态的行被跳过。"""
        items = [{
            "status": "unchanged",
            "category_name": "工学",
            "discipline_name": "计算机科学",
        }]

        result = await service.confirm(items)

        assert result["created"] == 0
        assert result["skipped"] == 1

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_discipline_already_exists_skipped(
        self, mock_repo, service
    ):
        """导入时学科已存在则跳过（不重复创建）。"""
        items = [{
            "status": "update",
            "category_name": "工学",
            "discipline_name": "计算机科学",
        }]

        cat = _make_category()
        disc = _make_discipline()
        mock_repo.get_category_by_name = AsyncMock(
            return_value=cat
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=disc
        )

        result = await service.confirm(items)

        assert result["created"] == 0
        assert result["skipped"] == 1

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_mixed_items(
        self, mock_repo, service
    ):
        """混合状态的 items 正确统计。"""
        items = [
            {
                "status": "new",
                "category_name": "文学",
                "discipline_name": "古典文学",
            },
            {
                "status": "unchanged",
                "category_name": "工学",
                "discipline_name": "计算机科学",
            },
            {
                "status": "update",
                "category_name": "工学",
                "discipline_name": "新专业",
            },
        ]

        cat_new = _make_category("cat-new", "文学")
        cat_existing = _make_category()

        async def mock_get_cat(session, name):
            """按名称返回分类。"""
            if name == "文学":
                return None
            return cat_existing

        mock_repo.get_category_by_name = mock_get_cat
        mock_repo.create_category = AsyncMock(
            return_value=cat_new
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=None
        )
        mock_repo.create_discipline = AsyncMock()

        result = await service.confirm(items)

        assert result["created"] == 2
        assert result["skipped"] == 1
