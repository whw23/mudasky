"""CaseService 单元测试。

测试成功案例的 CRUD 业务逻辑。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.case.models import SuccessCase
from api.admin.config.web_settings.cases.schemas import (
    CaseCreate,
    CaseUpdate,
)
from api.admin.config.web_settings.cases.service import (
    CaseService,
)
from app.core.exceptions import BadRequestException, NotFoundException

REPO = (
    "api.admin.config.web_settings.cases.service.repository"
)
APPLY_UPDATES = (
    "api.admin.config.web_settings.cases.service"
    ".apply_updates"
)


def _make_case(case_id: str = "case-1") -> MagicMock:
    """创建模拟 SuccessCase 对象。"""
    c = MagicMock(spec=SuccessCase)
    c.id = case_id
    c.student_name = "张三"
    c.university = "MIT"
    c.program = "CS"
    c.year = 2025
    c.testimonial = "很棒的体验"
    c.avatar_url = None
    c.is_featured = False
    c.sort_order = 0
    c.university_id = None
    c.avatar_image_id = None
    c.offer_image_id = None
    c.created_at = datetime.now(timezone.utc)
    c.updated_at = None
    return c


@pytest.fixture
def service() -> CaseService:
    """构建 CaseService 实例，注入 mock session。"""
    session = AsyncMock()
    return CaseService(session)


# ---- list_cases ----


@pytest.mark.asyncio
@patch(REPO)
async def test_list_cases_success(mock_repo, service):
    """分页查询成功案例。"""
    cases = [_make_case(), _make_case("case-2")]
    mock_repo.list_cases = AsyncMock(
        return_value=(cases, 2)
    )

    result, total = await service.list_cases(0, 20)

    assert len(result) == 2
    assert total == 2


@pytest.mark.asyncio
@patch(REPO)
async def test_list_cases_with_filters(
    mock_repo, service
):
    """带筛选条件查询成功案例。"""
    mock_repo.list_cases = AsyncMock(
        return_value=([], 0)
    )

    result, total = await service.list_cases(
        0, 10, year=2025, featured=True
    )

    assert total == 0
    mock_repo.list_cases.assert_awaited_once_with(
        service.session, 0, 10, 2025, True
    )


@pytest.mark.asyncio
@patch(REPO)
async def test_list_cases_empty(mock_repo, service):
    """空列表查询。"""
    mock_repo.list_cases = AsyncMock(
        return_value=([], 0)
    )

    result, total = await service.list_cases(0, 20)

    assert result == []
    assert total == 0


# ---- create_case ----


@pytest.mark.asyncio
@patch(REPO)
async def test_create_case_success(mock_repo, service):
    """创建成功案例。"""
    case = _make_case()
    mock_repo.create_case = AsyncMock(return_value=case)

    data = CaseCreate(
        student_name="张三",
        university="MIT",
        program="CS",
        year=2025,
    )
    result = await service.create_case(data)

    assert result.id == "case-1"
    mock_repo.create_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_create_case_with_all_fields(
    mock_repo, service
):
    """创建带全部字段的成功案例。"""
    case = _make_case()
    case.is_featured = True
    case.sort_order = 5
    mock_repo.create_case = AsyncMock(return_value=case)

    data = CaseCreate(
        student_name="李四",
        university="Stanford",
        program="EE",
        year=2026,
        testimonial="推荐！",
        avatar_url="https://example.com/avatar.jpg",
        is_featured=True,
        sort_order=5,
    )
    result = await service.create_case(data)

    assert result is not None
    mock_repo.create_case.assert_awaited_once()


# ---- get_case ----


@pytest.mark.asyncio
@patch(REPO)
async def test_get_case_success(mock_repo, service):
    """获取案例详情成功。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(
        return_value=case
    )

    result = await service.get_case("case-1")

    assert result.id == "case-1"


@pytest.mark.asyncio
@patch(REPO)
async def test_get_case_not_found(mock_repo, service):
    """案例不存在抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException) as exc_info:
        await service.get_case("nonexistent")

    assert exc_info.value.code == "CASE_NOT_FOUND"


# ---- update_case ----


@pytest.mark.asyncio
@patch(APPLY_UPDATES)
@patch(REPO)
async def test_update_case_success(
    mock_repo, mock_apply, service
):
    """更新案例成功。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(
        return_value=case
    )
    mock_repo.update_case = AsyncMock(return_value=case)

    data = CaseUpdate(
        case_id="case-1", student_name="新名字"
    )
    result = await service.update_case("case-1", data)

    assert result is not None
    mock_repo.update_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_update_case_not_found(mock_repo, service):
    """更新不存在的案例抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(
        return_value=None
    )

    data = CaseUpdate(
        case_id="nonexistent", student_name="新名字"
    )
    with pytest.raises(NotFoundException):
        await service.update_case("nonexistent", data)


# ---- delete_case ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_case_success(mock_repo, service):
    """删除案例成功。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(
        return_value=case
    )
    mock_repo.delete_case = AsyncMock()

    await service.delete_case("case-1")

    mock_repo.delete_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_case_not_found(mock_repo, service):
    """删除不存在的案例抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(
        return_value=None
    )

    with pytest.raises(NotFoundException):
        await service.delete_case("nonexistent")


# ---- upload_avatar ----

IMAGE_REPO = (
    "api.admin.config.web_settings.cases.service"
    ".image_repo"
)


def _make_image(image_id: str = "img-1"):
    """创建模拟 Image 对象。"""
    img = MagicMock()
    img.id = image_id
    img.filename = "avatar.jpg"
    img.content_type = "image/jpeg"
    img.size = 1024
    return img


def _make_upload_file(
    content: bytes = b"fake image data",
    filename: str = "test.jpg",
    content_type: str = "image/jpeg",
):
    """创建模拟 UploadFile 对象。"""
    file = MagicMock()
    file.filename = filename
    file.content_type = content_type
    file.read = AsyncMock(return_value=content)
    return file


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_avatar_success(
    mock_repo, mock_image_repo, service
):
    """上传学生照片成功。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    image = _make_image()
    mock_image_repo.create_image = AsyncMock(
        return_value=image
    )
    mock_repo.update_case = AsyncMock(return_value=case)

    file = _make_upload_file()
    result = await service.upload_avatar("case-1", file)

    assert result == "img-1"
    assert case.avatar_image_id == "img-1"
    mock_repo.update_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_avatar_not_found(mock_repo, service):
    """上传照片时案例不存在抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException) as exc_info:
        await service.upload_avatar("nonexistent", file)

    assert exc_info.value.code == "CASE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_avatar_invalid_type(mock_repo, service):
    """上传不支持的文件格式抛出 BadRequestException。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    file = _make_upload_file(content_type="application/pdf")
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_avatar("case-1", file)

    assert exc_info.value.code == "INVALID_IMAGE_TYPE"


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_avatar_too_large(
    mock_repo, mock_image_repo, service
):
    """上传超过 5MB 的图片抛出 BadRequestException。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    large_content = b"x" * (5 * 1024 * 1024 + 1)
    file = _make_upload_file(content=large_content)

    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_avatar("case-1", file)

    assert exc_info.value.code == "IMAGE_TOO_LARGE"


# ---- upload_offer ----


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_offer_success(
    mock_repo, mock_image_repo, service
):
    """上传录取通知书成功。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    image = _make_image("img-2")
    mock_image_repo.create_image = AsyncMock(
        return_value=image
    )
    mock_repo.update_case = AsyncMock(return_value=case)

    file = _make_upload_file()
    result = await service.upload_offer("case-1", file)

    assert result == "img-2"
    assert case.offer_image_id == "img-2"
    mock_repo.update_case.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_offer_not_found(mock_repo, service):
    """上传通知书时案例不存在抛出 NotFoundException。"""
    mock_repo.get_case_by_id = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException) as exc_info:
        await service.upload_offer("nonexistent", file)

    assert exc_info.value.code == "CASE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_offer_invalid_type(mock_repo, service):
    """上传不支持的文件格式抛出 BadRequestException。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    file = _make_upload_file(content_type="text/plain")
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_offer("case-1", file)

    assert exc_info.value.code == "INVALID_IMAGE_TYPE"


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_offer_too_large(
    mock_repo, mock_image_repo, service
):
    """上传超过 5MB 的图片抛出 BadRequestException。"""
    case = _make_case()
    mock_repo.get_case_by_id = AsyncMock(return_value=case)

    large_content = b"x" * (5 * 1024 * 1024 + 1)
    file = _make_upload_file(content=large_content)

    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_offer("case-1", file)

    assert exc_info.value.code == "IMAGE_TOO_LARGE"
