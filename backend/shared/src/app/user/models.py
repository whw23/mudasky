"""用户领域 ORM 模型。

定义用户表结构，包含手机号、用户名、密码、双因素认证等字段。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from app.rbac.models import PermissionGroup

from app.core.config import settings
from app.core.database import Base


class User(Base):
    """用户模型。"""

    __tablename__ = "user"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), unique=True, index=True, nullable=True
    )
    username: Mapped[str | None] = mapped_column(
        String(50), unique=True, index=True, nullable=True
    )
    password_hash: Mapped[str | None] = mapped_column(
        String(128), nullable=True
    )
    two_factor_enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    two_factor_method: Mapped[str | None] = mapped_column(
        String(10), nullable=True, comment="totp 或 sms"
    )
    totp_secret: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    user_type: Mapped[str] = mapped_column(
        String(10), default="guest", nullable=False
    )
    group_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("permission_group.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    group: Mapped["PermissionGroup | None"] = relationship(
        "PermissionGroup", lazy="selectin"
    )
    storage_quota: Mapped[int] = mapped_column(
        Integer,
        default=settings.default_storage_quota_bytes,
        nullable=False,
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
