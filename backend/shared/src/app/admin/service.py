"""管理员领域业务逻辑层。

对 UserService 的薄封装，提供管理员专用操作。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.user import repository as user_repo
from app.user.models import User
from app.user.schemas import UserAdminUpdate


class AdminService:
    """管理员业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def list_users(
        self, offset: int, limit: int
    ) -> tuple[list[User], int]:
        """分页查询所有用户。"""
        return await user_repo.list_users(
            self.session, offset, limit
        )

    async def update_user(
        self, user_id: str, data: UserAdminUpdate
    ) -> User:
        """管理员更新用户信息（激活状态、用户类型、配额）。"""
        user = await user_repo.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(message="用户不存在")

        if data.is_active is not None:
            user.is_active = data.is_active
        if data.user_type is not None:
            user.user_type = data.user_type
        if data.storage_quota is not None:
            user.storage_quota = data.storage_quota

        return await user_repo.update(self.session, user)
