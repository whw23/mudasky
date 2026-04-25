"""ImportService 补充测试 - 创建与更新院校。

覆盖 _create_university、_update_university 的分支。
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
IMAGE_REPO = (
    "api.admin.config.web_settings.universities"
    ".import_service.image_repo"
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


# ---- _create_university ----


class TestCreateUniversity:
    """_create_university 创建院校测试。"""

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_create_with_programs(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """创建院校时同时创建专业。"""
        item = {
            "name": "MIT", "status": "new",
            "data": {"name": "MIT", "country": "美国", "city": "剑桥"},
            "programs": [{
                "program_name": "CS",
                "category_name": "工学",
                "discipline_name": "计算机科学",
            }],
            "logo_filename": None,
            "image_filenames": [],
        }
        uni = _make_university("uni-1", name="MIT")
        mock_u.create_university = AsyncMock(return_value=uni)
        mock_d.get_category_by_name = AsyncMock(
            return_value=_make_category()
        )
        mock_d.get_discipline_by_name = AsyncMock(
            return_value=_make_discipline()
        )
        mock_p.replace_programs = AsyncMock()

        await service._create_university(item, {})

        mock_p.replace_programs.assert_awaited_once()
        progs = mock_p.replace_programs.call_args[0][2]
        assert len(progs) == 1
        assert progs[0]["name"] == "CS"

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_create_skips_unknown_discipline(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """创建院校时跳过未知学科的专业。"""
        item = {
            "name": "MIT", "status": "new",
            "data": {"name": "MIT", "country": "美国", "city": "剑桥"},
            "programs": [{
                "program_name": "Unknown",
                "category_name": "不存在",
                "discipline_name": "不存在",
            }],
            "logo_filename": None,
            "image_filenames": [],
        }
        uni = _make_university("uni-1", name="MIT")
        mock_u.create_university = AsyncMock(return_value=uni)
        mock_d.get_category_by_name = AsyncMock(
            return_value=None
        )

        await service._create_university(item, {})

        mock_p.replace_programs.assert_not_called()


# ---- _update_university ----


class TestUpdateUniversity:
    """_update_university 更新院校测试。"""

    @pytest.mark.asyncio
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_not_found_raises(
        self, mock_d, mock_u, mock_p, service,
    ):
        """院校不存在时抛出 ValueError。"""
        item = {
            "name": "不存在", "status": "update",
            "data": {"name": "不存在", "country": "美国", "city": "剑桥"},
            "programs": [], "logo_filename": None,
            "image_filenames": [],
        }
        mock_u.get_university_by_name = AsyncMock(
            return_value=None
        )
        with pytest.raises(ValueError, match="不存在"):
            await service._update_university(item, {})

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_merges_non_empty_fields(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """更新时非空字段覆盖，空字段保留。"""
        item = {
            "name": "哈佛大学", "status": "update",
            "data": {
                "name": "哈佛大学", "country": "美国",
                "city": "波士顿", "description": "",
                "website": None, "province": "MA",
            },
            "programs": [], "logo_filename": None,
            "image_filenames": [],
        }
        existing = _make_university()
        existing.city = "剑桥"
        existing.description = "原始描述"
        existing.website = "https://old.edu"
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_u.update_university = AsyncMock(
            return_value=existing
        )
        mock_p.replace_programs = AsyncMock()

        await service._update_university(item, {})

        assert existing.city == "波士顿"
        assert existing.province == "MA"

    @pytest.mark.asyncio
    @patch(IMAGE_REPO)
    @patch(PROG_REPO)
    @patch(UNI_REPO)
    @patch(DISC_REPO)
    async def test_update_with_programs(
        self, mock_d, mock_u, mock_p, mock_i, service,
    ):
        """更新院校时全量替换专业。"""
        item = {
            "name": "哈佛大学", "status": "update",
            "data": {"name": "哈佛大学", "country": "美国", "city": "剑桥"},
            "programs": [{
                "program_name": "金融学",
                "category_name": "商学",
                "discipline_name": "金融学",
            }],
            "logo_filename": None,
            "image_filenames": [],
        }
        existing = _make_university()
        mock_u.get_university_by_name = AsyncMock(
            return_value=existing
        )
        mock_u.update_university = AsyncMock(
            return_value=existing
        )
        cat = _make_category("cat-biz", "商学")
        disc = _make_discipline("disc-fin", "金融学")
        mock_d.get_category_by_name = AsyncMock(
            return_value=cat
        )
        mock_d.get_discipline_by_name = AsyncMock(
            return_value=disc
        )
        mock_p.replace_programs = AsyncMock()

        await service._update_university(item, {})

        mock_p.replace_programs.assert_awaited_once()
        progs = mock_p.replace_programs.call_args[0][2]
        assert progs[0]["discipline_id"] == "disc-fin"
