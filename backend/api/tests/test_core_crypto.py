"""RSA 密码加密模块测试。"""

import base64
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
