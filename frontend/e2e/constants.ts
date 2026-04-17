/**
 * E2E 测试共享常量。
 * TS 通过文件共享，确保所有 worker 进程使用同一个值。
 */

import * as fs from "fs"
import * as path from "path"

/** 从文件读取共享 TS（global-setup 写入） */
function getSharedTS(): string {
  const tsFile = path.join(__dirname, ".e2e-ts")
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

/** 各 worker 的注册手机号（每次运行不同，避免冲突） */
export const PHONES = {
  w2: `+86-139${TS}02`,
  w3: `+86-139${TS}03`,
  w5: `+86-139${TS}05`,
  w6: `+86-139${TS}06`,
  w7_jwt: `+86-139${TS}71`,
  w7_idor: `+86-139${TS}72`,
  w7_disabled: `+86-139${TS}73`,
} as const
