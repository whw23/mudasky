"""学科分类 ORM 模型。包含大分类、学科、院校-学科关联。"""

import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class DisciplineCategory(Base):
    """学科大分类。"""

    __tablename__ = "discipline_category"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
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


class Discipline(Base):
    """学科。"""

    __tablename__ = "discipline"
    __table_args__ = (
        UniqueConstraint(
            "category_id", "name", name="uq_discipline_category_name"
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    category_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("discipline_category.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False
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


class UniversityDiscipline(Base):
    """院校-学科多对多关联。"""

    __tablename__ = "university_discipline"

    university_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("university.id", ondelete="CASCADE"),
        primary_key=True,
    )
    discipline_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("discipline.id", ondelete="CASCADE"),
        primary_key=True,
    )
