"""成功案例领域 ORM 模型。

定义成功案例表结构。
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SuccessCase(Base):
    """成功案例模型。"""

    __tablename__ = "success_case"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    student_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    university: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    program: Mapped[str] = mapped_column(
        String(200), nullable=False
    )
    year: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    testimonial: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    avatar_url: Mapped[str | None] = mapped_column(
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
