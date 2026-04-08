"""本地文件存储后端。

使用 aiofiles 进行异步文件 I/O 操作。
"""

import logging
from pathlib import Path

import aiofiles
import aiofiles.os

from app.document.storage.base import StorageBackend

logger = logging.getLogger(__name__)


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
        await aiofiles.os.makedirs(
            full_path.parent, exist_ok=True
        )
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(data)
        return str(full_path)

    async def delete(self, path: str) -> None:
        """从本地磁盘删除文件。"""
        full_path = self._full_path(path)
        try:
            await aiofiles.os.remove(str(full_path))
        except FileNotFoundError:
            logger.warning("文件不存在，跳过删除: %s", path)

    async def exists(self, path: str) -> bool:
        """检查本地文件是否存在。"""
        full_path = self._full_path(path)
        return await aiofiles.os.path.exists(str(full_path))
