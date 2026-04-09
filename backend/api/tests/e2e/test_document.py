"""文档模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestDocumentCrud:
    """文档上传、查询、下载、删除测试。"""

    async def test_document_lifecycle(
        self, superuser_client
    ):
        """上传 -> 列表验证 -> 详情 -> 下载 -> 删除。"""
        # 1. 上传文件
        files = {
            "file": (
                "e2e_test.txt",
                b"hello world from e2e test",
                "text/plain",
            )
        }
        upload_resp = await superuser_client.post(
            "/api/documents/upload", files=files
        )
        assert upload_resp.status_code == 201
        doc = upload_resp.json()
        doc_id = doc["id"]
        assert doc["original_name"] == "e2e_test.txt"
        assert doc["mime_type"] == "text/plain"
        assert doc["file_size"] > 0

        # 2. 列表中包含上传的文档
        list_resp = await superuser_client.get(
            "/api/documents"
        )
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert "items" in list_data
        doc_ids = [d["id"] for d in list_data["items"]]
        assert doc_id in doc_ids
        assert "storage_used" in list_data
        assert "storage_quota" in list_data

        # 3. 获取文档详情
        detail_resp = await superuser_client.get(
            f"/api/documents/{doc_id}"
        )
        assert detail_resp.status_code == 200
        assert detail_resp.json()["id"] == doc_id

        # 4. 下载文件
        download_resp = await superuser_client.get(
            f"/api/documents/{doc_id}/download"
        )
        assert download_resp.status_code == 200
        assert b"hello world from e2e test" in download_resp.content

        # 5. 删除文档
        delete_resp = await superuser_client.delete(
            f"/api/documents/{doc_id}"
        )
        assert delete_resp.status_code == 204

    async def test_upload_without_auth(self, e2e_client):
        """未认证上传文件返回 401。"""
        files = {
            "file": (
                "unauth.txt",
                b"should fail",
                "text/plain",
            )
        }
        resp = await e2e_client.post(
            "/api/documents/upload", files=files
        )
        assert resp.status_code == 401
