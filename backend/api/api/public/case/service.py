"""成功案例公开业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.db.case import repository
from app.db.case.models import SuccessCase
from app.db.university import repository as university_repo


class CaseService:
    """成功案例公开服务（只读）。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def get_case(self, case_id: str) -> SuccessCase:
        """获取成功案例详情，不存在则抛出异常。"""
        case = await repository.get_case_by_id(
            self.session, case_id
        )
        if not case:
            raise NotFoundException(message="案例不存在", code="CASE_NOT_FOUND")
        return case

    async def list_cases(
        self,
        offset: int,
        limit: int,
        year: int | None = None,
        featured: bool | None = None,
    ) -> tuple[list[SuccessCase], int]:
        """分页查询成功案例。"""
        return await repository.list_cases(
            self.session, offset, limit, year, featured
        )
