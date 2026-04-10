/**
 * RSA 密码加密工具测试。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

/* mock api 模块 */
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

import { encryptPassword } from "@/lib/crypto"
import api from "@/lib/api"

const MOCK_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWe
FuxJLHMRiGpbwFcnFmsMlmTU0SaFXMZcj7bMDGNLpNAfdj5AS6HsJVMOZmZm3YkN
e/bDgekEAyClpJisNB5UVNfVMKBQY2nquRI5bvzsRhxU1MR/FxAgF5PnFY7+RBZG
FYJcQMsYGKsN0rxXvM5XCsgJMMjWg87pCjWF0MBlID+kFE0SNdB+6StN5FPB7TlI
PkNlQMYzBtZlI/oK//vkwyR2KC6QdlMAsMgk9b9a0x6ONJZi1lD3InIRWjFQUF0i
WQGOXdEHK3DkbQ7FluN6WHLO5e0FBJST4+PpxWHofMCWBIS9S9q1OE9vj3y6eFi7
1QIDAQAB
-----END PUBLIC KEY-----`

const MOCK_NONCE = "test-nonce-abc"

describe("encryptPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("正常流程：获取公钥、加密、返回结果", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { public_key: MOCK_PEM, nonce: MOCK_NONCE },
    })

    const result = await encryptPassword("mypassword")

    expect(api.get).toHaveBeenCalledWith("/auth/public-key")
    expect(result).toHaveProperty("encrypted_password")
    expect(result).toHaveProperty("nonce", MOCK_NONCE)
    expect(typeof result.encrypted_password).toBe("string")
    expect(result.encrypted_password.length).toBeGreaterThan(0)
  })

  it("API 失败时抛出错误", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network Error"))

    await expect(encryptPassword("mypassword")).rejects.toThrow("Network Error")
  })
})
