"""合作院校领域数据访问层。

封装所有院校相关的数据库操作。
"""

from sqlalchemy import distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.university.models import University
from app.db.university.image_models import UniversityImage


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
    city: str | None = None,
    is_featured: bool | None = None,
    search: str | None = None,
    program: str | None = None,
) -> tuple[list[University], int]:
    """分页查询院校列表。

    可按国家、城市、推荐状态、关键词和专业过滤。
    返回院校列表和总数。
    """
    conditions = []
    if country:
        conditions.append(University.country == country)
    if city:
        conditions.append(University.city == city)
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
    # Note: program filter removed - now handled via UniversityProgram join

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


async def get_distinct_provinces(
    session: AsyncSession,
    country: str | None = None,
) -> list[str]:
    """获取院校的去重省份列表，可按国家筛选。"""
    stmt = select(distinct(University.province)).where(
        University.province.isnot(None),
        University.province != "",
    )
    if country:
        stmt = stmt.where(University.country == country)
    stmt = stmt.order_by(University.province.asc())
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_distinct_cities(
    session: AsyncSession,
    country: str | None = None,
) -> list[str]:
    """获取院校的去重城市列表，可按国家筛选。"""
    stmt = select(distinct(University.city)).where(
        University.city.isnot(None),
        University.city != "",
    )
    if country:
        stmt = stmt.where(University.country == country)
    stmt = stmt.order_by(University.city.asc())
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


async def list_university_images(
    session: AsyncSession, university_id: str
) -> list[UniversityImage]:
    """获取院校图片集。"""
    stmt = (
        select(UniversityImage)
        .where(UniversityImage.university_id == university_id)
        .order_by(UniversityImage.sort_order.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def count_university_images(
    session: AsyncSession, university_id: str
) -> int:
    """统计院校图片数量。"""
    stmt = (
        select(func.count())
        .select_from(UniversityImage)
        .where(UniversityImage.university_id == university_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one()


async def add_university_image(
    session: AsyncSession, uni_image: UniversityImage
) -> UniversityImage:
    """添加院校图片。"""
    session.add(uni_image)
    await session.commit()
    await session.refresh(uni_image)
    return uni_image


async def delete_university_image(
    session: AsyncSession, uni_image: UniversityImage
) -> None:
    """删除院校图片。"""
    await session.delete(uni_image)
    await session.commit()


async def get_university_image_by_id(
    session: AsyncSession, image_record_id: str
) -> UniversityImage | None:
    """根据 ID 查询院校图片记录。"""
    return await session.get(UniversityImage, image_record_id)
