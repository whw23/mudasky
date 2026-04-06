"""任务队列操作。

提供任务入队、出队、完成、失败等核心函数。
使用 SELECT FOR UPDATE SKIP LOCKED 实现并发安全的 FIFO 队列。
"""

import json
from datetime import datetime, timezone

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.worker.models import Task


async def enqueue(
    session: AsyncSession,
    task_type: str,
    payload: dict,
) -> Task:
    """将任务加入队列。

    Args:
        session: 数据库会话。
        task_type: 任务类型标识。
        payload: 任务参数字典，序列化为 JSON 存储。

    Returns:
        创建的任务实例。
    """
    task = Task(
        task_type=task_type,
        payload=json.dumps(payload, ensure_ascii=False),
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def dequeue(session: AsyncSession) -> Task | None:
    """从队列中取出一个待处理任务。

    使用 SELECT FOR UPDATE SKIP LOCKED 保证并发安全，
    按创建时间 FIFO 顺序取出，并将状态设为 running。

    Returns:
        取出的任务实例，队列为空时返回 None。
    """
    stmt = (
        select(Task)
        .where(Task.status == "pending")
        .order_by(Task.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    result = await session.execute(stmt)
    task = result.scalar_one_or_none()

    if task is None:
        return None

    task.status = "running"
    task.started_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(task)
    return task


async def complete(
    session: AsyncSession, task: Task, result: dict
) -> Task:
    """标记任务完成。

    Args:
        session: 数据库会话。
        task: 任务实例。
        result: 任务执行结果字典。

    Returns:
        更新后的任务实例。
    """
    task.status = "completed"
    task.result = json.dumps(result, ensure_ascii=False)
    task.completed_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(task)
    return task


async def fail(
    session: AsyncSession, task: Task, error: str
) -> Task:
    """标记任务失败。

    Args:
        session: 数据库会话。
        task: 任务实例。
        error: 错误信息。

    Returns:
        更新后的任务实例。
    """
    task.status = "failed"
    task.error = error
    task.completed_at = datetime.now(timezone.utc)
    task.retry_count += 1
    await session.commit()
    await session.refresh(task)
    return task
