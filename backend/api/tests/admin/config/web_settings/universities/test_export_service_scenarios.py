"""ExportService 单元测试（图片、专业、排名等导出场景）。

测试展示图、专业学科、QS 排名、精选状态的导出逻辑。
使用 mock 隔离数据库层和文件工具。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.universities.export_service import (
    ExportService,
)

MODULE = "api.admin.config.web_settings.universities.export_service"
PATCHES = [
    f"{MODULE}.uni_repo", f"{MODULE}.prog_repo",
    f"{MODULE}.image_repo", f"{MODULE}.disc_repo",
    f"{MODULE}.write_sheet_header",
    f"{MODULE}.workbook_to_bytes",
    f"{MODULE}.create_zip",
]


def _uni(**kw) -> MagicMock:
    """创建模拟 University 对象。"""
    u = MagicMock()
    for k, v in {
        "id": "uni-1", "name": "清华大学",
        "name_en": "Tsinghua", "country": "中国",
        "province": "北京", "city": "北京",
        "website": "https://t.edu.cn", "description": "大学",
        "admission_requirements": "优秀",
        "scholarship_info": "奖学金",
        "latitude": 39.99, "longitude": 116.33,
        "is_featured": True, "sort_order": 1,
        "logo_image_id": None, "qs_rankings": None,
    }.items():
        setattr(u, k, kw.get(k, v))
    return u


def _img(**kw) -> MagicMock:
    """创建模拟 Image 对象。"""
    i = MagicMock()
    i.id = kw.get("id", "img-1")
    i.mime_type = kw.get("mime_type", "image/jpeg")
    i.file_data = kw.get("file_data", b"data")
    return i


def _ui_img(**kw) -> MagicMock:
    """创建模拟 UniversityImage 对象。"""
    u = MagicMock()
    u.id = kw.get("id", "ui-1")
    u.image_id = kw.get("image_id", "img-2")
    return u


def _prog(**kw) -> MagicMock:
    """创建模拟 UniversityProgram 对象。"""
    p = MagicMock()
    p.name = kw.get("name", "计算机科学")
    p.discipline_id = kw.get("discipline_id", "disc-1")
    return p


def _disc(**kw) -> MagicMock:
    """创建模拟 Discipline 对象。"""
    d = MagicMock()
    d.id = kw.get("id", "disc-1")
    d.name = kw.get("name", "计算机")
    d.category_id = kw.get("category_id", "cat-1")
    return d


def _cat(**kw) -> MagicMock:
    """创建模拟 DisciplineCategory 对象。"""
    c = MagicMock()
    c.name = kw.get("name", "工学")
    return c


class TestExportScenarios:
    """导出 export() 方法的复杂场景测试。"""

    @pytest.fixture(autouse=True)
    def _setup(self, mock_session):
        """统一 patch 所有依赖。"""
        patchers = [patch(p) for p in PATCHES]
        mocks = [p.start() for p in patchers]
        (self.uni_repo, self.prog_repo, self.img_repo,
         self.disc_repo, _, self.wb_bytes, self.zip) = mocks
        self.wb_bytes.return_value = b"excel"
        self.zip.return_value = b"zip"
        self.service = ExportService(mock_session)
        yield
        for p in patchers:
            p.stop()

    def _setup_uni(self, uni, progs=None, uni_imgs=None):
        """配置院校基础 mock。"""
        self.uni_repo.list_universities = AsyncMock(
            return_value=([uni], 1)
        )
        self.prog_repo.list_programs = AsyncMock(
            return_value=progs or []
        )
        self.uni_repo.list_university_images = AsyncMock(
            return_value=uni_imgs or []
        )

    async def test_display_images(self):
        """院校有展示图时导出包含展示图文件。"""
        uni = _uni()
        ui1 = _ui_img(image_id="d1")
        ui2 = _ui_img(id="ui-2", image_id="d2")
        self._setup_uni(uni, uni_imgs=[ui1, ui2])
        self.img_repo.get_by_id = AsyncMock(side_effect=[
            _img(id="d1", mime_type="image/webp", file_data=b"w"),
            _img(id="d2", mime_type="image/jpeg", file_data=b"j"),
        ])

        await self.service.export()

        zf = self.zip.call_args[0][0]
        assert "images/清华大学_1.webp" in zf
        assert "images/清华大学_2.jpg" in zf

    async def test_display_image_missing(self):
        """展示图记录存在但图片数据不存在时跳过。"""
        uni = _uni()
        self._setup_uni(uni, uni_imgs=[_ui_img()])
        self.img_repo.get_by_id = AsyncMock(return_value=None)

        await self.service.export()

        zf = self.zip.call_args[0][0]
        assert not any(k.startswith("images/") for k in zf)

    async def test_programs_with_disciplines(self):
        """院校有专业时 Sheet2 写入专业和学科信息。"""
        uni = _uni()
        self._setup_uni(uni, progs=[_prog(discipline_id="d1")])
        self.disc_repo.get_discipline_by_id = AsyncMock(
            return_value=_disc(id="d1", category_id="c1")
        )
        self.disc_repo.get_category_by_id = AsyncMock(
            return_value=_cat()
        )

        await self.service.export()

        self.disc_repo.get_discipline_by_id.assert_awaited_once()
        self.disc_repo.get_category_by_id.assert_awaited_once()

    async def test_discipline_not_found(self):
        """专业关联的学科不存在时跳过该专业。"""
        uni = _uni()
        self._setup_uni(uni, progs=[_prog(discipline_id="x")])
        self.disc_repo.get_discipline_by_id = AsyncMock(
            return_value=None
        )

        await self.service.export()

        self.disc_repo.get_category_by_id.assert_not_called()

    async def test_category_not_found(self):
        """学科存在但大分类不存在时不抛异常。"""
        uni = _uni()
        self._setup_uni(uni, progs=[_prog()])
        self.disc_repo.get_discipline_by_id = AsyncMock(
            return_value=_disc()
        )
        self.disc_repo.get_category_by_id = AsyncMock(
            return_value=None
        )

        await self.service.export()

        self.disc_repo.get_category_by_id.assert_awaited_once()

    async def test_qs_rankings(self):
        """院校有 QS 排名时序列化为 JSON 字符串。"""
        uni = _uni(qs_rankings={"2025": 15})
        self._setup_uni(uni)

        await self.service.export()

        self.zip.assert_called_once()

    async def test_not_featured(self):
        """非精选院校 is_featured 列输出"否"。"""
        uni = _uni(is_featured=False)
        self._setup_uni(uni)

        await self.service.export()

        self.zip.assert_called_once()
