/**
 * E2E 测试共享常量。
 * TS 通过文件共享，确保所有 worker 进程使用同一个值。
 */

import * as fs from "fs"
import * as path from "path"

/** E2E 运行时目录（auth state、时间戳等临时文件） */
export const E2E_RUNTIME_DIR = process.env.E2E_RUNTIME_DIR || path.join(__dirname, ".runtime")

/** 获取 auth state 文件路径 */
export function getAuthFile(worker: string): string {
  const dir = path.join(E2E_RUNTIME_DIR, "auth")
  fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, `${worker}.json`)
}

/** 从文件读取共享 TS（global-setup 写入） */
function getSharedTS(): string {
  const tsFile = path.join(E2E_RUNTIME_DIR, "e2e-ts")
  fs.mkdirSync(E2E_RUNTIME_DIR, { recursive: true })
  if (fs.existsSync(tsFile)) {
    return fs.readFileSync(tsFile, "utf-8").trim()
  }
  // fallback：生成并写入
  const ts = Date.now().toString().slice(-6)
  fs.writeFileSync(tsFile, ts)
  return ts
}

/** 时间戳后缀（所有 worker 共享同一个值） */
export const TS = getSharedTS()

/** E2E 测试数据统一前缀（用于清理） */
export const E2E_PREFIX = "E2E_239_"

/** 各 worker 的注册手机号（每次运行不同，避免冲突） */
export const PHONES = {
  w1: `+86-239${TS}01`,
  w2: `+86-239${TS}02`,
  w3: `+86-239${TS}03`,
  w5: `+86-239${TS}05`,
  w6: `+86-239${TS}06`,
  w2_temp: `+86-239${TS}20`,
  w7_jwt: `+86-239${TS}71`,
  w7_idor: `+86-239${TS}72`,
  w7_disabled: `+86-239${TS}73`,
} as const
