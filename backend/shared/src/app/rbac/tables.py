"""RBAC 关联表定义。

独立定义关联表，避免循环导入问题。
User 和 PermissionGroup 模型均引用这些表。
"""

from sqlalchemy import Column, ForeignKey, String, Table

from app.core.database import Base

# 权限组-权限关联表
group_permission = Table(
    "group_permission",
    Base.metadata,
    Column(
        "group_id",
        String(36),
        ForeignKey("permission_group.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        String(36),
        ForeignKey("permission.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)

# 用户-权限组关联表
user_group = Table(
    "user_group",
    Base.metadata,
    Column(
        "user_id",
        String(36),
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "group_id",
        String(36),
        ForeignKey("permission_group.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
