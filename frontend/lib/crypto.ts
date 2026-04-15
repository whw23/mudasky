/**
 * RSA 密码加密工具。
 * 使用 node-forge 加密密码，兼容 HTTP 环境（不依赖浏览器 crypto.subtle）。
 */

import forge from "node-forge"
import api from "./api"

interface PublicKeyResponse {
  public_key: string
  nonce: string
}

interface EncryptedPassword {
  encrypted_password: string
  nonce: string
}

/**
 * 获取公钥并加密密码。
 * 返回 { encrypted_password, nonce } 用于替代明文 password 字段。
 */
export async function encryptPassword(password: string): Promise<EncryptedPassword> {
  const { data } = await api.get<PublicKeyResponse>("/auth/public-key")
  const { public_key, nonce } = data

  const publicKey = forge.pki.publicKeyFromPem(public_key)

  const payload = JSON.stringify({
    password,
    nonce,
    timestamp: Math.floor(Date.now() / 1000),
  })

  const encrypted = publicKey.encrypt(payload, "RSA-OAEP", {
    md: forge.md.sha256.create(),
  })

  const encrypted_password = forge.util.encode64(encrypted)

  return { encrypted_password, nonce }
}
