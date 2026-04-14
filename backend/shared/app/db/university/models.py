"""合作院校领域 ORM 模型。

定义院校表结构。
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class University(Base):
    """合作院校模型。"""

    __tablename__ = "university"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False
    )
    name_en: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    country: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    province: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    city: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    programs: Mapped[list] = mapped_column(
        JSONB, default=list, nullable=False
    )
    website: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
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
