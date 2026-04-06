"""管理员领域 Pydantic 数据模型。

复用用户领域的数据传输对象。
"""

from app.user.schemas import UserAdminUpdate, UserResponse

__all__ = ["UserAdminUpdate", "UserResponse"]
