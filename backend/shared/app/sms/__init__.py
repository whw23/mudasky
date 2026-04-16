"""阿里云短信发送模块。

DEBUG 模式下只打日志不发送，生产环境通过阿里云 SMS SDK 发送。
"""

import json
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """懒加载阿里云短信客户端。"""
    global _client
    if _client is None:
        from alibabacloud_dysmsapi20170525.client import Client
        from alibabacloud_tea_openapi.models import Config

        config = Config(
            access_key_id=settings.SMS_ACCESS_KEY_ID,
            access_key_secret=settings.SMS_ACCESS_KEY_SECRET,
            endpoint=f"dysmsapi.aliyuncs.com",
            region_id=settings.SMS_REGION,
        )
        _client = Client(config)
    return _client


async def send_sms_code(phone: str, code: str) -> bool:
    """发送短信验证码。

    Args:
        phone: 手机号（可带 +86 前缀）
        code: 验证码

    Returns:
        发送是否成功
    """
    # 去掉 +86 前缀
    clean_phone = phone.lstrip("+")
    if clean_phone.startswith("86"):
        clean_phone = clean_phone[2:]

    if settings.DEBUG:
        logger.info(
            "发送短信验证码（DEBUG 模式）phone=%s code=%s",
            clean_phone,
            code,
        )
        return True

    try:
        from alibabacloud_dysmsapi20170525.models import SendSmsRequest

        client = _get_client()
        request = SendSmsRequest(
            phone_numbers=clean_phone,
            sign_name=settings.SMS_SIGN_NAME,
            template_code=settings.SMS_TEMPLATE_CODE,
            template_param=json.dumps({"code": code}),
        )
        response = await client.send_sms_async(request)
        body = response.body

        if body.code == "OK":
            logger.info("短信发送成功: phone=%s", clean_phone)
            return True

        logger.error(
            "短信发送失败: phone=%s code=%s message=%s",
            clean_phone,
            body.code,
            body.message,
        )
        return False

    except Exception:
        logger.exception("短信发送异常: phone=%s", clean_phone)
        return False
