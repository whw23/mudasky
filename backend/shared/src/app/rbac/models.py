"""RBAC 权限领域 ORM 模型。

定义权限、权限组模型，实现基于权限组的访问控制。
关联关系在本模块底部统一配置，避免循环导入。
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.rbac.tables import group_permission, user_group


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
    description: Mapped[str] = mapped_column(
        String(200), nullable=False
    )


class PermissionGroup(Base):
    """权限组模型。"""

    __tablename__ = "permission_group"

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
    is_system: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    auto_include_all: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
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

    permissions: Mapped[list["Permission"]] = relationship(
        "Permission",
        secondary=group_permission,
        lazy="selectin",
    )
    users: Mapped[list["User"]] = relationship(
        "User",
        secondary=user_group,
        back_populates="groups",
        lazy="selectin",
    )


# 在两个类都定义后，将 groups 关系注入到 User 模型
from app.user.models import User  # noqa: E402

User.groups = relationship(
    "PermissionGroup",
    secondary=user_group,
    back_populates="users",
    lazy="selectin",
)
