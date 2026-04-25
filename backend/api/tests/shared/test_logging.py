"""logging 模块单元测试。

测试 JSON 结构化日志格式化器。
"""

import json
import logging

from app.core.logging import JsonFormatter, setup_logging


# ---- JsonFormatter ----


class TestJsonFormatter:
    """JSON 日志格式化测试。"""

    def test_basic_format(self):
        """基本日志格式化为 JSON。"""
        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="测试消息",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        data = json.loads(result)

        assert data["level"] == "INFO"
        assert data["logger"] == "test"
        assert data["message"] == "测试消息"
        assert "timestamp" in data

    def test_with_exception(self):
        """带异常信息的日志包含 exception 字段。"""
        formatter = JsonFormatter()
        try:
            raise ValueError("测试错误")
        except ValueError:
            import sys
            exc_info = sys.exc_info()

        record = logging.LogRecord(
            name="test",
            level=logging.ERROR,
            pathname="test.py",
            lineno=1,
            msg="发生错误",
            args=(),
            exc_info=exc_info,
        )

        result = formatter.format(record)
        data = json.loads(result)

        assert "exception" in data
        assert "ValueError" in data["exception"]
        assert "测试错误" in data["exception"]

    def test_without_exception(self):
        """无异常时不包含 exception 字段。"""
        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="正常消息",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        data = json.loads(result)

        assert "exception" not in data

    def test_chinese_message(self):
        """中文消息正确序列化（ensure_ascii=False）。"""
        formatter = JsonFormatter()
        record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="test.py",
            lineno=1,
            msg="用户登录成功",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)

        assert "用户登录成功" in result
        data = json.loads(result)
        assert data["message"] == "用户登录成功"


# ---- setup_logging ----


class TestSetupLogging:
    """日志配置测试。"""

    def test_sets_root_level(self):
        """设置根日志级别。"""
        setup_logging(level=logging.DEBUG)

        root = logging.getLogger()
        assert root.level == logging.DEBUG

        # 恢复默认
        setup_logging(level=logging.INFO)

    def test_json_handler(self):
        """配置 JSON 格式 handler。"""
        setup_logging()

        root = logging.getLogger()
        assert len(root.handlers) == 1
        assert isinstance(
            root.handlers[0].formatter, JsonFormatter
        )

    def test_third_party_levels(self):
        """第三方库日志级别被降低。"""
        setup_logging()

        uvicorn_logger = logging.getLogger("uvicorn.access")
        assert uvicorn_logger.level == logging.WARNING

        sqlalchemy_logger = logging.getLogger("sqlalchemy.engine")
        assert sqlalchemy_logger.level == logging.WARNING
