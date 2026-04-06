"""文档领域 ORM 模型。

定义文档表结构，包含文件名、路径、哈希、MIME 类型等字段。
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Document(Base):
    """文档模型。"""

    __tablename__ = "document"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    file_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    file_path: Mapped[str] = mapped_column(
        String(500), nullable=False
    )
    file_hash: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
    )
    mime_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    uploader_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        nullable=True,
    )
