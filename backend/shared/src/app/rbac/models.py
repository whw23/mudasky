"""RBAC 权限领域 ORM 模型。

定义权限、角色模型，实现基于角色的访问控制。
关联关系在本模块底部统一配置，避免循环导入。
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.rbac.tables import role_permission


class Permission(Base):
    """权限模型。"""

    __tablename__ = "permission"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    code: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    name_key: Mapped[str] = mapped_column(
        String(100), nullable=False, default=""
    )
    description: Mapped[str] = mapped_column(
        String(200), nullable=False
    )


class Role(Base):
    """角色模型。"""

    __tablename__ = "role"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(
        String(200), nullable=False, default=""
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
    is_builtin: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    permissions: Mapped[list["Permission"]] = relationship(
        "Permission",
        secondary=role_permission,
        lazy="selectin",
    )
