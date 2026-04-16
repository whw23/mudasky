/**
 * Worker 间文件信号通信。
 * emit() 写文件，waitFor() 轮询读取，cleanup() 清理。
 */

import * as fs from "fs"
import * as path from "path"

const SIGNAL_DIR = "/tmp/e2e-signals"

/** 确保信号目录存在。 */
function ensureDir(): void {
  fs.mkdirSync(SIGNAL_DIR, { recursive: true })
}

/** 发送信号（同步写文件，立即可见）。 */
export function emit(name: string, data?: unknown): void {
  ensureDir()
  const payload = JSON.stringify(data ?? {}, null, 2)
  fs.writeFileSync(path.join(SIGNAL_DIR, `${name}.json`), payload)
}

/** 等待信号（轮询文件，默认超时 30s）。 */
export async function waitFor<T = unknown>(
  name: string,
  timeout = 30_000,
): Promise<T> {
  const filePath = path.join(SIGNAL_DIR, `${name}.json`)
  const start = Date.now()

  while (Date.now() - start < timeout) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8")
      return JSON.parse(content) as T
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  throw new Error(`信号超时: ${name}（等待 ${timeout}ms）`)
}

/** 清理所有信号文件。 */
export function cleanup(): void {
  if (fs.existsSync(SIGNAL_DIR)) {
    fs.rmSync(SIGNAL_DIR, { recursive: true, force: true })
  }
}
