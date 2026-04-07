"""短信发送模块。

当前为开发环境存根实现，生产环境需对接阿里云短信服务。
"""

import logging

logger = logging.getLogger(__name__)


async def send_sms_code(phone: str, code: str) -> bool:
    """发送短信验证码。

    TODO: 对接阿里云短信
    SECURITY: 仅开发环境使用
    """
    logger.info("发送短信验证码（开发模式）phone=%s code=%s", phone, code)
    return True
