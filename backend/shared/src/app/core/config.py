"""应用配置管理。

通过 Pydantic Settings 从环境变量加载配置。
Backend 不包含 JWT_SECRET——JWT 由 OpenResty 网关层管理。
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用全局配置。"""

    # 数据库
    DB_HOST: str = "db"
    DB_PORT: int = 5432
    DB_NAME: str = "mudasky"
    DB_USER: str = "mudasky"
    DB_PASSWORD: str = ""

    # 阿里云短信
    SMS_ACCESS_KEY_ID: str = ""
    SMS_ACCESS_KEY_SECRET: str = ""
    SMS_SIGN_NAME: str = ""
    SMS_TEMPLATE_CODE: str = ""

    # 文件上传
    MAX_UPLOAD_SIZE_MB: int = 10
    DEFAULT_STORAGE_QUOTA_MB: int = 100

    @property
    def database_url(self) -> str:
        """构建 asyncpg 数据库连接 URL。"""
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def max_upload_size_bytes(self) -> int:
        """单文件上传大小限制（字节）。"""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def default_storage_quota_bytes(self) -> int:
        """用户默认存储配额（字节）。"""
        return self.DEFAULT_STORAGE_QUOTA_MB * 1024 * 1024

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
