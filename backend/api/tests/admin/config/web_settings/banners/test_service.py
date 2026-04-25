"""BannerService 单元测试。

测试 Banner 管理的获取、上传、移除、重排业务逻辑。
使用 mock 隔离数据库层。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.admin.config.web_settings.banners.service import (
    BannerService,
)
from app.core.exceptions import (
    BadRequestException,
    NotFoundException,
)

CONFIG_REPO = (
    "api.admin.config.web_settings.banners.service.config_repo"
)
IMAGE_REPO = (
    "api.admin.config.web_settings.banners.service.image_repo"
)


def _make_config_record(value: dict) -> MagicMock:
    """创建模拟 SystemConfig 记录。"""
    record = MagicMock()
    record.value = value
    return record


def _sample_banners() -> dict:
    """创建示例 Banner 配置数据。"""
    return {
        "home": {"image_ids": ["img-1", "img-2"]},
        "about": {"image_ids": ["img-3"]},
    }


def _make_upload_file(
    content_type: str = "image/png",
    data: bytes = b"fake-png-data",
    filename: str = "banner.png",
) -> MagicMock:
    """创建模拟 UploadFile。"""
    file = MagicMock()
    file.content_type = content_type
    file.filename = filename
    file.read = AsyncMock(return_value=data)
    return file


@pytest.fixture
def service() -> BannerService:
    """构建 BannerService 实例，注入 mock session。"""
    session = AsyncMock()
    return BannerService(session)


# ---- get_all_banners ----


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_get_all_banners_success(mock_repo, service):
    """有配置时返回完整 Banner 数据。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    result = await service.get_all_banners()

    assert result == banners
    assert len(result["home"]["image_ids"]) == 2
    mock_repo.get_by_key.assert_awaited_once_with(
        service.session, "page_banners"
    )


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_get_all_banners_empty(mock_repo, service):
    """无配置记录时返回空字典。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    result = await service.get_all_banners()

    assert result == {}


# ---- upload_banner ----


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CONFIG_REPO)
async def test_upload_banner_success(
    mock_config, mock_image, service
):
    """上传 Banner 图片成功，返回图片 ID。"""
    banners = _sample_banners()
    config = _make_config_record(banners)
    mock_config.get_by_key = AsyncMock(return_value=config)
    mock_config.update_value = AsyncMock()

    image = MagicMock()
    image.id = "new-img-id"
    mock_image.create_image = AsyncMock(return_value=image)

    file = _make_upload_file()
    result = await service.upload_banner("home", file)

    assert result == "new-img-id"
    assert "new-img-id" in banners["home"]["image_ids"]
    mock_config.update_value.assert_awaited_once()


@pytest.mark.asyncio
@patch(IMAGE_REPO)
@patch(CONFIG_REPO)
async def test_upload_banner_jpeg_success(
    mock_config, mock_image, service
):
    """上传 JPEG 格式 Banner 成功。"""
    banners = _sample_banners()
    config = _make_config_record(banners)
    mock_config.get_by_key = AsyncMock(return_value=config)
    mock_config.update_value = AsyncMock()

    image = MagicMock()
    image.id = "jpeg-img-id"
    mock_image.create_image = AsyncMock(return_value=image)

    file = _make_upload_file(
        content_type="image/jpeg", filename="photo.jpg"
    )
    result = await service.upload_banner("about", file)

    assert result == "jpeg-img-id"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_upload_banner_config_not_found(
    mock_repo, service
):
    """配置不存在时抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    file = _make_upload_file()
    with pytest.raises(NotFoundException) as exc_info:
        await service.upload_banner("home", file)

    assert exc_info.value.code == "BANNER_CONFIG_NOT_FOUND"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_upload_banner_invalid_page_key(
    mock_repo, service
):
    """无效的页面 key 时抛出 BadRequestException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    file = _make_upload_file()
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_banner("nonexistent-page", file)

    assert exc_info.value.code == "INVALID_PAGE_KEY"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_upload_banner_invalid_mime_type(
    mock_repo, service
):
    """不支持的图片格式抛出 BadRequestException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    file = _make_upload_file(content_type="text/plain")
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_banner("home", file)

    assert exc_info.value.code == "INVALID_IMAGE_TYPE"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_upload_banner_file_too_large(
    mock_repo, service
):
    """文件超过大小限制抛出 BadRequestException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    # 11MB 数据，超过 10MB 限制
    large_data = b"x" * (11 * 1024 * 1024)
    file = _make_upload_file(data=large_data)
    with pytest.raises(BadRequestException) as exc_info:
        await service.upload_banner("home", file)

    assert exc_info.value.code == "IMAGE_TOO_LARGE"


# ---- remove_banner ----


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_remove_banner_success(mock_repo, service):
    """移除 Banner 图片成功。"""
    banners = _sample_banners()
    config = _make_config_record(banners)
    mock_repo.get_by_key = AsyncMock(return_value=config)
    mock_repo.update_value = AsyncMock()

    await service.remove_banner("home", "img-1")

    assert "img-1" not in banners["home"]["image_ids"]
    mock_repo.update_value.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_remove_banner_last_image(mock_repo, service):
    """移除页面唯一的 Banner 图片成功，列表变空。"""
    banners = {"about": {"image_ids": ["only-img"]}}
    config = _make_config_record(banners)
    mock_repo.get_by_key = AsyncMock(return_value=config)
    mock_repo.update_value = AsyncMock()

    await service.remove_banner("about", "only-img")

    assert banners["about"]["image_ids"] == []


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_remove_banner_config_not_found(
    mock_repo, service
):
    """配置不存在时抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.remove_banner("home", "img-1")

    assert exc_info.value.code == "BANNER_CONFIG_NOT_FOUND"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_remove_banner_invalid_page_key(
    mock_repo, service
):
    """无效的页面 key 时抛出 BadRequestException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    with pytest.raises(BadRequestException) as exc_info:
        await service.remove_banner("bad-page", "img-1")

    assert exc_info.value.code == "INVALID_PAGE_KEY"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_remove_banner_image_not_in_list(
    mock_repo, service
):
    """图片 ID 不在列表中时抛出 NotFoundException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    with pytest.raises(NotFoundException) as exc_info:
        await service.remove_banner("home", "nonexistent-img")

    assert exc_info.value.code == "BANNER_IMAGE_NOT_FOUND"


# ---- reorder_banners ----


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_reorder_banners_success(mock_repo, service):
    """重排 Banner 图片顺序成功。"""
    banners = _sample_banners()
    config = _make_config_record(banners)
    mock_repo.get_by_key = AsyncMock(return_value=config)
    mock_repo.update_value = AsyncMock()

    new_order = ["img-2", "img-1"]
    await service.reorder_banners("home", new_order)

    assert banners["home"]["image_ids"] == new_order
    mock_repo.update_value.assert_awaited_once()


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_reorder_banners_single_image(
    mock_repo, service
):
    """单张图片重排成功。"""
    banners = _sample_banners()
    config = _make_config_record(banners)
    mock_repo.get_by_key = AsyncMock(return_value=config)
    mock_repo.update_value = AsyncMock()

    await service.reorder_banners("about", ["img-3"])

    assert banners["about"]["image_ids"] == ["img-3"]


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_reorder_banners_config_not_found(
    mock_repo, service
):
    """配置不存在时抛出 NotFoundException。"""
    mock_repo.get_by_key = AsyncMock(return_value=None)

    with pytest.raises(NotFoundException) as exc_info:
        await service.reorder_banners("home", ["img-1"])

    assert exc_info.value.code == "BANNER_CONFIG_NOT_FOUND"


@pytest.mark.asyncio
@patch(CONFIG_REPO)
async def test_reorder_banners_invalid_page_key(
    mock_repo, service
):
    """无效的页面 key 时抛出 BadRequestException。"""
    banners = _sample_banners()
    mock_repo.get_by_key = AsyncMock(
        return_value=_make_config_record(banners)
    )

    with pytest.raises(BadRequestException) as exc_info:
        await service.reorder_banners(
            "bad-page", ["img-1"]
        )

    assert exc_info.value.code == "INVALID_PAGE_KEY"
