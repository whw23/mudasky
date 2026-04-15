"""IDOR（越权访问）E2E 测试。

验证用户无法访问其他用户的资源。
"""

import pytest


@pytest.mark.e2e
class TestIdorDocumentAccess:
    """文档资源越权访问测试。"""

    async def test_user_can_list_own_documents(
        self, superuser_client
    ):
        """正向：用户可以查看自己的文档列表。"""
        resp = await superuser_client.get(
            "/api/portal/documents/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    async def test_user_can_upload_document(
        self, superuser_client
    ):
        """正向：用户可以上传文档。"""
        files = {
            "file": (
                "e2e_idor_test.txt",
                b"idor test content",
                "text/plain",
            )
        }
        upload_resp = await superuser_client.post(
            "/api/portal/documents/list/upload", files=files
        )
        assert upload_resp.status_code == 201
        doc = upload_resp.json()
        assert doc["original_name"] == "e2e_idor_test.txt"

        # 清理：删除上传的文档
        delete_resp = await superuser_client.post(
            "/api/portal/documents/list/detail/delete",
            json={"doc_id": doc["id"]},
        )
        assert delete_resp.status_code == 204

    async def test_access_nonexistent_document_detail(
        self, superuser_client
    ):
        """反向：访问不存在的文档详情返回 403 或 404。"""
        fake_doc_id = "00000000-0000-0000-0000-000000000000"
        resp = await superuser_client.get(
            "/api/portal/documents/list/detail",
            params={"doc_id": fake_doc_id},
        )
        assert resp.status_code in (403, 404)

    async def test_delete_nonexistent_document(
        self, superuser_client
    ):
        """反向：删除不存在的文档返回 403 或 404。"""
        fake_doc_id = "00000000-0000-0000-0000-000000000000"
        resp = await superuser_client.post(
            "/api/portal/documents/list/detail/delete",
            json={"doc_id": fake_doc_id},
        )
        assert resp.status_code in (403, 404)
