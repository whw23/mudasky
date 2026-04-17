/**
 * E2E 测试共享常量。
 * 每次运行生成唯一手机号，避免残留用户冲突。
 * 同一次运行内所有 worker 共享同一组号码（通过 TS 后缀保证一致）。
 */

/** 时间戳后缀，用于 E2E 创建的数据名称和手机号 */
export const TS = Date.now().toString().slice(-6)

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
