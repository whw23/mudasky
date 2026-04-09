/**
 * RSA 密码加密工具。
 * 使用 Web Crypto API 和后端公钥加密密码，防止明文传输。
 */

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

  const pemBody = public_key
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "")
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  )

  const payload = JSON.stringify({
    password,
    nonce,
    timestamp: Math.floor(Date.now() / 1000),
  })

  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    cryptoKey,
    new TextEncoder().encode(payload),
  )

  const encrypted_password = btoa(
    String.fromCharCode(...new Uint8Array(encrypted)),
  )

  return { encrypted_password, nonce }
}
