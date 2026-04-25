"""UniversityService 单元测试（详情和学科筛选）。

测试 get_university_detail 和 filter_universities_by_discipline 方法。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.university.service import UniversityService
from app.core.exceptions import NotFoundException

REPO = "api.public.university.service.repository"
PROG_REPO = "api.public.university.service.prog_repo"
DISC_REPO = "api.public.university.service.disc_repo"


def _uni(**kw) -> MagicMock:
    """创建模拟 University 对象。"""
    u = MagicMock()
    for k, v in {
        "id": "uni-001", "name": "测试大学",
        "name_en": "Test University", "country": "中国",
        "province": "北京", "city": "北京",
        "logo_url": None, "description": "描述",
        "website": None, "is_featured": False,
        "sort_order": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    }.items():
        setattr(u, k, kw.get(k, v))
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
    d.name = kw.get("name", "计算机科学与技术")
    d.category_id = kw.get("category_id", "cat-1")
    return d


def _cat(**kw) -> MagicMock:
    """创建模拟 DisciplineCategory 对象。"""
    c = MagicMock()
    c.name = kw.get("name", "工学")
    return c


def _exec_result(items: list) -> MagicMock:
    """创建模拟 session.execute 返回值。"""
    r = MagicMock()
    r.scalars.return_value.all.return_value = items
    return r


@pytest.fixture
def service(mock_session) -> UniversityService:
    """构建 UniversityService 实例，注入 mock session。"""
    return UniversityService(mock_session)


# ---- get_university_detail ----


@patch(DISC_REPO)
@patch(PROG_REPO)
@patch(REPO)
async def test_detail_full(
    mock_repo, mock_prog, mock_disc, service,
):
    """获取院校详情包含专业、学科、图片和关联案例。"""
    uni = _uni(id="u1", name="测试大学")
    mock_repo.get_university_by_id = AsyncMock(return_value=uni)
    mock_prog.list_programs = AsyncMock(
        return_value=[_prog(name="CS", discipline_id="d1")]
    )
    mock_disc.get_discipline_by_id = AsyncMock(
        return_value=_disc(id="d1", name="计算机", category_id="c1")
    )
    mock_disc.get_category_by_id = AsyncMock(
        return_value=_cat(name="工学")
    )
    ui = MagicMock()
    ui.image_id = "img-10"
    mock_repo.list_university_images = AsyncMock(
        return_value=[ui]
    )
    service.session.execute = AsyncMock(
        return_value=_exec_result([])
    )

    result = await service.get_university_detail("u1")

    assert result["university"] is uni
    assert len(result["disciplines"]) == 1
    assert result["disciplines"][0]["name"] == "计算机"
    assert result["disciplines"][0]["category_name"] == "工学"
    assert result["disciplines"][0]["program_name"] == "CS"
    assert result["image_ids"] == ["img-10"]
    assert result["related_cases"] == []


@patch(DISC_REPO)
@patch(PROG_REPO)
@patch(REPO)
async def test_detail_discipline_missing(
    mock_repo, mock_prog, mock_disc, service,
):
    """专业关联的学科不存在时跳过。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=_uni()
    )
    mock_prog.list_programs = AsyncMock(
        return_value=[_prog(discipline_id="x")]
    )
    mock_disc.get_discipline_by_id = AsyncMock(return_value=None)
    mock_repo.list_university_images = AsyncMock(return_value=[])
    service.session.execute = AsyncMock(
        return_value=_exec_result([])
    )

    result = await service.get_university_detail("uni-001")

    assert result["disciplines"] == []
    mock_disc.get_category_by_id.assert_not_called()


@patch(DISC_REPO)
@patch(PROG_REPO)
@patch(REPO)
async def test_detail_category_missing(
    mock_repo, mock_prog, mock_disc, service,
):
    """学科存在但大分类不存在时 category_name 为空。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=_uni()
    )
    mock_prog.list_programs = AsyncMock(
        return_value=[_prog()]
    )
    mock_disc.get_discipline_by_id = AsyncMock(
        return_value=_disc(category_id="x")
    )
    mock_disc.get_category_by_id = AsyncMock(return_value=None)
    mock_repo.list_university_images = AsyncMock(return_value=[])
    service.session.execute = AsyncMock(
        return_value=_exec_result([])
    )

    result = await service.get_university_detail("uni-001")

    assert result["disciplines"][0]["category_name"] == ""


@patch(DISC_REPO)
@patch(PROG_REPO)
@patch(REPO)
async def test_detail_cases_query_fails(
    mock_repo, mock_prog, mock_disc, service,
):
    """关联案例查询失败时返回空列表。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=_uni()
    )
    mock_prog.list_programs = AsyncMock(return_value=[])
    mock_repo.list_university_images = AsyncMock(return_value=[])
    service.session.execute = AsyncMock(
        side_effect=Exception("DB error")
    )

    result = await service.get_university_detail("uni-001")

    assert result["related_cases"] == []


@patch(REPO)
async def test_detail_not_found(mock_repo, service):
    """院校不存在时抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.get_university_detail("x")


@patch(DISC_REPO)
@patch(PROG_REPO)
@patch(REPO)
async def test_detail_with_cases(
    mock_repo, mock_prog, mock_disc, service,
):
    """关联案例正常返回时包含案例列表。"""
    mock_repo.get_university_by_id = AsyncMock(
        return_value=_uni(name="北大")
    )
    mock_prog.list_programs = AsyncMock(return_value=[])
    mock_repo.list_university_images = AsyncMock(return_value=[])
    case = MagicMock()
    case.id = "case-1"
    service.session.execute = AsyncMock(
        return_value=_exec_result([case])
    )

    result = await service.get_university_detail("uni-001")

    assert len(result["related_cases"]) == 1


# ---- filter_universities_by_discipline ----


@patch(REPO)
async def test_filter_no_discipline(mock_repo, service):
    """无学科筛选条件时直接返回基础列表。"""
    mock_repo.list_universities = AsyncMock(
        return_value=([_uni(id="u1")], 1)
    )

    result, total = await service.filter_universities_by_discipline(
        0, 20
    )

    assert total == 1
    assert len(result) == 1


@patch(REPO)
async def test_filter_by_discipline_id(mock_repo, service):
    """按学科 ID 筛选院校。"""
    u1, u2 = _uni(id="u1"), _uni(id="u2")
    mock_repo.list_universities = AsyncMock(
        return_value=([u1, u2], 2)
    )
    service.session.execute = AsyncMock(
        return_value=_exec_result(["u1"])
    )

    result, total = await service.filter_universities_by_discipline(
        0, 20, discipline_id="d1"
    )

    assert total == 1
    assert result[0].id == "u1"


@patch(REPO)
async def test_filter_discipline_no_match(mock_repo, service):
    """按学科 ID 筛选无匹配时返回空。"""
    service.session.execute = AsyncMock(
        return_value=_exec_result([])
    )

    result, total = await service.filter_universities_by_discipline(
        0, 20, discipline_id="x"
    )

    assert result == []
    assert total == 0
    mock_repo.list_universities.assert_not_called()


@patch(DISC_REPO)
@patch(REPO)
async def test_filter_by_category(mock_repo, mock_disc, service):
    """按学科大分类筛选院校。"""
    mock_disc.list_disciplines = AsyncMock(
        return_value=[_disc(id="d1"), _disc(id="d2")]
    )
    u1, u2 = _uni(id="u1"), _uni(id="u2")
    mock_repo.list_universities = AsyncMock(
        return_value=([u1, u2], 2)
    )
    service.session.execute = AsyncMock(
        return_value=_exec_result(["u1", "u2"])
    )

    result, total = await service.filter_universities_by_discipline(
        0, 20, discipline_category_id="c1"
    )

    assert total == 2


@patch(DISC_REPO)
@patch(REPO)
async def test_filter_category_no_disciplines(
    mock_repo, mock_disc, service,
):
    """按大分类筛选但该分类无学科时返回空。"""
    mock_disc.list_disciplines = AsyncMock(return_value=[])

    result, total = await service.filter_universities_by_discipline(
        0, 20, discipline_category_id="empty"
    )

    assert result == []
    assert total == 0
    mock_repo.list_universities.assert_not_called()


@patch(DISC_REPO)
@patch(REPO)
async def test_filter_category_partial(
    mock_repo, mock_disc, service,
):
    """按大分类筛选时只保留匹配的院校。"""
    mock_disc.list_disciplines = AsyncMock(
        return_value=[_disc(id="d1")]
    )
    u1, u2 = _uni(id="u1"), _uni(id="u2")
    mock_repo.list_universities = AsyncMock(
        return_value=([u1, u2], 2)
    )
    service.session.execute = AsyncMock(
        return_value=_exec_result(["u1"])
    )

    result, total = await service.filter_universities_by_discipline(
        0, 20, discipline_category_id="c1"
    )

    assert total == 1
    assert result[0].id == "u1"
