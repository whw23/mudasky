"""文档领域 ORM 模型。

定义文档表结构，包含文件名、路径、分类、MIME 类型等字段。
"""

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DocumentCategory(str, enum.Enum):
    """文档分类枚举。"""

    TRANSCRIPT = "transcript"
    CERTIFICATE = "certificate"
    PASSPORT = "passport"
    LANGUAGE_TEST = "language_test"
    APPLICATION = "application"
    OTHER = "other"


class Document(Base):
    """文档模型。"""

    __tablename__ = "document"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    original_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    file_data: Mapped[bytes] = mapped_column(
        LargeBinary, nullable=False, doc="文件二进制数据"
    )
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    mime_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    category: Mapped[DocumentCategory] = mapped_column(
        Enum(DocumentCategory, name="document_category"),
        default=DocumentCategory.OTHER,
        nullable=False,
    )
    file_hash: Mapped[str] = mapped_column(
        String(64), index=True, nullable=False
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
