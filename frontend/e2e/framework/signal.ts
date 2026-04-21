/**
 * 跨 worker 信号协调（SQLite）。
 */

import Database from "better-sqlite3"
import * as path from "path"
import * as fs from "fs"
import type { Signal, SignalStatus } from "./types"

const E2E_RUNTIME_DIR =
  process.env.E2E_RUNTIME_DIR || path.join(process.cwd(), "test-results", "e2e-runtime")

const DB_PATH = path.join(E2E_RUNTIME_DIR, "signals.db")

let _db: Database.Database | null = null

/** 获取数据库实例（单例）。 */
function getDb(): Database.Database {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
    _db = new Database(DB_PATH)
    _db.pragma("journal_mode = WAL")
    _db.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        task_id TEXT PRIMARY KEY,
        worker TEXT NOT NULL,
        status TEXT NOT NULL,
        data TEXT,
        error TEXT,
        cause TEXT,
        timestamp REAL NOT NULL DEFAULT (unixepoch('subsec'))
      )
    `)
  }
  return _db
}

/** 初始化信号数据库（清空所有信号）。 */
export function initSignalDb(): void {
  const db = getDb()
  db.exec("DELETE FROM signals")
}

/**
 * 尝试抢占任务（原子插入）。
 * 返回 true 表示抢到，false 表示已被其他 worker 抢占。
 */
export function claimTask(taskId: string, worker: string): boolean {
  const db = getDb()
  try {
    db.prepare("INSERT INTO signals (task_id, worker, status) VALUES (?, ?, 'running')").run(
      taskId,
      worker,
    )
    return true
  } catch {
    return false
  }
}

/** 写入任务结果。 */
export function writeSignal(
  taskId: string,
  status: SignalStatus,
  opts?: { data?: Record<string, unknown>; error?: string; cause?: string; worker?: string },
): void {
  const db = getDb()
  db.prepare(
    `
    INSERT INTO signals (task_id, worker, status, data, error, cause)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id) DO UPDATE SET
      status = excluded.status,
      data = excluded.data,
      error = excluded.error,
      cause = excluded.cause,
      timestamp = unixepoch('subsec')
  `,
  ).run(
    taskId,
    opts?.worker || "",
    status,
    opts?.data ? JSON.stringify(opts.data) : null,
    opts?.error || null,
    opts?.cause || null,
  )
}

/**
 * 检查前置条件。
 * 返回 "all_pass" | "any_fail" | "not_ready"。
 */
export function checkRequires(requires: string[]): {
  result: "all_pass" | "any_fail" | "not_ready"
  failedCause?: string
  data?: Record<string, Record<string, unknown>>
} {
  if (requires.length === 0) return { result: "all_pass", data: {} }

  const db = getDb()
  const placeholders = requires.map(() => "?").join(",")
  const rows = db
    .prepare(`SELECT task_id, status, data FROM signals WHERE task_id IN (${placeholders})`)
    .all(...requires) as { task_id: string; status: string; data: string | null }[]

  const found = new Map(rows.map((r) => [r.task_id, r]))
  const collectedData: Record<string, Record<string, unknown>> = {}

  for (const reqId of requires) {
    const signal = found.get(reqId)
    if (!signal) return { result: "not_ready" }
    if (signal.status === "running") return { result: "not_ready" }
    if (signal.status === "fail" || signal.status === "breaker" || signal.status === "timeout") {
      return { result: "any_fail", failedCause: `前置任务 ${reqId} 失败` }
    }
    if (signal.data) {
      collectedData[reqId] = JSON.parse(signal.data)
    }
  }

  return { result: "all_pass", data: collectedData }
}

/** 读取单个信号，不存在返回 null。 */
export function readSignal(taskId: string): Signal | null {
  const db = getDb()
  const row = db
    .prepare("SELECT * FROM signals WHERE task_id = ?")
    .get(taskId) as {
    task_id: string
    worker: string
    status: string
    data: string | null
    error: string | null
    cause: string | null
    timestamp: number
  } | undefined

  if (!row) return null

  return {
    status: row.status as SignalStatus,
    worker: row.worker,
    data: row.data ? JSON.parse(row.data) : undefined,
    error: row.error || undefined,
    cause: row.cause || undefined,
    timestamp: row.timestamp,
  }
}

/** 获取所有信号，用于汇总结果。 */
export function getAllSignals(): Record<string, Signal> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM signals").all() as {
    task_id: string
    worker: string
    status: string
    data: string | null
    error: string | null
    cause: string | null
    timestamp: number
  }[]
  const result: Record<string, Signal> = {}
  for (const row of rows) {
    result[row.task_id] = {
      status: row.status as SignalStatus,
      worker: row.worker,
      data: row.data ? JSON.parse(row.data) : undefined,
      error: row.error || undefined,
      cause: row.cause || undefined,
      timestamp: row.timestamp,
    }
  }
  return result
}

/** 关闭数据库连接。 */
export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
