/**
 * 任务队列调度器。
 * 循环遍历任务列表,按前置条件非阻塞执行。
 */

import type { Page } from "@playwright/test"
import type { Task, TaskRecord, TaskStatus } from "./types"
import { claimTask, writeSignal, checkRequires, readSignal } from "./signal"

/** 总超时:10 分钟。 */
const TOTAL_TIMEOUT = 10 * 60 * 1000
/** 无任务可做时的等待间隔。 */
const POLL_INTERVAL = 2000

/** 加载所有 worker 的任务(用于备选 worker 偷取)。 */
function loadAllTasks(): Task[] {
  const all: Task[] = []
  for (let i = 1; i <= 7; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`../w${i}/tasks`)
      all.push(...(mod.tasks || []))
    } catch {
      /* worker 目录不存在则跳过 */
    }
  }
  return all
}

export class TaskRunner {
  private records: TaskRecord[]
  private workerName: string
  private page: Page
  private startTime: number = 0

  constructor(tasks: Task[], workerName: string, page: Page) {
    this.records = tasks.map((task) => ({ task, status: "pending" as TaskStatus }))
    this.workerName = workerName
    this.page = page
  }

  /** 运行任务队列。 */
  async run(): Promise<TaskRecord[]> {
    this.startTime = Date.now()

    while (true) {
      if (this.isTimedOut()) {
        this.markRemainingTimeout()
        break
      }

      // Phase 1: 执行自己绑定的任务
      const ownResult = await this.tryOwnTasks()
      if (ownResult === "executed") continue
      if (ownResult === "all_done") {
        // Phase 2: 偷取备选任务
        const stealResult = await this.tryStealTasks()
        if (stealResult === "executed") continue
      }

      // Phase 3: 没有能做的任务
      if (this.isAllDone()) break
      await this.sleep(POLL_INTERVAL)
    }

    return this.records
  }

  /** 尝试执行自己的任务。 */
  private async tryOwnTasks(): Promise<"executed" | "all_done" | "waiting"> {
    let allDone = true
    for (const record of this.records) {
      if (record.status !== "pending") continue
      allDone = false

      const check = checkRequires(record.task.requires)

      if (check.result === "any_fail") {
        record.status = "breaker"
        record.cause = check.failedCause
        writeSignal(record.task.id, "breaker", {
          worker: this.workerName,
          cause: check.failedCause,
        })
        return "executed"
      }

      if (check.result === "all_pass") {
        await this.executeTask(record)
        return "executed"
      }

      // not_ready → 继续检查下一个任务
    }
    return allDone ? "all_done" : "waiting"
  }

  /** 尝试偷取备选任务。 */
  private async tryStealTasks(): Promise<"executed" | "none"> {
    const allTasks = loadAllTasks()
    for (const task of allTasks) {
      if (task.worker === this.workerName) continue
      if (!task.backupWorkers?.includes(this.workerName)) continue

      // 检查是否已被执行
      const existing = readSignal(task.id)
      if (existing) continue

      // 检查前置条件
      const check = checkRequires(task.requires)
      if (check.result !== "all_pass") continue

      // 尝试抢占
      if (!claimTask(task.id, this.workerName)) continue

      // 执行
      try {
        await task.fn(this.page, task.fnArgs)
        writeSignal(task.id, "pass", { worker: this.workerName })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        writeSignal(task.id, "fail", { worker: this.workerName, error: msg })
      }
      return "executed"
    }
    return "none"
  }

  /** 执行单个任务。 */
  private async executeTask(record: TaskRecord): Promise<void> {
    // 抢占(防止备选 worker 同时执行)
    if (!claimTask(record.task.id, this.workerName)) {
      // 已被其他 worker 抢占,读取其结果
      const signal = readSignal(record.task.id)
      record.status = (signal?.status as TaskStatus) || "pass"
      return
    }

    record.status = "running"
    try {
      await record.task.fn(this.page, record.task.fnArgs)
      record.status = "pass"
      writeSignal(record.task.id, "pass", { worker: this.workerName })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      record.status = "fail"
      record.error = msg
      writeSignal(record.task.id, "fail", { worker: this.workerName, error: msg })
    }
  }

  /** 检查是否所有任务都完成。 */
  private isAllDone(): boolean {
    return this.records.every((r) => r.status !== "pending")
  }

  /** 检查是否超时。 */
  private isTimedOut(): boolean {
    return Date.now() - this.startTime > TOTAL_TIMEOUT
  }

  /** 标记剩余 pending 任务为 timeout。 */
  private markRemainingTimeout(): void {
    for (const record of this.records) {
      if (record.status === "pending") {
        record.status = "timeout"
        writeSignal(record.task.id, "timeout", { worker: this.workerName })
      }
    }
  }

  /** 等待。 */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
