"""内容领域 ORM 模型。

定义分类和文章表结构。
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Category(Base):
    """分类模型。"""

    __tablename__ = "category"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(200), default="", nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Article(Base):
    """文章模型。"""

    __tablename__ = "article"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    title: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    slug: Mapped[str] = mapped_column(
        String(200), unique=True, index=True, nullable=False
    )
    content_type: Mapped[str] = mapped_column(
        String(20), default="html", nullable=False
    )
    content: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    file_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("image.id"),
        nullable=True,
    )
    excerpt: Mapped[str] = mapped_column(
        String(500), default="", nullable=False
    )
    cover_image: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    author_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), default="draft", nullable=False
    )
    is_pinned: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    view_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
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
