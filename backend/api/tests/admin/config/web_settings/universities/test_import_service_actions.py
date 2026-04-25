"""ImportService 补充测试 - 学科映射与变更检测。

覆盖 _apply_discipline_actions、_parse_row 变更检测。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.universities.import_service import (
    ImportService,
)
from app.db.discipline.models import Discipline, DisciplineCategory
from app.db.university.models import University

DISC_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.disc_repo"
)
UNI_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.uni_repo"
)
PROG_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.prog_repo"
)


def _make_category(
    category_id: str = "cat-1", name: str = "工学"
) -> MagicMock:
    """创建模拟 DisciplineCategory。"""
    cat = MagicMock(spec=DisciplineCategory)
    cat.id = category_id
    cat.name = name
    return cat


def _make_discipline(
    discipline_id: str = "disc-1", name: str = "计算机科学"
) -> MagicMock:
    """创建模拟 Discipline。"""
    disc = MagicMock(spec=Discipline)
    disc.id = discipline_id
    disc.name = name
    return disc


def _make_university(uid: str = "uni-1", **kw) -> MagicMock:
    """创建模拟 University。"""
    uni = MagicMock(spec=University)
    uni.id = uid
    defaults = {
        "name": "哈佛大学", "name_en": "Harvard",
        "country": "美国", "province": None, "city": "剑桥",
        "website": None, "description": None,
        "admission_requirements": None, "scholarship_info": None,
        "latitude": None, "longitude": None,
        "is_featured": False, "sort_order": 0,
        "qs_rankings": None, "logo_image_id": None,
    }
    for k, v in defaults.items():
        setattr(uni, k, kw.get(k, v))
    return uni


@pytest.fixture
def service(mock_session) -> ImportService:
    """构建 ImportService 实例。"""
    return ImportService(mock_session)


# ---- _apply_discipline_actions ----


class TestApplyDisciplineActions:
    """_apply_discipline_actions 学科映射测试。"""

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_create_new(self, mock_repo, service):
        """创建不存在的大分类和小分类。"""
        actions = [
            {"name": "理学/量子力学", "action": "create"},
        ]
        cat = _make_category("cat-new", "理学")
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

        await service._apply_discipline_actions(actions)

        mock_repo.create_category.assert_awaited_once()
        mock_repo.create_discipline.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_existing_category(
        self, mock_repo, service
    ):
        """大分类已存在，只创建小分类。"""
        actions = [
            {"name": "工学/量子计算", "action": "create"},
        ]
        mock_repo.get_category_by_name = AsyncMock(
            return_value=_make_category()
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=None
        )
        mock_repo.create_discipline = AsyncMock()

        await service._apply_discipline_actions(actions)

        mock_repo.create_category.assert_not_called()
        mock_repo.create_discipline.assert_awaited_once()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_skip_non_create(
        self, mock_repo, service
    ):
        """非 create 的 action 被跳过。"""
        actions = [{"name": "工学/CS", "action": "map"}]
        await service._apply_discipline_actions(actions)
        mock_repo.get_category_by_name.assert_not_called()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_skip_invalid_format(
        self, mock_repo, service
    ):
        """无斜杠分隔的名称被跳过。"""
        actions = [
            {"name": "无斜杠", "action": "create"},
        ]
        await service._apply_discipline_actions(actions)
        mock_repo.get_category_by_name.assert_not_called()

    @pytest.mark.asyncio
    @patch(DISC_REPO)
    async def test_existing_not_duplicated(
        self, mock_repo, service
    ):
        """学科已存在时不重复创建。"""
        actions = [
            {"name": "工学/计算机科学", "action": "create"},
        ]
        mock_repo.get_category_by_name = AsyncMock(
            return_value=_make_category()
        )
        mock_repo.get_discipline_by_name = AsyncMock(
            return_value=_make_discipline()
        )
        await service._apply_discipline_actions(actions)
        mock_repo.create_discipline.assert_not_called()


# ---- _parse_row change detection ----


class TestParseRowChangeDetection:
    """_parse_row 变更检测分支测试。"""

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_changed_fields(
        self, mock_d, mock_u, mock_p, service,
    ):
        """字段变化时标记 update。"""
        existing = _make_university(
            country="美国", city="剑桥", description="旧"
        )
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_p.list_programs = AsyncMock(return_value=[])
        row = (
            "哈佛大学", "Harvard", "美国", "MA", "波士顿",
            None, "新描述", None, None, None, None,
            None, None, None, None, None,
        )
        result = await service._parse_row(2, row, {}, {})
        assert result["status"] == "update"
        assert "city" in result["changed_fields"]

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_logo_change(
        self, mock_d, mock_u, mock_p, service,
    ):
        """logo 文件在 image_data_map 中时标记变化。"""
        existing = _make_university()
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_p.list_programs = AsyncMock(return_value=[])
        row = (
            "哈佛大学", "Harvard", "美国", None, "剑桥",
            None, None, None, None, None, None,
            None, None, "logo.jpg", None, None,
        )
        result = await service._parse_row(
            2, row, {}, {"logo.jpg": b"data"}
        )
        assert "logo" in result["changed_fields"]

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_images_change(
        self, mock_d, mock_u, mock_p, service,
    ):
        """展示图在 image_data_map 中时标记变化。"""
        existing = _make_university()
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_p.list_programs = AsyncMock(return_value=[])
        row = (
            "哈佛大学", "Harvard", "美国", None, "剑桥",
            None, None, None, None, None, None,
            None, None, None, "p1.jpg,p2.png", None,
        )
        result = await service._parse_row(
            2, row, {}, {"p1.jpg": b"data"}
        )
        assert "images" in result["changed_fields"]

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_unchanged(
        self, mock_d, mock_u, mock_p, service,
    ):
        """无变化时标记 unchanged。"""
        existing = _make_university(
            name_en="Harvard", country="美国", city="剑桥"
        )
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_p.list_programs = AsyncMock(return_value=[])
        row = (
            "哈佛大学", "Harvard", "美国", None, "剑桥",
            None, None, None, None, None, None,
            None, None, None, None, None,
        )
        result = await service._parse_row(2, row, {}, {})
        assert result["status"] == "unchanged"

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_programs_change(
        self, mock_d, mock_u, mock_p, service,
    ):
        """专业变化时标记 update。"""
        existing = _make_university()
        old_prog = MagicMock()
        old_prog.name = "旧"
        old_prog.discipline_id = "disc-old"
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_p.list_programs = AsyncMock(
            return_value=[old_prog]
        )
        mock_d.get_category_by_name = AsyncMock(
            return_value=_make_category()
        )
        mock_d.get_discipline_by_name = AsyncMock(
            return_value=_make_discipline("disc-new", "新")
        )
        pm = {"哈佛大学": [{
            "program_name": "新",
            "category_name": "工学",
            "discipline_name": "新",
        }]}
        row = (
            "哈佛大学", "Harvard", "美国", None, "剑桥",
            None, None, None, None, None, None,
            None, None, None, None, None,
        )
        result = await service._parse_row(2, row, pm, {})
        assert "programs" in result["changed_fields"]
