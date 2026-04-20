"""ImportService 单元测试。

测试院校批量导入的业务逻辑。
"""

import io
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from openpyxl import Workbook

from api.admin.config.web_settings.universities.import_service import ImportService
from app.db.discipline.models import Discipline, DisciplineCategory
from app.db.university.models import University

DISC_REPO = "api.admin.config.web_settings.universities.import_service.disc_repo"
UNI_REPO = "api.admin.config.web_settings.universities.import_service.uni_repo"
PROG_REPO = "api.admin.config.web_settings.universities.import_service.prog_repo"


def _make_category(category_id: str = "cat-1", name: str = "工学") -> MagicMock:
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


def _make_university(university_id: str = "uni-1") -> MagicMock:
    """创建模拟 University 对象。"""
    uni = MagicMock(spec=University)
    uni.id = university_id
    uni.name = "哈佛大学"
    return uni


def _make_upload_file(content: bytes, filename: str = "test.xlsx") -> MagicMock:
    """创建模拟 UploadFile 对象。"""
    file = MagicMock()
    file.filename = filename
    file.read = AsyncMock(return_value=content)
    file.content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return file


def _create_valid_workbook() -> Workbook:
    """创建包含有效数据的测试 workbook。"""
    wb = Workbook()

    # 基本信息
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["名称", "哈佛大学"])
    ws1.append(["英文名", "Harvard University"])
    ws1.append(["国家", "美国"])
    ws1.append(["省份", "马萨诸塞州"])
    ws1.append(["城市", "剑桥"])
    ws1.append(["网站", "https://harvard.edu"])
    ws1.append(["描述", "世界顶尖学府"])
    ws1.append(["录取要求", "GPA 3.8+, TOEFL 100+"])
    ws1.append(["奖学金信息", "多种奖学金可申请"])
    ws1.append(["纬度", "42.377"])
    ws1.append(["经度", "-71.1167"])

    # 学科分类
    ws2 = wb.create_sheet("学科分类")
    ws2.append(["大分类", "学科"])
    ws2.append(["工学", "计算机科学"])
    ws2.append(["商学", "金融学"])

    # QS排名
    ws3 = wb.create_sheet("QS排名")
    ws3.append(["年份", "排名"])
    ws3.append([2026, 4])
    ws3.append([2025, 5])

    return wb


def _workbook_to_bytes(wb: Workbook) -> bytes:
    """将 workbook 转换为字节。"""
    output = io.BytesIO()
    wb.save(output)
    return output.getvalue()


@pytest.fixture
def service(mock_session) -> ImportService:
    """构建 ImportService 实例。"""
    return ImportService(mock_session)


# ---- generate_template ----


def test_generate_template(service):
    """生成导入模板返回有效的 Excel 文件。"""
    result = service.generate_template()

    assert isinstance(result, bytes)
    assert len(result) > 0

    # 验证可以加载为 workbook
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(result))
    assert "基本信息" in wb.sheetnames
    assert "学科分类" in wb.sheetnames
    assert "QS排名" in wb.sheetnames


def test_generate_template_has_required_fields(service):
    """生成的模板包含必填字段。"""
    result = service.generate_template()

    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(result))
    ws1 = wb["基本信息"]

    fields = [row[0].value for row in ws1.iter_rows(max_col=1)]
    assert "名称" in fields
    assert "国家" in fields
    assert "城市" in fields


# ---- _parse_workbook ----


def test_parse_workbook_success(service):
    """解析有效 workbook 返回完整数据。"""
    wb = _create_valid_workbook()

    result = service._parse_workbook(wb)

    assert result["名称"] == "哈佛大学"
    assert result["英文名"] == "Harvard University"
    assert result["国家"] == "美国"
    assert result["城市"] == "剑桥"
    assert "工学/计算机科学" in result["disciplines"]
    assert "商学/金融学" in result["disciplines"]
    assert len(result["qs_rankings"]) == 2
    assert result["qs_rankings"][0]["year"] == 2026
    assert result["qs_rankings"][0]["ranking"] == 4


def test_parse_workbook_missing_required_name(service):
    """缺少必填字段 '名称' 抛出 ValueError。"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["国家", "美国"])
    ws1.append(["城市", "剑桥"])

    with pytest.raises(ValueError) as exc_info:
        service._parse_workbook(wb)

    assert "名称" in str(exc_info.value)


def test_parse_workbook_missing_required_country(service):
    """缺少必填字段 '国家' 抛出 ValueError。"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["名称", "哈佛大学"])
    ws1.append(["城市", "剑桥"])

    with pytest.raises(ValueError) as exc_info:
        service._parse_workbook(wb)

    assert "国家" in str(exc_info.value)


def test_parse_workbook_missing_required_city(service):
    """缺少必填字段 '城市' 抛出 ValueError。"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["名称", "哈佛大学"])
    ws1.append(["国家", "美国"])

    with pytest.raises(ValueError) as exc_info:
        service._parse_workbook(wb)

    assert "城市" in str(exc_info.value)


def test_parse_workbook_without_optional_sheets(service):
    """仅包含基本信息的 workbook 解析成功。"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["名称", "哈佛大学"])
    ws1.append(["国家", "美国"])
    ws1.append(["城市", "剑桥"])

    result = service._parse_workbook(wb)

    assert result["名称"] == "哈佛大学"
    assert result.get("disciplines", []) == []
    assert result.get("qs_rankings") is None


# ---- preview ----


@pytest.mark.asyncio
@patch(DISC_REPO)
async def test_preview_single_file(mock_disc_repo, service):
    """预览单个 xlsx 文件返回有效数据。"""
    wb = _create_valid_workbook()
    content = _workbook_to_bytes(wb)
    file = _make_upload_file(content, "test.xlsx")

    # mock 学科查询
    cat = _make_category()
    disc1 = _make_discipline("disc-1", "计算机科学")
    disc2 = _make_discipline("disc-2", "金融学")
    mock_disc_repo.get_category_by_name = AsyncMock(return_value=cat)
    mock_disc_repo.get_discipline_by_name = AsyncMock(
        side_effect=[disc1, disc2]
    )

    result = await service.preview(file)

    assert len(result["valid_rows"]) == 1
    assert result["valid_rows"][0]["名称"] == "哈佛大学"
    assert len(result["error_rows"]) == 0
    assert len(result["unknown_disciplines"]) == 0


@pytest.mark.asyncio
@patch(DISC_REPO)
async def test_preview_with_unknown_disciplines(mock_disc_repo, service):
    """预览时检测到未知学科。"""
    wb = _create_valid_workbook()
    content = _workbook_to_bytes(wb)
    file = _make_upload_file(content, "test.xlsx")

    # mock 学科查询 - 第一个存在，第二个分类存在但学科不存在
    cat_gongxue = _make_category("cat-1", "工学")
    cat_shangxue = _make_category("cat-2", "商学")
    disc1 = _make_discipline("disc-1", "计算机科学")

    async def mock_get_cat(session, name):
        if name == "工学":
            return cat_gongxue
        elif name == "商学":
            return cat_shangxue
        return None

    async def mock_get_disc(session, cat_id, name):
        if cat_id == "cat-1" and name == "计算机科学":
            return disc1
        return None

    mock_disc_repo.get_category_by_name = mock_get_cat
    mock_disc_repo.get_discipline_by_name = mock_get_disc

    result = await service.preview(file)

    assert len(result["valid_rows"]) == 1
    assert len(result["unknown_disciplines"]) == 1
    assert "商学/金融学" in result["unknown_disciplines"]


@pytest.mark.asyncio
@patch(DISC_REPO)
async def test_preview_with_unknown_category(mock_disc_repo, service):
    """预览时检测到未知学科分类。"""
    wb = _create_valid_workbook()
    content = _workbook_to_bytes(wb)
    file = _make_upload_file(content, "test.xlsx")

    # mock 学科查询 - 分类不存在
    mock_disc_repo.get_category_by_name = AsyncMock(return_value=None)

    result = await service.preview(file)

    assert len(result["valid_rows"]) == 1
    assert len(result["unknown_disciplines"]) == 2  # 两个学科都未知
    assert "工学/计算机科学" in result["unknown_disciplines"]
    assert "商学/金融学" in result["unknown_disciplines"]


@pytest.mark.asyncio
@patch(DISC_REPO)
async def test_preview_invalid_file(mock_disc_repo, service):
    """预览时文件格式错误返回 error_rows。"""
    wb = Workbook()
    ws1 = wb.active
    ws1.title = "基本信息"
    ws1.append(["名称", "哈佛大学"])
    # 缺少必填字段 '国家' 和 '城市'

    content = _workbook_to_bytes(wb)
    file = _make_upload_file(content, "test.xlsx")

    result = await service.preview(file)

    assert len(result["valid_rows"]) == 0
    assert len(result["error_rows"]) == 1
    assert "error" in result["error_rows"][0]


@pytest.mark.asyncio
@patch(DISC_REPO)
async def test_preview_multiple_files_in_zip(mock_disc_repo, service):
    """预览 zip 文件中的多个 xlsx 文件。"""
    # 创建两个 workbook
    wb1 = _create_valid_workbook()
    wb2 = Workbook()
    ws = wb2.active
    ws.title = "基本信息"
    ws.append(["名称", "MIT"])
    ws.append(["国家", "美国"])
    ws.append(["城市", "剑桥"])

    # 打包成 zip
    import zipfile

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zf:
        zf.writestr("file1.xlsx", _workbook_to_bytes(wb1))
        zf.writestr("file2.xlsx", _workbook_to_bytes(wb2))

    file = _make_upload_file(zip_buffer.getvalue(), "batch.zip")

    # mock 学科查询
    cat = _make_category()
    disc1 = _make_discipline("disc-1", "计算机科学")
    disc2 = _make_discipline("disc-2", "金融学")
    mock_disc_repo.get_category_by_name = AsyncMock(return_value=cat)
    mock_disc_repo.get_discipline_by_name = AsyncMock(
        side_effect=[disc1, disc2]
    )

    result = await service.preview(file)

    assert len(result["valid_rows"]) == 2
    assert result["valid_rows"][0]["名称"] == "哈佛大学"
    assert result["valid_rows"][1]["名称"] == "MIT"


# ---- confirm ----


@pytest.mark.asyncio
@patch(PROG_REPO)
@patch(UNI_REPO)
@patch(DISC_REPO)
async def test_confirm_import_success(
    mock_disc_repo, mock_uni_repo, mock_prog_repo, service
):
    """确认导入创建院校成功。"""
    row = {
        "名称": "哈佛大学",
        "英文名": "Harvard University",
        "国家": "美国",
        "城市": "剑桥",
        "disciplines": ["工学/计算机科学"],
    }

    cat = _make_category()
    disc = _make_discipline()
    uni = _make_university()

    mock_disc_repo.get_category_by_name = AsyncMock(return_value=cat)
    mock_disc_repo.get_discipline_by_name = AsyncMock(return_value=disc)
    mock_prog_repo.replace_programs = AsyncMock()
    mock_uni_repo.create_university = AsyncMock(return_value=uni)

    result = await service.confirm([row], [])

    assert result["imported"] == 1
    assert result["skipped"] == 0
    mock_uni_repo.create_university.assert_awaited_once()
    mock_prog_repo.replace_programs.assert_awaited_once()


@pytest.mark.asyncio
@patch(UNI_REPO)
@patch(DISC_REPO)
async def test_confirm_with_discipline_mappings(
    mock_disc_repo, mock_uni_repo, service
):
    """确认导入时创建新学科分类。"""
    row = {"名称": "MIT", "国家": "美国", "城市": "剑桥", "disciplines": []}

    mappings = [{"action": "create", "name": "理学/物理学"}]

    cat = _make_category("cat-2", "理学")
    disc = _make_discipline("disc-3", "物理学")
    uni = _make_university("uni-2")

    mock_disc_repo.get_category_by_name = AsyncMock(return_value=None)
    mock_disc_repo.create_category = AsyncMock(return_value=cat)
    mock_disc_repo.create_discipline = AsyncMock(return_value=disc)
    mock_uni_repo.create_university = AsyncMock(return_value=uni)

    result = await service.confirm([row], mappings)

    assert result["imported"] == 1
    mock_disc_repo.create_category.assert_awaited_once()
    mock_disc_repo.create_discipline.assert_awaited_once()


@pytest.mark.asyncio
@patch(UNI_REPO)
@patch(DISC_REPO)
async def test_confirm_skip_failed_rows(
    mock_disc_repo, mock_uni_repo, service
):
    """导入时跳过失败的行。"""
    row1 = {"名称": "哈佛大学", "国家": "美国", "城市": "剑桥"}
    row2 = {"名称": "MIT", "国家": "美国", "城市": "剑桥"}

    uni = _make_university()
    mock_uni_repo.create_university = AsyncMock(
        side_effect=[uni, Exception("DB error")]
    )

    result = await service.confirm([row1, row2], [])

    assert result["imported"] == 1
    assert result["skipped"] == 1
