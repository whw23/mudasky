"""Portal 文档模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestDocumentList:
    """文档列表接口测试。"""

    async def test_list_documents(self, superuser_client):
        """已认证用户查询文档列表返回 200。"""
        resp = await superuser_client.get(
            "/api/portal/documents/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "storage_used" in data
        assert "storage_quota" in data

    async def test_list_documents_unauthorized(
        self, e2e_client
    ):
        """未认证用户查询文档列表返回 401。"""
        resp = await e2e_client.get(
            "/api/portal/documents/list"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestDocumentLifecycle:
    """文档上传、详情、下载、删除全生命周期测试。"""

    async def test_upload_and_cleanup(
        self, superuser_client
    ):
        """上传文档 -> 详情 -> 下载 -> 删除。"""
        doc_id = None
        try:
            # 1. 上传文件
            files = {
                "file": (
                    "e2e_portal_test.txt",
                    b"portal document e2e content",
                    "text/plain",
                )
            }
            upload_resp = await superuser_client.post(
                "/api/portal/documents/list/upload",
                files=files,
            )
            assert upload_resp.status_code == 201
            doc = upload_resp.json()
            doc_id = doc["id"]
            assert doc["original_name"] == "e2e_portal_test.txt"
            assert doc["mime_type"] == "text/plain"
            assert doc["file_size"] > 0

            # 2. 获取文档详情
            detail_resp = await superuser_client.get(
                "/api/portal/documents/list/detail",
                params={"doc_id": doc_id},
            )
            assert detail_resp.status_code == 200
            assert detail_resp.json()["id"] == doc_id

            # 3. 下载文件
            download_resp = await superuser_client.get(
                "/api/portal/documents/list/detail/download",
                params={"doc_id": doc_id},
            )
            assert download_resp.status_code == 200
            assert (
                b"portal document e2e content"
                in download_resp.content
            )
        finally:
            # 4. 清理：删除文档
            if doc_id:
                delete_resp = await superuser_client.post(
                    "/api/portal/documents/list/detail/delete",
                    json={"doc_id": doc_id},
                )
                assert delete_resp.status_code == 204

    async def test_upload_unauthorized(self, e2e_client):
        """未认证用户上传文件返回 401。"""
        files = {
            "file": (
                "unauth.txt",
                b"should fail",
                "text/plain",
            )
        }
        resp = await e2e_client.post(
            "/api/portal/documents/list/upload", files=files
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestDocumentDelete:
    """文档删除接口测试。"""

    async def test_delete_document(self, superuser_client):
        """上传后删除文档返回 204。"""
        # 1. 先上传一个文件
        files = {
            "file": (
                "e2e_delete_test.txt",
                b"to be deleted",
                "text/plain",
            )
        }
        upload_resp = await superuser_client.post(
            "/api/portal/documents/list/upload", files=files
        )
        assert upload_resp.status_code == 201
        doc_id = upload_resp.json()["id"]

        # 2. 删除
        delete_resp = await superuser_client.post(
            "/api/portal/documents/list/detail/delete",
            json={"doc_id": doc_id},
        )
        assert delete_resp.status_code == 204

    async def test_delete_document_unauthorized(
        self, e2e_client
    ):
        """未认证用户删除文档返回 401。"""
        resp = await e2e_client.post(
            "/api/portal/documents/list/detail/delete",
            json={"doc_id": "nonexistent"},
        )
        assert resp.status_code == 401
