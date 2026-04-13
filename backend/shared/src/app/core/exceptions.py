"""自定义异常和全局异常处理。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """应用业务异常基类。"""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


class UnauthorizedException(AppException):
    """认证失败异常。"""

    def __init__(self, message: str = "认证失败", code: str = "UNAUTHORIZED"):
        super().__init__(status_code=401, code=code, message=message)


class NotFoundException(AppException):
    """资源未找到异常。"""

    def __init__(self, message: str = "资源不存在", code: str = "NOT_FOUND"):
        super().__init__(status_code=404, code=code, message=message)


class ForbiddenException(AppException):
    """权限不足异常。"""

    def __init__(self, message: str = "权限不足", code: str = "FORBIDDEN"):
        super().__init__(status_code=403, code=code, message=message)


class BadRequestException(AppException):
    """请求参数错误。"""

    def __init__(self, message: str = "请求参数错误", code: str = "BAD_REQUEST") -> None:
        super().__init__(status_code=400, code=code, message=message)


class ConflictException(AppException):
    """资源冲突异常。"""

    def __init__(self, message: str = "资源冲突", code: str = "CONFLICT"):
        super().__init__(status_code=409, code=code, message=message)


class TooManyRequestsException(AppException):
    """请求过于频繁异常。"""

    def __init__(self, message: str = "请求过于频繁", code: str = "TOO_MANY_REQUESTS"):
        super().__init__(status_code=429, code=code, message=message)


class QuotaExceededException(AppException):
    """配额超限异常。"""

    def __init__(self, message: str = "存储配额已满", code: str = "QUOTA_EXCEEDED"):
        super().__init__(status_code=413, code=code, message=message)


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器。"""

    @app.exception_handler(AppException)
    async def app_exception_handler(
        request: Request, exc: AppException
    ) -> JSONResponse:
        """处理业务异常。"""
        return JSONResponse(
            status_code=exc.status_code,
            content={"code": exc.code, "message": exc.message},
        )
