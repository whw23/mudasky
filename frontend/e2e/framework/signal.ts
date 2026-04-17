/**
 * 信号文件读写。
 * 使用 wx（O_CREAT | O_EXCL）原子创建，防止竞态。
 */

import * as fs from "fs"
import * as path from "path"
import type { Signal, SignalStatus } from "./types"

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 确保信号目录存在。 */
export function ensureSignalDir(): void {
  fs.mkdirSync(SIGNAL_DIR, { recursive: true })
}

/** 清理所有信号文件。 */
export function cleanupSignals(): void {
  if (fs.existsSync(SIGNAL_DIR)) {
    fs.rmSync(SIGNAL_DIR, { recursive: true, force: true })
  }
}

/** 信号文件路径。 */
function signalPath(taskId: string): string {
  return path.join(SIGNAL_DIR, `${taskId}.json`)
}

/**
 * 尝试抢占任务（原子创建信号文件）。
 * 返回 true 表示抢到，false 表示已被其他 worker 抢占。
 */
export function claimTask(taskId: string, worker: string): boolean {
  ensureSignalDir()
  try {
    const signal: Signal = { status: "running", worker, timestamp: Date.now() }
    fs.writeFileSync(signalPath(taskId), JSON.stringify(signal), { flag: "wx" })
    return true
  } catch {
    return false
  }
}

/** 写入任务结果（覆盖 running 状态）。 */
export function writeSignal(
  taskId: string,
  status: SignalStatus,
  opts?: { data?: Record<string, unknown>; error?: string; cause?: string; worker?: string },
): void {
  const signal: Signal = {
    status,
    worker: opts?.worker,
    data: opts?.data,
    error: opts?.error,
    cause: opts?.cause,
    timestamp: Date.now(),
  }
  fs.writeFileSync(signalPath(taskId), JSON.stringify(signal))
}

/** 读取信号文件，不存在返回 null。 */
export function readSignal(taskId: string): Signal | null {
  const p = signalPath(taskId)
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return null
  }
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
  const data: Record<string, Record<string, unknown>> = {}
  for (const req of requires) {
    const signal = readSignal(req)
    if (!signal) return { result: "not_ready" }
    if (signal.status === "fail" || signal.status === "breaker" || signal.status === "timeout") {
      return { result: "any_fail", failedCause: `前置任务 ${req} 失败` }
    }
    if (signal.status === "running") return { result: "not_ready" }
    if (signal.data) data[req] = signal.data
  }
  return { result: "all_pass", data }
}

/** 获取所有信号文件，用于汇总结果。 */
export function getAllSignals(): Record<string, Signal> {
  if (!fs.existsSync(SIGNAL_DIR)) return {}
  const result: Record<string, Signal> = {}
  for (const file of fs.readdirSync(SIGNAL_DIR)) {
    if (!file.endsWith(".json")) continue
    const taskId = file.replace(".json", "")
    const signal = readSignal(taskId)
    if (signal) result[taskId] = signal
  }
  return result
}
