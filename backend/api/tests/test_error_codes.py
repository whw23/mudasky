"""API 错误码单元测试。验证自定义异常返回具体错误码。"""

import pytest

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
    QuotaExceededException,
    TooManyRequestsException,
    UnauthorizedException,
)


class TestExceptionCodes:
    """测试异常类自定义 code 参数。"""

    def test_conflict_default_code(self):
        """默认 code 保持向后兼容。"""
        exc = ConflictException()
        assert exc.code == "CONFLICT"
        assert exc.status_code == 409

    def test_conflict_custom_code(self):
        """自定义 code 正确设置。"""
        exc = ConflictException(message="手机号已注册", code="PHONE_ALREADY_REGISTERED")
        assert exc.code == "PHONE_ALREADY_REGISTERED"
        assert exc.message == "手机号已注册"
        assert exc.status_code == 409

    def test_unauthorized_custom_code(self):
        """UnauthorizedException 自定义 code。"""
        exc = UnauthorizedException(message="密码不正确", code="PASSWORD_INCORRECT")
        assert exc.code == "PASSWORD_INCORRECT"
        assert exc.status_code == 401

    def test_not_found_custom_code(self):
        """NotFoundException 自定义 code。"""
        exc = NotFoundException(message="用户不存在", code="USER_NOT_FOUND")
        assert exc.code == "USER_NOT_FOUND"
        assert exc.status_code == 404

    def test_forbidden_custom_code(self):
        """ForbiddenException 自定义 code。"""
        exc = ForbiddenException(message="无权访问", code="DOCUMENT_ACCESS_DENIED")
        assert exc.code == "DOCUMENT_ACCESS_DENIED"
        assert exc.status_code == 403

    def test_too_many_requests_custom_code(self):
        """TooManyRequestsException 自定义 code。"""
        exc = TooManyRequestsException(message="频繁", code="SMS_CODE_TOO_FREQUENT")
        assert exc.code == "SMS_CODE_TOO_FREQUENT"
        assert exc.status_code == 429

    def test_quota_exceeded_custom_code(self):
        """QuotaExceededException 自定义 code。"""
        exc = QuotaExceededException(message="配额不足", code="STORAGE_QUOTA_EXCEEDED")
        assert exc.code == "STORAGE_QUOTA_EXCEEDED"
        assert exc.status_code == 413

    def test_bad_request_default_code(self):
        """BadRequestException 默认 code 不变。"""
        exc = BadRequestException()
        assert exc.code == "BAD_REQUEST"
        assert exc.status_code == 400
