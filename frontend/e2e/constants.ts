/**
 * E2E 测试共享常量。
 * 所有 worker 使用固定手机号，确保 W1 能找到其他 worker 并分配角色。
 */

/** 各 worker 的注册手机号 */
export const PHONES = {
  w2: "+86-13900002002",
  w3: "+86-13900003003",
  w5: "+86-13900005005",
  w6: "+86-13900006006",
  w7_jwt: "+86-13900007701",
  w7_idor: "+86-13900007702",
  w7_disabled: "+86-13900007703",
} as const

/** 时间戳后缀，用于 E2E 创建的数据名称 */
export const TS = Date.now().toString().slice(-6)
