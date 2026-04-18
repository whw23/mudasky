"""学生管理业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.document import repository as doc_repo
from app.db.rbac import repository as rbac_repo
from app.db.user import repository as user_repo


class StudentService:
    """学生管理服务。"""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_advisors(self) -> list:
        """查询所有顾问角色用户（用于下拉选择）。"""
        advisor_role = await rbac_repo.get_role_by_name(
            self.session, "advisor"
        )
        if not advisor_role:
            return []
        users, _ = await user_repo.list_by_role_and_advisor(
            self.session, advisor_role.id, 0, 100, None
        )
        return users

    async def list_students(
        self,
        offset: int,
        limit: int,
        advisor_id: str | None = None,
    ) -> tuple[list, int]:
        """查询学生列表（只含 student 角色）。"""
        student_role = await rbac_repo.get_role_by_name(
            self.session, "student"
        )
        if not student_role:
            return [], 0
        return await user_repo.list_by_role_and_advisor(
            self.session, student_role.id, offset, limit, advisor_id
        )

    async def get_student(self, user_id: str):
        """获取学生详情。"""
        user = await user_repo.get_by_id(self.session, user_id)
        if not user:
            raise NotFoundException(
                message="学生不存在", code="STUDENT_NOT_FOUND"
            )
        return user

    async def edit_student(
        self, user_id: str, is_active=None, contact_note=None
    ):
        """编辑学生信息。"""
        user = await self.get_student(user_id)
        if is_active is not None:
            user.is_active = is_active
        if contact_note is not None:
            user.contact_note = contact_note
        return await user_repo.update(self.session, user)

    async def assign_advisor(
        self, user_id: str, advisor_id: str | None
    ) -> None:
        """指定负责顾问。"""
        user = await self.get_student(user_id)
        user.advisor_id = advisor_id
        await user_repo.update(self.session, user)

    async def downgrade_to_visitor(self, user_id: str) -> None:
        """降为 visitor 角色。"""
        user = await self.get_student(user_id)
        visitor_role = await rbac_repo.get_role_by_name(
            self.session, "visitor"
        )
        if visitor_role:
            user.role_id = visitor_role.id
        user.advisor_id = None
        await user_repo.update(self.session, user)

    async def list_student_documents(
        self, user_id: str, offset: int, limit: int
    ):
        """查询学生的文件列表。"""
        return await doc_repo.list_by_user(
            self.session, user_id, offset, limit
        )

    async def get_student_document(self, doc_id: str):
        """获取学生文件详情。"""
        doc = await doc_repo.get_by_id(self.session, doc_id)
        if not doc:
            raise NotFoundException(
                message="文件不存在", code="DOCUMENT_NOT_FOUND"
            )
        return doc
