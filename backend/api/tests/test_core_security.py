"""core/security 单元测试。"""

import pytest


def test_hash_and_verify_password():
    """验证密码哈希和校验。"""
    from app.core.security import hash_password, verify_password

    hashed = hash_password("mypassword")
    assert hashed != "mypassword"
    assert verify_password("mypassword", hashed) is True
    assert verify_password("wrongpassword", hashed) is False


def test_hash_password_unique():
    """验证相同密码生成不同哈希（bcrypt 自带盐）。"""
    from app.core.security import hash_password

    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2
