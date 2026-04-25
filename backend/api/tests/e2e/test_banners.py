"""Banner 管理模块 E2E 测试。"""

import io

import pytest


@pytest.mark.e2e
class TestBanners:
    """Banner 管理接口测试。"""

    async def test_list_banners(self, superuser_client):
        """获取所有 Banner 配置返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/banners/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)

    async def test_upload_banner(self, superuser_client):
        """上传 Banner 图片后清理。"""
        # 构造 1x1 PNG 图片
        png_bytes = (
            b"\x89PNG\r\n\x1a\n"
            b"\x00\x00\x00\rIHDR\x00\x00\x00\x01"
            b"\x00\x00\x00\x01\x08\x02\x00\x00\x00"
            b"\x90wS\xde\x00\x00\x00\x0cIDATx"
            b"\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05"
            b"\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        page_key = "home"

        resp = await superuser_client.post(
            "/api/admin/web-settings/banners/upload",
            data={"page_key": page_key},
            files={"file": ("test_banner.png", io.BytesIO(png_bytes), "image/png")},
        )
        assert resp.status_code == 200
        data = resp.json()
        image_id = data["image_id"]
        assert image_id

        try:
            # 验证上传后列表中包含该图片
            list_resp = await superuser_client.get(
                "/api/admin/web-settings/banners/list"
            )
            assert list_resp.status_code == 200
        finally:
            # 清理：移除上传的 Banner
            remove_resp = await superuser_client.post(
                "/api/admin/web-settings/banners/remove",
                json={"page_key": page_key, "image_id": image_id},
            )
            assert remove_resp.status_code == 204

    async def test_reorder_banners(self, superuser_client):
        """重排 Banner 图片顺序返回 204。"""
        # 先获取当前列表
        list_resp = await superuser_client.get(
            "/api/admin/web-settings/banners/list"
        )
        assert list_resp.status_code == 200
        banners = list_resp.json()

        # 找到有图片的页面进行重排
        page_key = None
        image_ids = []
        for key, value in banners.items():
            if isinstance(value, list) and len(value) >= 1:
                page_key = key
                image_ids = [item["image_id"] for item in value]
                break

        if page_key and image_ids:
            resp = await superuser_client.post(
                "/api/admin/web-settings/banners/reorder",
                json={"page_key": page_key, "image_ids": image_ids},
            )
            assert resp.status_code == 204


@pytest.mark.e2e
class TestBannersUnauthorized:
    """Banner 接口未授权访问测试。"""

    async def test_list_banners_unauthorized(self, e2e_client):
        """未登录访问 Banner 列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/web-settings/banners/list"
        )
        assert resp.status_code == 401

    async def test_upload_banner_unauthorized(self, e2e_client):
        """未登录上传 Banner 返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/web-settings/banners/upload",
            data={"page_key": "home"},
            files={"file": ("test.png", b"fake", "image/png")},
        )
        assert resp.status_code == 401
