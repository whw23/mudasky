"""本地文件存储后端。

使用 asyncio.to_thread 包装同步文件 I/O 操作。
"""

import asyncio
from pathlib import Path

from app.document.storage.base import StorageBackend


class LocalStorage(StorageBackend):
    """本地磁盘文件存储。"""

    def __init__(self, base_dir: str = "/data/uploads") -> None:
        """初始化本地存储。

        Args:
            base_dir: 文件存储根目录。
        """
        self.base_dir = Path(base_dir)

    def _full_path(self, path: str) -> Path:
        """拼接完整文件路径。"""
        return self.base_dir / path

    async def save(self, path: str, data: bytes) -> str:
        """保存文件到本地磁盘。"""
        full_path = self._full_path(path)

        def _write() -> None:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_bytes(data)

        await asyncio.to_thread(_write)
        return str(full_path)

    async def delete(self, path: str) -> None:
        """从本地磁盘删除文件。"""
        full_path = self._full_path(path)

        def _remove() -> None:
            if full_path.exists():
                full_path.unlink()

        await asyncio.to_thread(_remove)

    async def exists(self, path: str) -> bool:
        """检查本地文件是否存在。"""
        full_path = self._full_path(path)
        return await asyncio.to_thread(full_path.exists)
