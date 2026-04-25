"""RSA 密码加密模块测试。"""

import base64
import json
import time

import pytest
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

from app.utils.crypto import (
    _cleanup_expired,
    _issued_nonces,
    _MAX_NONCES,
    _nonce_lock,
    _used_nonces,
    decrypt_password,
    generate_nonce,
    get_public_key_pem,
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
        int(nonce, 16)

    def test_unique(self):
        """每次生成不同的 nonce。"""
        assert generate_nonce() != generate_nonce()


class TestDecryptPassword:
    """密码解密测试。"""

    def _encrypt(self, payload: dict) -> str:
        """用公钥加密测试数据，返回 base64。"""
        plaintext = json.dumps(payload).encode("utf-8")
        encrypted = _private_key.public_key().encrypt(
            plaintext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None,
            ),
        )
        return base64.b64encode(encrypted).decode()

    def test_decrypt_success(self):
        """正常解密。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        result = decrypt_password(encrypted_b64, nonce)
        assert result == "mypassword"

    def test_nonce_mismatch(self):
        """nonce 不匹配应拒绝。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, "wrong-nonce")

    def test_expired_timestamp(self):
        """超时的时间戳应拒绝。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()) - 120,
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce)

    def test_nonce_replay(self):
        """同一 nonce 不能使用两次。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        decrypt_password(encrypted_b64, nonce)
        # 再次使用同一个 nonce 应失败
        encrypted_b64_2 = self._encrypt({
            "password": "mypassword",
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64_2, nonce)

    def test_missing_password_field(self):
        """缺少 password 字段应拒绝。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "nonce": nonce,
            "timestamp": int(time.time()),
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce)

    def test_missing_nonce_field(self):
        """缺少 nonce 字段应拒绝。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "test",
            "timestamp": int(time.time()),
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce)

    def test_missing_timestamp_field(self):
        """缺少 timestamp 字段应拒绝。"""
        nonce = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "test",
            "nonce": nonce,
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce)

    def test_invalid_base64(self):
        """无效 base64 应拒绝。"""
        nonce = generate_nonce()
        with pytest.raises(Exception):
            decrypt_password("not-valid-base64!!!", nonce)

    def test_nonce_in_payload_mismatch(self):
        """密文中的 nonce 与请求参数不一致应拒绝。"""
        nonce1 = generate_nonce()
        nonce2 = generate_nonce()
        encrypted_b64 = self._encrypt({
            "password": "test",
            "nonce": nonce1,
            "timestamp": int(time.time()),
        })
        with pytest.raises(Exception):
            decrypt_password(encrypted_b64, nonce2)


class TestCleanupExpired:
    """过期 nonce 清理测试。"""

    def test_expired_nonces_removed(self):
        """过期的 nonce 被清除。"""
        now = time.time()
        with _nonce_lock:
            _issued_nonces["old-nonce"] = now - 120
            _used_nonces["old-used"] = now - 120
            _cleanup_expired(now)

        assert "old-nonce" not in _issued_nonces
        assert "old-used" not in _used_nonces

    def test_overflow_eviction(self):
        """超过 MAX_NONCES 限制时淘汰最旧的。"""
        now = time.time()
        with _nonce_lock:
            _issued_nonces.clear()
            _used_nonces.clear()
            # 添加超过限制数量的 nonce
            for i in range(_MAX_NONCES + 5):
                _issued_nonces[f"nonce-{i}"] = now
            _cleanup_expired(now)

        assert len(_issued_nonces) <= _MAX_NONCES
