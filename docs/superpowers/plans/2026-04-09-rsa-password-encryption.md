# RSA 密码加密传输 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 密码在传输过程中使用 RSA 非对称加密 + nonce 防重放，后端解密后再走 bcrypt 校验。

**Architecture:** 后端启动时生成 RSA 密钥对，通过 `/api/auth/public-key` 接口返回公钥和一次性 nonce。前端用公钥加密 `{password, nonce, timestamp}` 后发送。后端解密、校验 nonce 未用过且时间戳在 60 秒内，然后提取明文密码进行 bcrypt 验证。密码解密逻辑抽取为可复用函数 `decrypt_password()`，所有涉及密码的接口统一调用。

**Tech Stack:** Python `cryptography` (RSA-OAEP), JS `Web Crypto API` (浏览器原生，无需额外依赖)

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 新建 | `backend/shared/src/app/core/crypto.py` | RSA 密钥管理、加密/解密、nonce 校验 |
| 新建 | `backend/api/tests/test_core_crypto.py` | crypto 模块单元测试 |
| 修改 | `backend/shared/src/app/auth/router.py` | 新增 `GET /auth/public-key` 端点 |
| 修改 | `backend/shared/src/app/auth/service.py` | register/login 中解密密码 |
| 修改 | `backend/shared/src/app/user/service.py` | change_password 中解密密码 |
| 修改 | `backend/shared/src/app/admin/service.py` | reset_password 中解密密码 |
| 新建 | `frontend/lib/crypto.ts` | 公钥获取、密码加密工具 |
| 修改 | `frontend/lib/api.ts` | 导出 api 实例（已可用） |
| 修改 | `frontend/components/auth/LoginModal.tsx` | 登录时加密密码 |
| 修改 | `frontend/components/auth/RegisterModal.tsx` | 注册时加密密码 |
| 修改 | `frontend/components/user/ChangePassword.tsx` | 改密码时加密密码 |
| 修改 | `frontend/components/admin/UserDrawer.tsx` | 管理员重置密码时加密 |
| 修改 | `backend/shared/src/app/auth/schemas.py` | password → encrypted_password + nonce |
| 修改 | `backend/shared/src/app/user/schemas.py` | new_password → encrypted_password + nonce |
| 修改 | `backend/shared/src/app/admin/schemas.py` | password → encrypted_password + nonce |
| 修改 | `backend/shared/src/app/user/router.py` | 传参适配 |
| 修改 | `backend/shared/src/app/admin/router.py` | 传参适配 |
| 修改 | `backend/api/tests/test_auth_service.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_auth_router.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_user_service.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_user_router.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_admin_service.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_admin_service_extra.py` | mock decrypt_password |
| 修改 | `backend/api/tests/test_admin_router.py` | mock decrypt_password |
| 修改 | `backend/api/tests/auth/test_auth_service_extra.py` | mock decrypt_password |

---

### Task 1: 后端 crypto 模块 - RSA 密钥管理和解密

**Files:**
- Create: `backend/shared/src/app/core/crypto.py`
- Create: `backend/api/tests/test_core_crypto.py`

- [ ] **Step 1: 安装 cryptography 依赖**

```bash
cd backend/shared && uv add cryptography
```

- [ ] **Step 2: 写 crypto 模块测试**

```python
# backend/api/tests/test_core_crypto.py
"""RSA 密码加密模块测试。"""

import json
import time

import pytest
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

from app.core.crypto import (
    get_public_key_pem,
    generate_nonce,
    decrypt_password,
    _private_key,
)


class TestGetPublicKeyPem:
    """公钥获取测试。"""

    def test_returns_pem_string(self):
        """返回 PEM 格式公钥。"""
        pem = get_public_key_pem()
        assert pem.startswith("-----BEGIN PUBLIC KEY-----")
        assert pem.endswith("-----END PUBLIC KEY-----\n")

    def test_returns_same_key(self):
        """多次调用返回同一公钥（进程级单例）。"""
        assert get_public_key_pem() == get_public_key_pem()


class TestGenerateNonce:
    """nonce 生成测试。"""

    def test_returns_hex_string(self):
        """返回 32 字节十六进制字符串。"""
        nonce = generate_nonce()
        assert len(nonce) == 64
        int(nonce, 16)  # 能解析为十六进制

    def test_unique(self):
        """每次生成不同的 nonce。"""
        assert generate_nonce() != generate_nonce()


class TestDecryptPassword:
    """密码解密测试。"""

    def _encrypt(self, payload: dict) -> bytes:
        """用公钥加密测试数据。"""
        plaintext = json.dumps(payload).encode("utf-8")
        return _private_key.public_key().encrypt(
            plaintext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )

    def test_decrypt_success(self):
        """正常解密。"""
        nonce = generate_nonce()
        encrypted = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        import base64
        encrypted_b64 = base64.b64encode(encrypted).decode()
        result = decrypt_password(encrypted_b64, nonce)
        assert result == "mypassword"

    def test_nonce_mismatch(self):
        """nonce 不匹配应拒绝。"""
        nonce = generate_nonce()
        encrypted = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        import base64
        encrypted_b64 = base64.b64encode(encrypted).decode()
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, "wrong-nonce")

    def test_expired_timestamp(self):
        """超时的时间戳应拒绝。"""
        nonce = generate_nonce()
        encrypted = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()) - 120,
        })
        import base64
        encrypted_b64 = base64.b64encode(encrypted).decode()
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce)

    def test_nonce_replay(self):
        """同一 nonce 不能使用两次。"""
        nonce = generate_nonce()
        encrypted = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        import base64
        encrypted_b64 = base64.b64encode(encrypted).decode()
        decrypt_password(encrypted_b64, nonce)
        nonce2 = generate_nonce()  # 需要新 nonce
        encrypted2 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        encrypted_b64_2 = base64.b64encode(encrypted2).decode()
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64_2, nonce)
```

- [ ] **Step 3: 运行测试验证失败**

```bash
cd backend/api && uv run pytest tests/test_core_crypto.py -v
```
Expected: FAIL (module not found)

- [ ] **Step 4: 实现 crypto 模块**

```python
# backend/shared/src/app/core/crypto.py
"""RSA 非对称加密模块。

提供密码加密传输功能：
- 进程启动时生成 RSA 密钥对
- 通过 public-key 接口返回公钥和 nonce
- 接收加密密码后解密并校验 nonce + 时间戳
"""

import base64
import json
import secrets
import time
from collections import OrderedDict
from threading import Lock

from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization

# 进程级 RSA 密钥对（每次重启重新生成）
_private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
)

# 缓存公钥 PEM（避免重复序列化）
_public_key_pem: str = _private_key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
).decode("utf-8")

# nonce 存储（已发放的 nonce，防重放）
_nonce_lock = Lock()
_issued_nonces: OrderedDict[str, float] = OrderedDict()
_used_nonces: OrderedDict[str, float] = OrderedDict()
_MAX_NONCES = 10000
_NONCE_EXPIRE_SECONDS = 60


def get_public_key_pem() -> str:
    """获取 PEM 格式公钥。"""
    return _public_key_pem


def generate_nonce() -> str:
    """生成并注册一个一次性 nonce。"""
    nonce = secrets.token_hex(32)
    now = time.time()
    with _nonce_lock:
        _cleanup_expired_nonces(now)
        _issued_nonces[nonce] = now
    return nonce


def decrypt_password(encrypted_b64: str, expected_nonce: str) -> str:
    """解密 RSA 加密的密码。

    先消费 nonce（防重放），再解密，最后校验时间戳。
    """
    from app.core.exceptions import UnauthorizedException

    # 1. 先校验并消费 nonce（即使解密失败也消费，防止重试攻击）
    now = time.time()
    with _nonce_lock:
        _cleanup_expired(now)
        if expected_nonce in _used_nonces:
            raise UnauthorizedException(message="密码解密失败")
        if expected_nonce not in _issued_nonces:
            raise UnauthorizedException(message="密码解密失败")
        _issued_nonces.pop(expected_nonce)
        _used_nonces[expected_nonce] = now

    # 2. 解密
    try:
        encrypted = base64.b64decode(encrypted_b64)
        plaintext = _private_key.decrypt(
            encrypted,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        payload = json.loads(plaintext)
    except Exception:
        raise UnauthorizedException(message="密码解密失败")

    password = payload.get("password")
    nonce = payload.get("nonce")
    timestamp = payload.get("timestamp")

    if not all([password, nonce, timestamp]):
        raise UnauthorizedException(message="密码解密失败")

    # 3. 校验密文内的 nonce 与请求参数一致
    if nonce != expected_nonce:
        raise UnauthorizedException(message="密码解密失败")

    # 4. 校验时间戳
    if abs(now - timestamp) > _NONCE_EXPIRE_SECONDS:
        raise UnauthorizedException(message="密码解密失败")

    return password


def _cleanup_expired(now: float) -> None:
    """清理过期的 nonce（issued 和 used 两个集合）。"""
    for store in (_issued_nonces, _used_nonces):
        expired = [n for n, t in store.items() if now - t > _NONCE_EXPIRE_SECONDS]
        for n in expired:
            store.pop(n, None)
    # 硬上限
    while len(_issued_nonces) > _MAX_NONCES:
        _issued_nonces.popitem(last=False)
    while len(_used_nonces) > _MAX_NONCES:
        _used_nonces.popitem(last=False)
```

- [ ] **Step 5: 运行测试验证通过**

```bash
cd backend/api && uv run pytest tests/test_core_crypto.py -v
```
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/shared/src/app/core/crypto.py backend/api/tests/test_core_crypto.py backend/shared/pyproject.toml
git commit -m "feat: RSA 密码加密模块（密钥生成 + nonce 防重放）"
```

---

### Task 2: 后端 public-key 端点

**Files:**
- Modify: `backend/shared/src/app/auth/router.py`

- [ ] **Step 1: 在 auth router 中添加 public-key 端点**

在 `router.py` 的 `send_sms_code` 之前添加：

```python
from app.core.crypto import get_public_key_pem, generate_nonce

class PublicKeyResponse(BaseModel):
    """公钥响应。"""
    public_key: str
    nonce: str

@router.get("/public-key", response_model=PublicKeyResponse)
async def get_public_key() -> PublicKeyResponse:
    """获取 RSA 公钥和一次性 nonce。"""
    return PublicKeyResponse(
        public_key=get_public_key_pem(),
        nonce=generate_nonce(),
    )
```

- [ ] **Step 2: 将 `/api/auth/public-key` 加入网关公开路由白名单**

在 `gateway/lua/init.lua` 的公开路由列表中添加 `GET /api/auth/public-key`。

- [ ] **Step 3: Commit**

```bash
git add backend/shared/src/app/auth/router.py gateway/lua/init.lua
git commit -m "feat: 新增 GET /auth/public-key 端点（公钥 + nonce）"
```

---

### Task 3: 后端 - 提取可复用的密码解密逻辑并适配所有 Service

**Files:**
- Modify: `backend/shared/src/app/auth/service.py`
- Modify: `backend/shared/src/app/auth/schemas.py`
- Modify: `backend/shared/src/app/user/service.py`
- Modify: `backend/shared/src/app/user/schemas.py`
- Modify: `backend/shared/src/app/admin/service.py`
- Modify: `backend/shared/src/app/admin/schemas.py`

**核心改动：** 所有接收密码的 schema 字段从 `password: str` 改为 `encrypted_password: str` + `nonce: str`。Service 层调用 `decrypt_password()` 解密后再做 bcrypt 校验。

**注意：** 密码最大长度限制为 72 字符（bcrypt 限制），确保 RSA 加密 payload 不超过 2048-bit 密钥的 190 字节容量。在 schema 中添加 `max_length=72`。

- [ ] **Step 1: 修改 auth schemas**

`LoginRequest` 和 `RegisterRequest` 中：
- `password` → `encrypted_password: str | None`
- 新增 `nonce: str | None`

```python
# auth/schemas.py - RegisterRequest
encrypted_password: str | None = Field(None, description="RSA 加密后的密码")
nonce: str | None = Field(None, description="一次性 nonce")

# auth/schemas.py - LoginRequest
encrypted_password: str | None = Field(None, description="RSA 加密后的密码")
nonce: str | None = Field(None, description="一次性 nonce")
```

- [ ] **Step 2: 修改 auth service**

`register()` 和 `login()` 中解密密码：

```python
from app.core.crypto import decrypt_password

# register() 中
password = None
if encrypted_password and nonce:
    password = decrypt_password(encrypted_password, nonce)
password_hash = hash_password(password) if password else None

# login() 中 - password 字段改为 encrypted_password + nonce
if encrypted_password and nonce:
    password = decrypt_password(encrypted_password, nonce)
```

- [ ] **Step 3: 修改 user schemas 和 service**

`PasswordChange` 中：
- `new_password` → `encrypted_password: str`
- 新增 `nonce: str`

`UserService.change_password()` 中：
```python
password = decrypt_password(data.encrypted_password, data.nonce)
user.password_hash = hash_password(password)
```

- [ ] **Step 4: 修改 admin schemas 和 service**

`PasswordReset` 中：
- `password` → `encrypted_password: str`
- 新增 `nonce: str`

`AdminService.reset_password()` 中：
```python
password = decrypt_password(encrypted_password, nonce)
user.password_hash = hash_password(password)
```

- [ ] **Step 5: 修改对应的 router 层传参**

各 router 把新字段传给 service（`encrypted_password`, `nonce`）。

- [ ] **Step 6: 运行现有单元测试（预期会失败）**

```bash
cd backend/api && uv run pytest -v --tb=short 2>&1 | tail -30
```

- [ ] **Step 7: 修复单元测试 — mock `decrypt_password`**

所有涉及密码的单元测试需要 mock `decrypt_password` 返回明文密码，因为单元测试不需要真正走 RSA 加密流程。

```python
@patch("app.core.crypto.decrypt_password", return_value="plaintext_password")
```

- [ ] **Step 8: 运行全部单元测试验证通过**

```bash
cd backend/api && uv run pytest -v
```
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add backend/shared/src/app/auth/ backend/shared/src/app/user/ backend/shared/src/app/admin/ backend/api/tests/
git commit -m "refactor: 所有密码接口改用 RSA 加密传输（encrypted_password + nonce）"
```

---

### Task 4: 前端 - crypto 工具模块

**Files:**
- Create: `frontend/lib/crypto.ts`

- [ ] **Step 1: 创建加密工具**

使用浏览器原生 Web Crypto API，无需安装额外依赖。

```typescript
// frontend/lib/crypto.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/crypto.ts
git commit -m "feat: 前端 RSA 密码加密工具（Web Crypto API）"
```

---

### Task 5: 前端 - 适配所有密码发送组件

**Files:**
- Modify: `frontend/components/auth/LoginModal.tsx`
- Modify: `frontend/components/auth/RegisterModal.tsx`
- Modify: `frontend/components/user/ChangePassword.tsx`
- Modify: `frontend/components/admin/UserDrawer.tsx`

- [ ] **Step 1: LoginModal — 加密密码**

在 `handleAccountLogin` 中：

```typescript
import { encryptPassword } from "@/lib/crypto"

async function handleAccountLogin(e: FormEvent): Promise<void> {
  e.preventDefault()
  const { encrypted_password, nonce } = await encryptPassword(accountPwd)
  if (isPhoneNumber(account)) {
    await doLogin({ phone: account, encrypted_password, nonce })
  } else {
    await doLogin({ username: account, encrypted_password, nonce })
  }
}
```

**重要：2FA 重试时必须重新加密。** 当第一次登录返回 `2fa_required` 时，nonce 已被后端消费。`handleTwoFaSubmit` 需要重新调用 `encryptPassword()` 获取新的 nonce+密文：

```typescript
async function handleTwoFaSubmit(data: Record<string, string | undefined>): void {
  if (!pendingPayload) return
  // 如果原请求含密码，重新加密（nonce 已消费）
  const payload: Record<string, string> = { ...pendingPayload }
  if (accountPwd) {
    const { encrypted_password, nonce } = await encryptPassword(accountPwd)
    payload.encrypted_password = encrypted_password
    payload.nonce = nonce
  }
  for (const [k, v] of Object.entries(data)) {
    if (v) payload[k] = v
  }
  doLogin(payload)
}
```

- [ ] **Step 2: RegisterModal — 加密密码**

在 `handleSubmit` 中：

```typescript
import { encryptPassword } from "@/lib/crypto"

const payload: Record<string, string> = { phone, code }
if (username) payload.username = username
if (password) {
  const encrypted = await encryptPassword(password)
  payload.encrypted_password = encrypted.encrypted_password
  payload.nonce = encrypted.nonce
}
```

- [ ] **Step 3: ChangePassword — 加密密码**

在 `handleSubmit` 中：

```typescript
import { encryptPassword } from "@/lib/crypto"

const { encrypted_password, nonce } = await encryptPassword(newPassword)
await api.put('/users/me/password', {
  phone,
  code,
  encrypted_password,
  nonce,
})
```

- [ ] **Step 4: UserDrawer — 管理员重置密码加密**

在 `handleResetPassword` 中：

```typescript
import { encryptPassword } from "@/lib/crypto"

const { encrypted_password, nonce } = await encryptPassword(password)
runAction(
  () => api.put(`/admin/users/${userId}/password`, { encrypted_password, nonce }),
  t("resetPasswordSuccess"),
)
```

- [ ] **Step 5: Commit**

```bash
git add frontend/components/auth/ frontend/components/user/ChangePassword.tsx frontend/components/admin/UserDrawer.tsx
git commit -m "feat: 前端所有密码发送改用 RSA 加密"
```

---

### Task 6: 初始化脚本适配

**Files:**
- Modify: `backend/api/scripts/init_superuser.py`

初始化脚本在后端内部直接调用 `hash_password()`，不经过 HTTP 传输，**不需要 RSA 加密**。确认无需修改。

- [ ] **Step 1: 确认 init_superuser.py 不受影响**

Review：`init_superuser.py` 直接调用 `hash_password(SUPERUSER_PASSWORD)` 写入数据库，不涉及 API 传输。无需修改。

---

### Task 7: 集成验证

- [ ] **Step 1: 启动容器**

```bash
./scripts/dev.sh
```

- [ ] **Step 2: 手动测试登录流程**

1. 打开浏览器 `http://localhost`
2. 用超级管理员账号登录（mudasky / mudasky@12321.）
3. 检查浏览器 DevTools Network — `/auth/public-key` 返回公钥
4. 登录请求 body 中应为 `encrypted_password` + `nonce`，不再有明文 `password`
5. 登录成功

- [ ] **Step 3: 测试注册、改密码、管理员重置密码**

分别测试各流程是否正常工作。

- [ ] **Step 4: 运行全部单元测试**

```bash
cd backend/api && uv run pytest -v
```
Expected: ALL PASS

- [ ] **Step 5: Commit（如有修复）**

```bash
git commit -m "fix: RSA 密码加密集成修复"
```
