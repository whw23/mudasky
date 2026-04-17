/**
 * E2E 任务队列框架类型定义。
 */

import type { Page } from "@playwright/test"

/** 任务执行函数。 */
export type TaskFn = (page: Page, args?: Record<string, unknown>) => Promise<void>

/** 信号文件状态。 */
export type SignalStatus = "running" | "pass" | "fail" | "breaker" | "timeout"

/** 信号文件内容。 */
export interface Signal {
  status: SignalStatus
  worker?: string
  data?: Record<string, unknown>
  error?: string
  cause?: string
  timestamp: number
}

/** 覆盖率声明。 */
export interface CoverageDecl {
  routes?: string[]
  api?: string[]
  components?: [string, string][]
  security?: [string, string][]
}

/** 任务定义。 */
export interface Task {
  /** 唯一标识，如 "w2_register" */
  id: string
  /** 描述，如 "自注册" */
  name: string
  /** 主 worker，如 "w1" */
  worker: string
  /** 备选 worker 列表（空 = 不可被偷） */
  backupWorkers?: string[]
  /** 前置条件（信号 ID 列表） */
  requires: string[]
  /** 执行函数 */
  fn: TaskFn
  /** 执行参数（传给 fn） */
  fnArgs?: Record<string, unknown>
  /** 覆盖率声明 */
  coverage?: CoverageDecl
}

/** 任务运行时状态。 */
export type TaskStatus = "pending" | "running" | "pass" | "fail" | "breaker" | "timeout"

/** 任务运行时记录。 */
export interface TaskRecord {
  task: Task
  status: TaskStatus
  error?: string
  cause?: string
}

/** 运行结果汇总。 */
export interface RunSummary {
  [taskId: string]: SignalStatus
}
