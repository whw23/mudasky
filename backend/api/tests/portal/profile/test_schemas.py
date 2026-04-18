"""Portal 用户资料 Schema 单元测试。

覆盖 PhoneChange 验证器分支。
"""

import pytest
from pydantic import ValidationError

from api.portal.profile.schemas import PhoneChange, PasswordChange


def test_phone_change_valid():
    """有效手机号通过验证。"""
    data = PhoneChange(
        new_phone="+86-13800138000", code="123456"
    )
    assert data.new_phone == "+86-13800138000"


def test_phone_change_invalid():
    """无效手机号应报 ValidationError。"""
    with pytest.raises(ValidationError):
        PhoneChange(new_phone="bad-phone", code="123456")


def test_password_change_invalid_phone():
    """修改密码时手机号格式不正确。"""
    with pytest.raises(ValidationError):
        PasswordChange(
            phone="invalid",
            code="123456",
            encrypted_password="enc",
            nonce="n",
        )


def test_password_change_valid():
    """修改密码时手机号格式正确。"""
    data = PasswordChange(
        phone="+86-13800138000",
        code="123456",
        encrypted_password="enc",
        nonce="n",
    )
    assert data.phone == "+86-13800138000"
