"""学科分类数据访问层。"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline.models import (
    Discipline,
    DisciplineCategory,
    UniversityDiscipline,
)


# === DisciplineCategory ===

async def create_category(
    session: AsyncSession, category: DisciplineCategory
) -> DisciplineCategory:
    """创建学科大分类。"""
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


async def get_category_by_id(
    session: AsyncSession, category_id: str
) -> DisciplineCategory | None:
    """根据 ID 查询大分类。"""
    return await session.get(DisciplineCategory, category_id)


async def get_category_by_name(
    session: AsyncSession, name: str
) -> DisciplineCategory | None:
    """根据名称查询大分类。"""
    stmt = select(DisciplineCategory).where(
        DisciplineCategory.name == name
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_categories(
    session: AsyncSession,
) -> list[DisciplineCategory]:
    """查询所有大分类，按 sort_order 排序。"""
    stmt = select(DisciplineCategory).order_by(
        DisciplineCategory.sort_order.asc(),
        DisciplineCategory.created_at.asc(),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_category(
    session: AsyncSession, category: DisciplineCategory
) -> DisciplineCategory:
    """更新大分类。"""
    await session.commit()
    await session.refresh(category)
    return category


async def delete_category(
    session: AsyncSession, category: DisciplineCategory
) -> None:
    """删除大分类。"""
    await session.delete(category)
    await session.commit()


async def category_has_disciplines(
    session: AsyncSession, category_id: str
) -> bool:
    """检查大分类下是否有学科。"""
    stmt = (
        select(func.count())
        .select_from(Discipline)
        .where(Discipline.category_id == category_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one() > 0


# === Discipline ===

async def create_discipline(
    session: AsyncSession, discipline: Discipline
) -> Discipline:
    """创建学科。"""
    session.add(discipline)
    await session.commit()
    await session.refresh(discipline)
    return discipline


async def get_discipline_by_id(
    session: AsyncSession, discipline_id: str
) -> Discipline | None:
    """根据 ID 查询学科。"""
    return await session.get(Discipline, discipline_id)


async def get_discipline_by_name(
    session: AsyncSession, category_id: str, name: str
) -> Discipline | None:
    """根据大分类和名称查询学科。"""
    stmt = select(Discipline).where(
        Discipline.category_id == category_id,
        Discipline.name == name,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def list_disciplines(
    session: AsyncSession,
    category_id: str | None = None,
) -> list[Discipline]:
    """查询学科列表，可按大分类筛选。"""
    stmt = select(Discipline)
    if category_id:
        stmt = stmt.where(Discipline.category_id == category_id)
    stmt = stmt.order_by(
        Discipline.sort_order.asc(),
        Discipline.created_at.asc(),
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def update_discipline(
    session: AsyncSession, discipline: Discipline
) -> Discipline:
    """更新学科。"""
    await session.commit()
    await session.refresh(discipline)
    return discipline


async def delete_discipline(
    session: AsyncSession, discipline: Discipline
) -> None:
    """删除学科。"""
    await session.delete(discipline)
    await session.commit()


async def discipline_has_universities(
    session: AsyncSession, discipline_id: str
) -> bool:
    """检查学科是否有院校关联。"""
    stmt = (
        select(func.count())
        .select_from(UniversityDiscipline)
        .where(UniversityDiscipline.discipline_id == discipline_id)
    )
    result = await session.execute(stmt)
    return result.scalar_one() > 0


# === UniversityDiscipline ===

async def set_university_disciplines(
    session: AsyncSession,
    university_id: str,
    discipline_ids: list[str],
) -> None:
    """设置院校的学科关联（全量覆盖）。"""
    await session.execute(
        delete(UniversityDiscipline).where(
            UniversityDiscipline.university_id == university_id
        )
    )
    for discipline_id in discipline_ids:
        session.add(
            UniversityDiscipline(
                university_id=university_id,
                discipline_id=discipline_id,
            )
        )
    await session.commit()


async def get_university_discipline_ids(
    session: AsyncSession, university_id: str
) -> list[str]:
    """获取院校关联的学科 ID 列表。"""
    stmt = select(UniversityDiscipline.discipline_id).where(
        UniversityDiscipline.university_id == university_id
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
