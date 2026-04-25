"""DisciplinePublicService 单元测试。

测试学科分类公开查询逻辑。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.public.discipline.service import DisciplinePublicService

REPO = "api.public.discipline.service.repository"


def _make_category(
    cat_id: str = "cat-1",
    name: str = "工学",
) -> MagicMock:
    """创建模拟学科大分类对象。"""
    c = MagicMock()
    c.id = cat_id
    c.name = name
    return c


def _make_discipline(
    disc_id: str = "disc-1",
    name: str = "计算机科学与技术",
) -> MagicMock:
    """创建模拟学科小分类对象。"""
    d = MagicMock()
    d.id = disc_id
    d.name = name
    return d


@pytest.fixture
def service(mock_session) -> DisciplinePublicService:
    """构建 DisciplinePublicService 实例，注入 mock session。"""
    return DisciplinePublicService(mock_session)


# ---- get_discipline_tree ----


@patch(REPO)
async def test_get_discipline_tree_success(mock_repo, service):
    """有分类和学科时返回完整树形结构。"""
    cat = _make_category("cat-1", "工学")
    disc1 = _make_discipline("disc-1", "计算机科学与技术")
    disc2 = _make_discipline("disc-2", "软件工程")

    mock_repo.list_categories = AsyncMock(return_value=[cat])
    mock_repo.list_disciplines = AsyncMock(
        return_value=[disc1, disc2]
    )

    result = await service.get_discipline_tree()

    assert len(result) == 1
    assert result[0].id == "cat-1"
    assert result[0].name == "工学"
    assert len(result[0].disciplines) == 2
    assert result[0].disciplines[0].id == "disc-1"
    assert result[0].disciplines[1].name == "软件工程"
    mock_repo.list_categories.assert_awaited_once_with(
        service.session
    )
    mock_repo.list_disciplines.assert_awaited_once_with(
        service.session, "cat-1"
    )


@patch(REPO)
async def test_get_discipline_tree_empty(mock_repo, service):
    """无分类时返回空列表。"""
    mock_repo.list_categories = AsyncMock(return_value=[])

    result = await service.get_discipline_tree()

    assert result == []
    mock_repo.list_categories.assert_awaited_once_with(
        service.session
    )
    mock_repo.list_disciplines.assert_not_called()


@patch(REPO)
async def test_get_discipline_tree_no_disciplines(
    mock_repo, service
):
    """分类存在但无学科时，disciplines 为空列表。"""
    cat = _make_category("cat-1", "理学")
    mock_repo.list_categories = AsyncMock(return_value=[cat])
    mock_repo.list_disciplines = AsyncMock(return_value=[])

    result = await service.get_discipline_tree()

    assert len(result) == 1
    assert result[0].id == "cat-1"
    assert result[0].name == "理学"
    assert result[0].disciplines == []


@patch(REPO)
async def test_get_discipline_tree_multiple(mock_repo, service):
    """多个分类各含多个学科时返回正确树形结构。"""
    cat1 = _make_category("cat-1", "工学")
    cat2 = _make_category("cat-2", "理学")
    disc_eng1 = _make_discipline("disc-1", "计算机科学与技术")
    disc_eng2 = _make_discipline("disc-2", "电子信息工程")
    disc_sci1 = _make_discipline("disc-3", "数学")
    disc_sci2 = _make_discipline("disc-4", "物理学")
    disc_sci3 = _make_discipline("disc-5", "化学")

    mock_repo.list_categories = AsyncMock(
        return_value=[cat1, cat2]
    )

    async def list_disciplines_side_effect(session, cat_id):
        if cat_id == "cat-1":
            return [disc_eng1, disc_eng2]
        if cat_id == "cat-2":
            return [disc_sci1, disc_sci2, disc_sci3]
        return []

    mock_repo.list_disciplines = AsyncMock(
        side_effect=list_disciplines_side_effect
    )

    result = await service.get_discipline_tree()

    assert len(result) == 2
    # 第一个分类：工学，2 个学科
    assert result[0].id == "cat-1"
    assert result[0].name == "工学"
    assert len(result[0].disciplines) == 2
    assert result[0].disciplines[0].name == "计算机科学与技术"
    assert result[0].disciplines[1].name == "电子信息工程"
    # 第二个分类：理学，3 个学科
    assert result[1].id == "cat-2"
    assert result[1].name == "理学"
    assert len(result[1].disciplines) == 3
    assert result[1].disciplines[0].name == "数学"
    assert result[1].disciplines[2].name == "化学"
    # 验证调用次数
    assert mock_repo.list_disciplines.await_count == 2
