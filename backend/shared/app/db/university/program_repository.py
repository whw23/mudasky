"""院校专业数据访问。"""

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .program_models import UniversityProgram


async def list_programs(session: AsyncSession, university_id: str) -> list[UniversityProgram]:
    """获取院校的所有专业。"""
    stmt = (
        select(UniversityProgram)
        .where(UniversityProgram.university_id == university_id)
        .order_by(UniversityProgram.sort_order)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def create_program(
    session: AsyncSession,
    university_id: str,
    name: str,
    discipline_id: str,
    sort_order: int = 0,
) -> UniversityProgram:
    """创建专业。"""
    program = UniversityProgram(
        id=str(uuid.uuid4()),
        university_id=university_id,
        name=name,
        discipline_id=discipline_id,
        sort_order=sort_order,
    )
    session.add(program)
    await session.flush()
    return program


async def delete_program(session: AsyncSession, program_id: str) -> None:
    """删除专业。"""
    stmt = delete(UniversityProgram).where(UniversityProgram.id == program_id)
    await session.execute(stmt)


async def replace_programs(
    session: AsyncSession,
    university_id: str,
    programs: list[dict],
) -> list[UniversityProgram]:
    """替换院校的所有专业。"""
    stmt = delete(UniversityProgram).where(
        UniversityProgram.university_id == university_id
    )
    await session.execute(stmt)

    result = []
    for i, p in enumerate(programs):
        prog = UniversityProgram(
            id=str(uuid.uuid4()),
            university_id=university_id,
            name=p["name"],
            discipline_id=p["discipline_id"],
            sort_order=i,
        )
        session.add(prog)
        result.append(prog)
    await session.flush()
    return result
