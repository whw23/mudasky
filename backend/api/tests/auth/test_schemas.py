"""认证 Schema 单元测试。

覆盖 LoginRequest 的 phone 可选验证、RegisterRequest phone 验证等分支。
"""

from api.auth.schemas import LoginRequest, RegisterRequest


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


# ---- RegisterRequest ----


def test_register_request_phone_valid():
    """RegisterRequest phone 格式正确时验证通过。"""
    req = RegisterRequest(
        phone="+86-13800138000",
        code="123456",
    )
    assert req.phone == "+86-13800138000"


def test_register_request_phone_invalid():
    """RegisterRequest phone 格式不正确时抛出 ValidationError。"""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        RegisterRequest(phone="12345", code="123456")


def test_register_request_phone_international():
    """RegisterRequest 支持国际手机号格式。"""
    req = RegisterRequest(
        phone="+1-2125551234",
        code="654321",
    )
    assert req.phone == "+1-2125551234"


def test_register_request_phone_missing_country_code():
    """RegisterRequest 缺少国家码时验证失败。"""
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        RegisterRequest(phone="13800138000", code="123456")
