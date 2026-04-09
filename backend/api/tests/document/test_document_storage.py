"""document/storage 单元测试。

测试 StorageBackend 抽象基类和 LocalStorage 本地文件存储实现。
使用临时目录进行真实文件操作测试。
"""

import pytest

from app.document.storage.base import StorageBackend
from app.document.storage.local import LocalStorage


# ---- StorageBackend 抽象类 ----


def test_storage_backend_is_abstract():
    """StorageBackend 不能直接实例化。"""
    with pytest.raises(TypeError):
        StorageBackend()


def test_storage_backend_subclass():
    """验证 StorageBackend 可被正确继承。"""

    class DummyStorage(StorageBackend):
        """测试用存储实现。"""

        async def save(self, path: str, data: bytes) -> str:
            """保存文件。"""
            return path

        async def delete(self, path: str) -> None:
            """删除文件。"""
            pass

        async def exists(self, path: str) -> bool:
            """检查文件是否存在。"""
            return True

    storage = DummyStorage()
    assert isinstance(storage, StorageBackend)


# ---- LocalStorage ----


@pytest.fixture
def local_storage(tmp_path) -> LocalStorage:
    """创建使用临时目录的 LocalStorage 实例。"""
    return LocalStorage(base_dir=str(tmp_path))


async def test_local_storage_save(local_storage, tmp_path):
    """保存文件到本地磁盘。"""
    data = b"hello world"

    result = await local_storage.save("test/file.txt", data)

    assert result == str(tmp_path / "test" / "file.txt")
    saved = (tmp_path / "test" / "file.txt").read_bytes()
    assert saved == data


async def test_local_storage_save_creates_dirs(
    local_storage, tmp_path
):
    """保存文件时自动创建目录。"""
    data = b"content"

    await local_storage.save("a/b/c/file.txt", data)

    assert (tmp_path / "a" / "b" / "c" / "file.txt").exists()


async def test_local_storage_delete(local_storage, tmp_path):
    """从本地磁盘删除文件。"""
    # 先创建文件
    file_path = tmp_path / "to_delete.txt"
    file_path.write_bytes(b"data")

    await local_storage.delete("to_delete.txt")

    assert not file_path.exists()


async def test_local_storage_delete_not_found(local_storage):
    """删除不存在的文件不抛异常。"""
    await local_storage.delete("nonexistent.txt")


async def test_local_storage_exists_true(
    local_storage, tmp_path
):
    """检查存在的文件。"""
    file_path = tmp_path / "exists.txt"
    file_path.write_bytes(b"data")

    result = await local_storage.exists("exists.txt")

    assert result is True


async def test_local_storage_exists_false(local_storage):
    """检查不存在的文件。"""
    result = await local_storage.exists("nonexistent.txt")

    assert result is False


async def test_local_storage_full_path(local_storage, tmp_path):
    """验证路径拼接。"""
    full = local_storage._full_path("user/doc.pdf")

    assert full == tmp_path / "user" / "doc.pdf"
