"""core/config 单元测试。"""


def test_settings_loads_from_env(monkeypatch):
    """验证 Settings 能正确读取环境变量。"""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("DB_USER", "testuser")
    monkeypatch.setenv("DB_PASSWORD", "testpass")

    from app.core.config import Settings

    s = Settings()
    assert s.DB_HOST == "localhost"
    assert s.DB_NAME == "testdb"
    assert s.MAX_UPLOAD_SIZE_MB == 10


def test_settings_database_url(monkeypatch):
    """验证 database_url 属性拼接正确。"""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "testdb")
    monkeypatch.setenv("DB_USER", "testuser")
    monkeypatch.setenv("DB_PASSWORD", "testpass")

    from app.core.config import Settings

    s = Settings()
    assert s.database_url == (
        "postgresql+asyncpg://testuser:testpass@localhost:5432/testdb"
    )
