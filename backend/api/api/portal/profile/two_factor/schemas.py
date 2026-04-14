"""Portal 双因素认证 Pydantic 数据模型。

定义 TOTP 和短信 2FA 相关请求体。
"""

from pydantic import BaseModel, Field


class TotpCodeBody(BaseModel):
    """TOTP 验证码请求体。"""

    totp_code: str = Field(..., description="TOTP 验证码")


class Sms2faBody(BaseModel):
    """短信 2FA 请求体。"""

    phone: str = Field(..., description="手机号")
    code: str = Field(..., description="短信验证码")
