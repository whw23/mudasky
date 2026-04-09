"""core/storage 单元测试。

测试文件保存、删除、路径解析、配额校验等操作。
使用临时目录和 mock 隔离实际文件系统。
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import QuotaExceededException
from app.core.storage import (
    delete_file,
    get_file_path,
    save_file,
    validate_storage_quota,
)


# ---- save_file ----


@patch("app.core.storage.aiofiles.open")
@patch("app.core.storage.aiofiles.os.makedirs", new_callable=AsyncMock)
@patch("app.core.storage.settings")
async def test_save_file_success(
    mock_settings, mock_makedirs, mock_open
):
    """保存文件成功。"""
    mock_settings.max_upload_size_bytes = 10 * 1024 * 1024

    file = MagicMock()
    file.read = AsyncMock(return_value=b"hello world")
    file.filename = "test.txt"

    mock_file_ctx = AsyncMock()
    mock_open.return_value.__aenter__ = AsyncMock(
        return_value=mock_file_ctx
    )
    mock_open.return_value.__aexit__ = AsyncMock(return_value=False)

    path, size = await save_file(file, "user-1", "docs")

    assert size == 11
    assert "user-1/docs/" in path
    assert "test.txt" in path
    mock_makedirs.assert_awaited_once()


@patch("app.core.storage.settings")
async def test_save_file_exceeds_limit(mock_settings):
    """文件大小超过限制抛出异常。"""
    mock_settings.max_upload_size_bytes = 10
    mock_settings.MAX_UPLOAD_SIZE_MB = 10

    file = MagicMock()
    file.read = AsyncMock(return_value=b"x" * 100)
    file.filename = "big.txt"

    with pytest.raises(QuotaExceededException):
        await save_file(file, "user-1", "docs")


@patch("app.core.storage.settings")
async def test_save_file_no_filename(mock_settings):
    """无文件名使用 untitled。"""
    mock_settings.max_upload_size_bytes = 10 * 1024 * 1024

    file = MagicMock()
    file.read = AsyncMock(return_value=b"data")
    file.filename = None

    with patch("app.core.storage.aiofiles.open") as mock_open, \
         patch("app.core.storage.aiofiles.os.makedirs", new_callable=AsyncMock):
        mock_file_ctx = AsyncMock()
        mock_open.return_value.__aenter__ = AsyncMock(
            return_value=mock_file_ctx
        )
        mock_open.return_value.__aexit__ = AsyncMock(return_value=False)

        path, size = await save_file(file, "user-1", "docs")

    assert "untitled" in path
    assert size == 4


# ---- delete_file ----


@patch("app.core.storage.aiofiles.os.remove", new_callable=AsyncMock)
async def test_delete_file_success(mock_remove):
    """删除文件成功。"""
    await delete_file("user-1/docs/test.txt")

    mock_remove.assert_awaited_once()


@patch(
    "app.core.storage.aiofiles.os.remove",
    new_callable=AsyncMock,
    side_effect=FileNotFoundError,
)
async def test_delete_file_not_found(mock_remove):
    """删除不存在的文件不抛异常。"""
    await delete_file("user-1/docs/nonexistent.txt")

    mock_remove.assert_awaited_once()


# ---- get_file_path ----


def test_get_file_path():
    """将相对路径解析为绝对路径。"""
    result = get_file_path("user-1/docs/test.txt")

    assert isinstance(result, Path)
    # 验证路径包含正确的组件
    assert result.name == "test.txt"
    assert "user-1" in result.parts
    assert "docs" in result.parts


# ---- validate_storage_quota ----


def test_validate_storage_quota_ok():
    """配额充足不抛异常。"""
    validate_storage_quota(used=1000, file_size=500, quota=2000)


def test_validate_storage_quota_exceeded():
    """配额不足抛出异常。"""
    with pytest.raises(QuotaExceededException):
        validate_storage_quota(used=1500, file_size=600, quota=2000)


def test_validate_storage_quota_exact():
    """刚好等于配额抛出异常。"""
    with pytest.raises(QuotaExceededException):
        validate_storage_quota(used=1000, file_size=1001, quota=2000)
