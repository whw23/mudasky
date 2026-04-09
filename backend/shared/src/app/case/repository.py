"""成功案例领域数据访问层。

封装所有成功案例相关的数据库操作。
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.case.models import SuccessCase


async def create_case(
    session: AsyncSession, case: SuccessCase
) -> SuccessCase:
    """创建成功案例。"""
    session.add(case)
    await session.commit()
    await session.refresh(case)
    return case


async def get_case_by_id(
    session: AsyncSession, case_id: str
) -> SuccessCase | None:
    """根据 ID 查询成功案例。"""
    return await session.get(SuccessCase, case_id)


async def update_case(
    session: AsyncSession, case: SuccessCase
) -> SuccessCase:
    """更新成功案例。"""
    await session.commit()
    await session.refresh(case)
    return case


async def delete_case(
    session: AsyncSession, case: SuccessCase
) -> None:
    """删除成功案例。"""
    await session.delete(case)
    await session.commit()


async def list_cases(
    session: AsyncSession,
    offset: int,
    limit: int,
    year: int | None = None,
    featured: bool | None = None,
) -> tuple[list[SuccessCase], int]:
    """分页查询成功案例。

    可按年份和推荐状态过滤。返回案例列表和总数。
    """
    conditions = []
    if year is not None:
        conditions.append(SuccessCase.year == year)
    if featured is not None:
        conditions.append(SuccessCase.is_featured == featured)

    base_filter = True  # noqa: E712
    for cond in conditions:
        base_filter = base_filter & cond

    count_stmt = (
        select(func.count())
        .select_from(SuccessCase)
        .where(base_filter)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(SuccessCase)
        .where(base_filter)
        .order_by(
            SuccessCase.is_featured.desc(),
            SuccessCase.sort_order.asc(),
            SuccessCase.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    cases = list(result.scalars().all())

    return cases, total
