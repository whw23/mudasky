"""合作院校领域数据访问层。

封装所有院校相关的数据库操作。
"""

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.university.models import University


async def create_university(
    session: AsyncSession, university: University
) -> University:
    """创建院校。"""
    session.add(university)
    await session.commit()
    await session.refresh(university)
    return university


async def get_university_by_id(
    session: AsyncSession, university_id: str
) -> University | None:
    """根据 ID 查询院校。"""
    return await session.get(University, university_id)


async def list_universities(
    session: AsyncSession,
    offset: int,
    limit: int,
    country: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    program: str | None = None,
) -> tuple[list[University], int]:
    """分页查询院校列表。

    可按国家、推荐状态、关键词和专业过滤。
    返回院校列表和总数。
    """
    conditions = []
    if country:
        conditions.append(University.country == country)
    if is_featured is not None:
        conditions.append(
            University.is_featured == is_featured
        )
    if search:
        pattern = f"%{search}%"
        conditions.append(
            or_(
                University.name.ilike(pattern),
                University.name_en.ilike(pattern),
                University.city.ilike(pattern),
                University.description.ilike(pattern),
            )
        )
    if program:
        conditions.append(
            University.programs.op("@>")(
                func.cast(
                    f'["{program}"]',
                    University.programs.type,
                )
            )
        )

    base_filter = True  # noqa: E712
    if conditions:
        base_filter = conditions[0]
        for cond in conditions[1:]:
            base_filter = base_filter & cond

    count_stmt = (
        select(func.count())
        .select_from(University)
        .where(base_filter)
    )
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(University)
        .where(base_filter)
        .order_by(
            University.sort_order.asc(),
            University.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    result = await session.execute(stmt)
    universities = list(result.scalars().all())

    return universities, total


async def get_distinct_countries(
    session: AsyncSession,
) -> list[str]:
    """获取所有院校的去重国家列表。"""
    stmt = (
        select(distinct(University.country))
        .order_by(University.country.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_university(
    session: AsyncSession, university: University
) -> University:
    """更新院校。"""
    await session.commit()
    await session.refresh(university)
    return university


async def delete_university(
    session: AsyncSession, university: University
) -> None:
    """删除院校。"""
    await session.delete(university)
    await session.commit()
