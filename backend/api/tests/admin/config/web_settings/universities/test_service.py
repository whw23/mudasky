"""UniversityService 单元测试。

测试院校管理的业务逻辑，包括图片上传和学科关联。
使用 mock 隔离数据库层。
"""

from datetime import datetime, timezone
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.universities.schemas import (
    ProgramItem,
    UniversityCreate,
    UniversityUpdate,
)
from api.admin.config.web_settings.universities.service import UniversityService
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.db.discipline.models import Discipline
from app.db.university.image_models import UniversityImage
from app.db.university.models import University

REPO = "api.admin.config.web_settings.universities.service.repository"
PROG_REPO = "api.admin.config.web_settings.universities.service.prog_repo"
DISC_REPO = "api.admin.config.web_settings.universities.service.disc_repo"
IMAGE_REPO = "api.admin.config.web_settings.universities.service.image_repo"


def _make_university(university_id: str = "uni-1") -> MagicMock:
    """创建模拟 University 对象。"""
    u = MagicMock(spec=University)
    u.id = university_id
    u.name = "清华大学"
    u.name_en = "Tsinghua University"
    u.country = "中国"
    u.province = "北京"
    u.city = "北京"
    u.logo_url = None
    u.logo_image_id = None
    u.description = "综合性大学"
    u.website = "https://tsinghua.edu.cn"
    u.is_featured = False
    u.sort_order = 0
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    return u


def _make_image(image_id: str = "img-1") -> MagicMock:
    """创建模拟 Image 对象。"""
    img = MagicMock()
    img.id = image_id
    img.filename = "test.jpg"
    img.content_type = "image/jpeg"
    img.size = 1024
    return img


def _make_university_image(record_id: str = "rec-1") -> MagicMock:
    """创建模拟 UniversityImage 对象。"""
    ui = MagicMock(spec=UniversityImage)
    ui.id = record_id
    ui.university_id = "uni-1"
    ui.image_id = "img-1"
    ui.sort_order = 0
    return ui


def _make_discipline(discipline_id: str = "disc-1") -> MagicMock:
    """创建模拟 Discipline 对象。"""
    d = MagicMock(spec=Discipline)
    d.id = discipline_id
    d.name = "计算机科学"
    return d


def _make_upload_file(
    content: bytes = b"fake image data",
    filename: str = "test.jpg",
    content_type: str = "image/jpeg",
) -> MagicMock:
    """创建模拟 UploadFile 对象。"""
    file = MagicMock()
    file.filename = filename
    file.content_type = content_type
    file.read = AsyncMock(return_value=content)
    return file


@pytest.fixture
def service(mock_session) -> UniversityService:
    """构建 UniversityService 实例，注入 mock session。"""
    return UniversityService(mock_session)


# ---- upload_logo ----


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_logo_success(mock_repo, mock_image_repo, service):
    """上传院校校徽成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    image = _make_image()
    mock_image_repo.create_image = AsyncMock(return_value=image)
    mock_repo.update_university = AsyncMock(return_value=university)

    file = _make_upload_file()
    result = await service.upload_logo("uni-1", file)

    assert result == "img-1"
    assert university.logo_image_id == "img-1"
    mock_repo.update_university.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_logo_not_found(mock_repo, service):
    """上传校徽时院校不存在抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException) as exc_info:
        await service.upload_logo("nonexistent", file)

    assert exc_info.value.code == "UNIVERSITY_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_logo_invalid_type(mock_repo, service):
    """上传不支持的文件格式抛出 BadRequestException。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    file = _make_upload_file(content_type="text/plain")
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_logo("uni-1", file)

    assert exc_info.value.code == "INVALID_IMAGE_TYPE"


# ---- upload_image ----


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_image_success(mock_repo, mock_image_repo, service):
    """上传院校图片成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)
    mock_repo.count_university_images = AsyncMock(return_value=2)

    image = _make_image()
    mock_image_repo.create_image = AsyncMock(return_value=image)

    uni_image = _make_university_image()
    mock_repo.add_university_image = AsyncMock(return_value=uni_image)

    file = _make_upload_file()
    result = await service.upload_image("uni-1", file)

    assert result.id == "rec-1"
    mock_repo.add_university_image.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_image_limit_exceeded(mock_repo, service):
    """上传图片超过 5 张限制抛出 ConflictException。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)
    mock_repo.count_university_images = AsyncMock(return_value=5)

    file = _make_upload_file()
    with pytest.raises(ConflictException) as exc_info:
        await service.upload_image("uni-1", file)

    assert exc_info.value.code == "UNIVERSITY_IMAGE_LIMIT"


@pytest.mark.asyncio
@patch(REPO)
async def test_upload_image_university_not_found(mock_repo, service):
    """上传图片时院校不存在抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException):
        await service.upload_image("nonexistent", file)


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(REPO)
async def test_upload_image_too_large(mock_repo, mock_image_repo, service):
    """上传超过 5MB 的图片抛出 BadRequestException。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)
    mock_repo.count_university_images = AsyncMock(return_value=2)

    # 创建超过 5MB 的文件
    large_content = b"x" * (5 * 1024 * 1024 + 1)
    file = _make_upload_file(content=large_content)

    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_image("uni-1", file)

    assert exc_info.value.code == "IMAGE_TOO_LARGE"


# ---- delete_image ----


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_image_success(mock_repo, service):
    """删除院校图片成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    uni_image = _make_university_image()
    mock_repo.get_university_image_by_id = AsyncMock(return_value=uni_image)
    mock_repo.delete_university_image = AsyncMock()

    await service.delete_image("uni-1", "rec-1")

    mock_repo.delete_university_image.assert_awaited_once()


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_image_not_found(mock_repo, service):
    """删除不存在的图片记录抛出 NotFoundException。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)
    mock_repo.get_university_image_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.delete_image("uni-1", "nonexistent")

    assert exc_info.value.code == "UNIVERSITY_IMAGE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_image_wrong_university(mock_repo, service):
    """删除不属于该院校的图片记录抛出 NotFoundException。"""
    university = _make_university("uni-1")
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    # 图片记录属于另一个院校
    uni_image = _make_university_image()
    uni_image.university_id = "uni-2"
    mock_repo.get_university_image_by_id = AsyncMock(return_value=uni_image)

    with pytest.raises(NotFoundException) as exc_info:
        await service.delete_image("uni-1", "rec-1")

    assert exc_info.value.code == "UNIVERSITY_IMAGE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_delete_image_university_not_found(mock_repo, service):
    """删除图片时院校不存在抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException):
        await service.delete_image("nonexistent", "rec-1")


# ---- set_disciplines ----


@pytest.mark.asyncio
@patch(PROG_REPO)
@patch(DISC_REPO)
@patch(REPO)
async def test_set_programs_success(mock_repo, mock_disc_repo, mock_prog_repo, service):
    """设置院校专业成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    disc1 = _make_discipline("disc-1")
    disc2 = _make_discipline("disc-2")
    mock_disc_repo.get_discipline_by_id = AsyncMock(
        side_effect=[disc1, disc2]
    )
    mock_prog_repo.replace_programs = AsyncMock()

    programs = [
        ProgramItem(name="计算机科学", discipline_id="disc-1"),
        ProgramItem(name="金融学", discipline_id="disc-2"),
    ]
    await service.set_programs("uni-1", programs)

    assert mock_disc_repo.get_discipline_by_id.await_count == 2
    mock_prog_repo.replace_programs.assert_awaited_once()
    call_args = mock_prog_repo.replace_programs.call_args
    assert call_args[0][0] == service.session
    assert call_args[0][1] == "uni-1"
    assert len(call_args[0][2]) == 2
    assert call_args[0][2][0]["name"] == "计算机科学"
    assert call_args[0][2][0]["discipline_id"] == "disc-1"


@pytest.mark.asyncio
@patch(DISC_REPO)
@patch(REPO)
async def test_set_programs_discipline_not_found(mock_repo, mock_disc_repo, service):
    """设置专业时学科不存在抛出 NotFoundException。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)

    mock_disc_repo.get_discipline_by_id = AsyncMock(return_value=None)

    programs = [ProgramItem(name="计算机科学", discipline_id="disc-1")]
    with pytest.raises(NotFoundException) as exc_info:
        await service.set_programs("uni-1", programs)

    assert exc_info.value.code == "DISCIPLINE_NOT_FOUND"


@pytest.mark.asyncio
@patch(REPO)
async def test_set_programs_university_not_found(mock_repo, service):
    """设置专业时院校不存在抛出 NotFoundException。"""
    mock_repo.get_university_by_id = AsyncMock(return_value=None)

    programs = [ProgramItem(name="计算机科学", discipline_id="disc-1")]
    with pytest.raises(NotFoundException):
        await service.set_programs("nonexistent", programs)


@pytest.mark.asyncio
@patch(PROG_REPO)
@patch(REPO)
async def test_set_programs_empty_list(mock_repo, mock_prog_repo, service):
    """设置空专业列表（清空专业）成功。"""
    university = _make_university()
    mock_repo.get_university_by_id = AsyncMock(return_value=university)
    mock_prog_repo.replace_programs = AsyncMock()

    await service.set_programs("uni-1", [])

    mock_prog_repo.replace_programs.assert_awaited_once_with(
        service.session, "uni-1", []
    )
