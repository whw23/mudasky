"""DisciplineExportService 单元测试。

测试学科分类导出的初始化和导出场景。
使用 mock 隔离数据库层和文件工具。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.disciplines.export_service import (
    DisciplineExportService,
)

MODULE = "api.admin.config.web_settings.disciplines.export_service"
DISC_REPO = f"{MODULE}.disc_repo"
WB_TO_BYTES = f"{MODULE}.workbook_to_bytes"
WRITE_HEADER = f"{MODULE}.write_sheet_header"


def _make_category(**kwargs) -> MagicMock:
    """创建模拟 DisciplineCategory 对象。"""
    c = MagicMock()
    c.id = kwargs.get("id", "cat-1")
    c.name = kwargs.get("name", "工学")
    return c


def _make_discipline(**kwargs) -> MagicMock:
    """创建模拟 Discipline 对象。"""
    d = MagicMock()
    d.id = kwargs.get("id", "disc-1")
    d.category_id = kwargs.get("category_id", "cat-1")
    d.name = kwargs.get("name", "计算机科学")
    return d


@pytest.fixture
def service(mock_session) -> DisciplineExportService:
    """构建 DisciplineExportService 实例，注入 mock session。"""
    return DisciplineExportService(mock_session)


# ---- __init__ ----


def test_init_sets_session(mock_session):
    """初始化时正确注入 session。"""
    svc = DisciplineExportService(mock_session)
    assert svc.session is mock_session


# ---- export_excel（基础场景） ----


@pytest.mark.asyncio
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
async def test_export_empty(
    mock_repo, mock_header, mock_wb, service,
):
    """无分类时导出空 Excel。"""
    mock_repo.list_categories = AsyncMock(return_value=[])

    result = await service.export_excel()

    assert result == b"excel-bytes"
    mock_repo.list_categories.assert_awaited_once_with(service.session)


@pytest.mark.asyncio
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
async def test_export_category_with_disciplines(
    mock_repo, mock_header, mock_wb, service,
):
    """有分类和学科时正常导出。"""
    cat = _make_category(id="cat-1", name="工学")
    disc1 = _make_discipline(name="计算机科学")
    disc2 = _make_discipline(id="disc-2", name="电子工程")

    mock_repo.list_categories = AsyncMock(return_value=[cat])
    mock_repo.list_disciplines = AsyncMock(
        return_value=[disc1, disc2]
    )

    result = await service.export_excel()

    assert result == b"excel-bytes"
    mock_repo.list_disciplines.assert_awaited_once_with(
        service.session, category_id="cat-1"
    )


@pytest.mark.asyncio
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
async def test_export_category_no_disciplines(
    mock_repo, mock_header, mock_wb, service,
):
    """分类下无学科时仍然正常导出。"""
    cat = _make_category(id="cat-1", name="医学")
    mock_repo.list_categories = AsyncMock(return_value=[cat])
    mock_repo.list_disciplines = AsyncMock(return_value=[])

    result = await service.export_excel()

    assert result == b"excel-bytes"


@pytest.mark.asyncio
@patch(WB_TO_BYTES, return_value=b"excel-bytes")
@patch(WRITE_HEADER)
@patch(DISC_REPO)
async def test_export_multiple_categories(
    mock_repo, mock_header, mock_wb, service,
):
    """多个分类时逐个查询学科。"""
    cat1 = _make_category(id="cat-1", name="工学")
    cat2 = _make_category(id="cat-2", name="理学")
    disc_a = _make_discipline(name="机械工程")
    disc_b = _make_discipline(id="disc-2", name="物理学")

    mock_repo.list_categories = AsyncMock(
        return_value=[cat1, cat2]
    )
    mock_repo.list_disciplines = AsyncMock(
        side_effect=[[disc_a], [disc_b]]
    )

    result = await service.export_excel()

    assert result == b"excel-bytes"
    assert mock_repo.list_disciplines.await_count == 2
