"""成功案例领域业务逻辑层。

处理成功案例的增删改查业务。
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.case import repository
from app.case.models import SuccessCase
from app.case.schemas import CaseCreate, CaseUpdate
from app.core.exceptions import NotFoundException


class CaseService:
    """成功案例业务服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def create_case(
        self, data: CaseCreate
    ) -> SuccessCase:
        """创建成功案例。"""
        case = SuccessCase(
            student_name=data.student_name,
            university=data.university,
            program=data.program,
            year=data.year,
            testimonial=data.testimonial,
            avatar_url=data.avatar_url,
            is_featured=data.is_featured,
            sort_order=data.sort_order,
        )
        return await repository.create_case(
            self.session, case
        )

    async def get_case(self, case_id: str) -> SuccessCase:
        """获取成功案例详情，不存在则抛出异常。"""
        case = await repository.get_case_by_id(
            self.session, case_id
        )
        if not case:
            raise NotFoundException(message="案例不存在")
        return case

    async def update_case(
        self, case_id: str, data: CaseUpdate
    ) -> SuccessCase:
        """更新成功案例。"""
        case = await self.get_case(case_id)
        self._apply_update(case, data)
        return await repository.update_case(
            self.session, case
        )

    async def delete_case(self, case_id: str) -> None:
        """删除成功案例。"""
        case = await self.get_case(case_id)
        await repository.delete_case(self.session, case)

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

    def _apply_update(
        self, case: SuccessCase, data: CaseUpdate
    ) -> None:
        """将更新数据应用到案例模型。"""
        if data.student_name is not None:
            case.student_name = data.student_name
        if data.university is not None:
            case.university = data.university
        if data.program is not None:
            case.program = data.program
        if data.year is not None:
            case.year = data.year
        if data.testimonial is not None:
            case.testimonial = data.testimonial
        if data.avatar_url is not None:
            case.avatar_url = data.avatar_url
        if data.is_featured is not None:
            case.is_featured = data.is_featured
        if data.sort_order is not None:
            case.sort_order = data.sort_order
