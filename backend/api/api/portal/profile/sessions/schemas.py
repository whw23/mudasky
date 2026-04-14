"""Portal 会话管理 Pydantic 数据模型。

定义会话响应等数据传输对象。
"""

from datetime import datetime

from pydantic import BaseModel


class SessionResponse(BaseModel):
    """活跃会话响应。"""

    id: str
    user_agent: str | None = None
    ip_address: str | None = None
    created_at: datetime
    is_current: bool = False
