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

# 缓存公钥 PEM
_public_key_pem: str = _private_key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
).decode("utf-8")

# nonce 存储
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
        _cleanup_expired(now)
        _issued_nonces[nonce] = now
    return nonce


def decrypt_password(encrypted_b64: str, expected_nonce: str) -> str:
    """解密 RSA 加密的密码。

    先消费 nonce（防重放），再解密，最后校验时间戳。
    """
    from app.core.exceptions import UnauthorizedException

    # 1. 先校验并消费 nonce
    now = time.time()
    with _nonce_lock:
        _cleanup_expired(now)
        if expected_nonce in _used_nonces:
            raise UnauthorizedException(message="密码解密失败", code="PASSWORD_DECRYPT_FAILED")
        if expected_nonce not in _issued_nonces:
            raise UnauthorizedException(message="密码解密失败", code="PASSWORD_DECRYPT_FAILED")
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
    while len(_issued_nonces) > _MAX_NONCES:
        _issued_nonces.popitem(last=False)
    while len(_used_nonces) > _MAX_NONCES:
        _used_nonces.popitem(last=False)
