"""存储后端抽象基类。

定义文件存储的统一接口，支持不同存储实现（本地、云存储等）。
"""

from abc import ABC, abstractmethod


class StorageBackend(ABC):
    """文件存储后端抽象类。"""

    @abstractmethod
    async def save(self, path: str, data: bytes) -> str:
        """保存文件。

        Args:
            path: 文件存储路径。
            data: 文件二进制数据。

        Returns:
            实际存储路径。
        """

    @abstractmethod
    async def delete(self, path: str) -> None:
        """删除文件。

        Args:
            path: 文件存储路径。
        """

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """检查文件是否存在。

        Args:
            path: 文件存储路径。

        Returns:
            文件是否存在。
        """
