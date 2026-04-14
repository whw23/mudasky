"""RBAC 关联表定义。

独立定义关联表，避免循环导入问题。
"""

from sqlalchemy import Column, ForeignKey, String, Table

from app.db import Base

# 角色-权限关联表
role_permission = Table(
    "role_permission",
    Base.metadata,
    Column(
        "role_id",
        String(36),
        ForeignKey("role.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "permission_id",
        String(36),
        ForeignKey("permission.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)
