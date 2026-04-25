"""SMS 短信发送模块单元测试。

测试短信发送逻辑，mock 阿里云 SDK。
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---- send_sms_code ----


class TestSendSmsCode:
    """短信验证码发送测试。"""

    @patch("app.sms.settings")
    async def test_non_china_phone_rejected(self, mock_settings):
        """非中国号码（+86）直接拒绝。"""
        from app.sms import send_sms_code

        result = await send_sms_code("+1-1234567890", "123456")

        assert result is False

    @patch("app.sms.settings")
    async def test_non_china_phone_without_prefix(self, mock_settings):
        """不以 +86 开头的号码拒绝。"""
        from app.sms import send_sms_code

        result = await send_sms_code("+44-7911123456", "654321")

        assert result is False

    @patch("app.sms.settings")
    async def test_debug_mode_returns_true(self, mock_settings):
        """DEBUG 模式下不真正发送，返回 True。"""
        mock_settings.DEBUG = True
        from app.sms import send_sms_code

        result = await send_sms_code("+86-13800138000", "123456")

        assert result is True

    @patch("app.sms._get_client")
    @patch("app.sms.settings")
    async def test_production_send_success(
        self, mock_settings, mock_get_client
    ):
        """生产环境发送成功。"""
        mock_settings.DEBUG = False
        mock_settings.SMS_SIGN_NAME = "测试签名"
        mock_settings.SMS_TEMPLATE_CODE = "SMS_001"

        mock_body = MagicMock()
        mock_body.code = "OK"
        mock_response = MagicMock()
        mock_response.body = mock_body
        mock_client = MagicMock()
        mock_client.send_sms_with_options_async = AsyncMock(
            return_value=mock_response
        )
        mock_get_client.return_value = mock_client

        from app.sms import send_sms_code

        result = await send_sms_code("+86-13800138000", "123456")

        assert result is True
        mock_client.send_sms_with_options_async.assert_awaited_once()

    @patch("app.sms._get_client")
    @patch("app.sms.settings")
    async def test_production_send_api_failure(
        self, mock_settings, mock_get_client
    ):
        """生产环境 API 返回错误码。"""
        mock_settings.DEBUG = False
        mock_settings.SMS_SIGN_NAME = "测试签名"
        mock_settings.SMS_TEMPLATE_CODE = "SMS_001"

        mock_body = MagicMock()
        mock_body.code = "isv.BUSINESS_LIMIT_CONTROL"
        mock_body.message = "频率限制"
        mock_response = MagicMock()
        mock_response.body = mock_body
        mock_client = MagicMock()
        mock_client.send_sms_with_options_async = AsyncMock(
            return_value=mock_response
        )
        mock_get_client.return_value = mock_client

        from app.sms import send_sms_code

        result = await send_sms_code("+86-13800138000", "123456")

        assert result is False

    @patch("app.sms._get_client")
    @patch("app.sms.settings")
    async def test_production_send_exception(
        self, mock_settings, mock_get_client
    ):
        """生产环境发送异常。"""
        mock_settings.DEBUG = False
        mock_settings.SMS_SIGN_NAME = "测试签名"
        mock_settings.SMS_TEMPLATE_CODE = "SMS_001"

        mock_client = MagicMock()
        mock_client.send_sms_with_options_async = AsyncMock(
            side_effect=Exception("网络超时")
        )
        mock_get_client.return_value = mock_client

        from app.sms import send_sms_code

        result = await send_sms_code("+86-13900139000", "654321")

        assert result is False


# ---- _get_client ----


class TestGetClient:
    """短信客户端懒加载测试。"""

    @patch("app.sms.settings")
    def test_creates_client(self, mock_settings):
        """首次调用创建客户端实例。"""
        mock_settings.SMS_ACCESS_KEY_ID = "test_key"
        mock_settings.SMS_ACCESS_KEY_SECRET = "test_secret"
        mock_settings.SMS_REGION = "cn-hangzhou"

        import app.sms as sms_module

        # 保存原始值以便恢复
        original_client = sms_module._client

        with patch.dict("sys.modules", {
            "alibabacloud_dysmsapi20170525.client": MagicMock(),
            "alibabacloud_tea_openapi.models": MagicMock(),
        }):
            sms_module._client = None
            client = sms_module._get_client()
            assert client is not None

        # 恢复
        sms_module._client = original_client

    @patch("app.sms.settings")
    def test_returns_cached_client(self, mock_settings):
        """已有客户端时返回缓存实例。"""
        import app.sms as sms_module

        fake_client = MagicMock()
        original_client = sms_module._client
        sms_module._client = fake_client

        result = sms_module._get_client()
        assert result is fake_client

        sms_module._client = original_client
