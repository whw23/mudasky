"""自定义异常和全局异常处理。"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """应用业务异常基类。"""

    def __init__(self, status_code: int, code: str, message: str):
        self.status_code = status_code
        self.code = code
        self.message = message


class NotFoundException(AppException):
    """资源未找到异常。"""

    def __init__(self, message: str = "资源不存在"):
        super().__init__(status_code=404, code="NOT_FOUND", message=message)


class ForbiddenException(AppException):
    """权限不足异常。"""

    def __init__(self, message: str = "权限不足"):
        super().__init__(status_code=403, code="FORBIDDEN", message=message)


class ConflictException(AppException):
    """资源冲突异常。"""

    def __init__(self, message: str = "资源冲突"):
        super().__init__(status_code=409, code="CONFLICT", message=message)


class QuotaExceededException(AppException):
    """配额超限异常。"""

    def __init__(self, message: str = "存储配额已满"):
        super().__init__(status_code=413, code="QUOTA_EXCEEDED", message=message)


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
