"""访客联系业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.contact import repository as contact_repo
from app.db.contact.models import ContactRecord
from app.db.rbac import repository as rbac_repo
from app.db.user import repository as user_repo


class ContactService:
    """访客联系服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_contacts(
        self, offset: int, limit: int
    ) -> tuple[list, int]:
        """查询访客列表（只含 visitor 角色）。"""
        visitor_role = await rbac_repo.get_role_by_name(
            self.session, "visitor"
        )
        if not visitor_role:
            return [], 0
        return await user_repo.list_by_role_and_advisor(
            self.session, visitor_role.id, offset, limit
        )

    async def get_contact(self, user_id: str):
        """获取访客详情。"""
        user = await user_repo.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(
                message="访客不存在", code="CONTACT_NOT_FOUND"
            )
        return user

    async def mark_status(
        self, user_id: str, status: str, staff_id: str
    ) -> None:
        """标记联系状态。"""
        user = await self.get_contact(user_id)
        user.contact_status = status
        await user_repo.update(self.session, user)
        record = ContactRecord(
            user_id=user_id,
            staff_id=staff_id,
            action="mark_" + status,
            note=None,
        )
        await contact_repo.create_record(self.session, record)

    async def add_note(
        self, user_id: str, note: str, staff_id: str
    ) -> None:
        """添加备注。"""
        user = await self.get_contact(user_id)
        user.contact_note = note
        await user_repo.update(self.session, user)
        record = ContactRecord(
            user_id=user_id,
            staff_id=staff_id,
            action="add_note",
            note=note,
        )
        await contact_repo.create_record(self.session, record)

    async def get_history(self, user_id: str):
        """获取联系历史。"""
        return await contact_repo.list_by_user(self.session, user_id)

    async def upgrade_to_student(
        self, user_id: str, staff_id: str
    ) -> None:
        """升为 student 角色。"""
        user = await self.get_contact(user_id)
        student_role = await rbac_repo.get_role_by_name(
            self.session, "student"
        )
        if student_role:
            user.role_id = student_role.id
        await user_repo.update(self.session, user)
        record = ContactRecord(
            user_id=user_id,
            staff_id=staff_id,
            action="upgrade",
        )
        await contact_repo.create_record(self.session, record)
