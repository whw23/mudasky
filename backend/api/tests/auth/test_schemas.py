"""认证 Schema 单元测试。

覆盖 LoginRequest 的 phone 可选验证等分支。
"""

from api.auth.schemas import LoginRequest


def test_login_request_phone_none_implicit():
    """phone 未提供时默认为 None。"""
    req = LoginRequest(
        username="testuser",
        encrypted_password="enc",
        nonce="n",
    )
    assert req.phone is None


def test_login_request_phone_none_explicit():
    """phone 显式传 None 时验证通过（触发 check_phone 的 None 分支）。"""
    req = LoginRequest(
        phone=None,
        username="testuser",
        encrypted_password="enc",
        nonce="n",
    )
    assert req.phone is None


def test_login_request_phone_valid():
    """phone 格式正确时验证通过。"""
    req = LoginRequest(
        phone="+86-13800138000",
        code="123456",
    )
    assert req.phone == "+86-13800138000"


def test_login_request_phone_invalid():
    """phone 格式不正确时抛出 ValidationError。"""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        LoginRequest(phone="bad", code="123456")
