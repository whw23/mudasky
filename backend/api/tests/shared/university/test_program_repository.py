"""university/program_repository 单元测试。

测试院校专业 CRUD 数据库操作。
使用 mock session 隔离真实数据库。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.university.program_models import UniversityProgram
from app.db.university.program_repository import (
    create_program,
    delete_program,
    list_programs,
    replace_programs,
)


@pytest.fixture
def session() -> AsyncMock:
    """构建 mock 数据库会话。"""
    return AsyncMock()


# ---- list_programs ----


async def test_list_programs(session):
    """获取院校的所有专业。"""
    programs = [
        MagicMock(spec=UniversityProgram),
        MagicMock(spec=UniversityProgram),
    ]
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = programs
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_programs(session, "uni-1")

    assert len(result) == 2
    session.execute.assert_awaited_once()


async def test_list_programs_empty(session):
    """院校无专业时返回空列表。"""
    mock_result = MagicMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_result.scalars.return_value = mock_scalars
    session.execute.return_value = mock_result

    result = await list_programs(session, "uni-no-programs")

    assert result == []


# ---- create_program ----


@patch(
    "app.db.university.program_repository.uuid.uuid4",
    return_value="test-uuid-1234",
)
async def test_create_program(mock_uuid, session):
    """创建院校专业。"""
    result = await create_program(
        session,
        university_id="uni-1",
        name="计算机科学",
        discipline_id="disc-1",
    )

    session.add.assert_called_once()
    session.flush.assert_awaited_once()
    assert isinstance(result, UniversityProgram)
    assert result.university_id == "uni-1"
    assert result.name == "计算机科学"
    assert result.discipline_id == "disc-1"
    assert result.sort_order == 0


@patch(
    "app.db.university.program_repository.uuid.uuid4",
    return_value="test-uuid-5678",
)
async def test_create_program_with_sort_order(
    mock_uuid, session
):
    """创建带排序权重的专业。"""
    result = await create_program(
        session,
        university_id="uni-1",
        name="电气工程",
        discipline_id="disc-2",
        sort_order=5,
    )

    assert result.sort_order == 5
    assert result.name == "电气工程"


# ---- delete_program ----


async def test_delete_program(session):
    """删除专业。"""
    await delete_program(session, "prog-1")

    session.execute.assert_awaited_once()


async def test_delete_program_different_id(session):
    """删除另一个专业 ID。"""
    await delete_program(session, "prog-99")

    session.execute.assert_awaited_once()


# ---- replace_programs ----


@patch(
    "app.db.university.program_repository.uuid.uuid4",
    side_effect=["uuid-a", "uuid-b"],
)
async def test_replace_programs(mock_uuid, session):
    """替换院校的所有专业。"""
    programs = [
        {"name": "计算机科学", "discipline_id": "disc-1"},
        {"name": "电气工程", "discipline_id": "disc-2"},
    ]

    result = await replace_programs(
        session, "uni-1", programs
    )

    # 先删除旧专业，再添加新专业
    assert session.execute.await_count == 1  # delete 语句
    assert session.add.call_count == 2
    session.flush.assert_awaited_once()
    assert len(result) == 2
    assert result[0].name == "计算机科学"
    assert result[0].sort_order == 0
    assert result[1].name == "电气工程"
    assert result[1].sort_order == 1


@patch(
    "app.db.university.program_repository.uuid.uuid4",
    return_value="uuid-unused",
)
async def test_replace_programs_empty_list(
    mock_uuid, session
):
    """用空列表替换，删除所有专业。"""
    result = await replace_programs(session, "uni-1", [])

    session.execute.assert_awaited_once()  # delete 语句
    session.add.assert_not_called()
    session.flush.assert_awaited_once()
    assert result == []


@patch(
    "app.db.university.program_repository.uuid.uuid4",
    side_effect=["uuid-single"],
)
async def test_replace_programs_single(mock_uuid, session):
    """替换为单个专业。"""
    programs = [
        {"name": "人工智能", "discipline_id": "disc-3"},
    ]

    result = await replace_programs(
        session, "uni-1", programs
    )

    assert len(result) == 1
    assert result[0].name == "人工智能"
    assert result[0].discipline_id == "disc-3"
    assert result[0].sort_order == 0
