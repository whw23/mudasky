"""健康检查端点 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestHealth:
    """健康检查。"""

    async def test_health_returns_ok(self, anon_client):
        """健康检查返回 200。"""
        resp = await anon_client.get("/api/health")
        assert resp.status_code == 200
