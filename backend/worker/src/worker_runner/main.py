"""Worker 入口。

单线程消费循环，从 PostgreSQL 任务队列抢占任务并执行。
"""

import asyncio
import logging

from app.core.database import async_session_factory
from app.core.logging import setup_logging
from app.worker import queue

logger = logging.getLogger(__name__)

POLL_INTERVAL = 5


async def process_task(task) -> str:
    """处理单个任务。

    TODO: 后期根据 task.task_type 分发到具体的 Agent 处理逻辑。
    """
    logger.info("开始处理任务", extra={
        "task_id": str(task.id), "type": task.task_type
    })
    return '{"status": "done"}'


async def run() -> None:
    """Worker 主循环。"""
    logger.info("Worker 启动")
    while True:
        async with async_session_factory() as session:
            task = await queue.dequeue(session)
            if task is None:
                await session.commit()
                await asyncio.sleep(POLL_INTERVAL)
                continue
            try:
                result = await process_task(task)
                await queue.complete(session, task, result)
                logger.info("任务完成", extra={"task_id": str(task.id)})
            except Exception as e:
                await queue.fail(session, task, str(e))
                logger.error("任务失败", extra={
                    "task_id": str(task.id), "error": str(e)
                })
            await session.commit()


def main() -> None:
    """入口函数。"""
    setup_logging()
    asyncio.run(run())


if __name__ == "__main__":
    main()
