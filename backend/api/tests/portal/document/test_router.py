"""文档路由集成测试。

覆盖文件上传、列表查询、详情、下载、删除端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.db.document.models import DocumentCategory


def _make_document(**kwargs) -> MagicMock:
    """创建模拟文档对象。"""
    doc = MagicMock()
    doc.id = kwargs.get("id", "doc-001")
    doc.user_id = kwargs.get("user_id", "user-1")
    doc.filename = kwargs.get("filename", "abc123.pdf")
    doc.original_name = kwargs.get(
        "original_name", "成绩单.pdf"
    )
    doc.file_data = kwargs.get(
        "file_data", b"fake file content"
    )
    doc.file_size = kwargs.get("file_size", 1024)
    doc.mime_type = kwargs.get(
        "mime_type", "application/pdf"
    )
    doc.category = kwargs.get(
        "category", DocumentCategory.OTHER
    )
    doc.file_hash = kwargs.get("file_hash", "sha256hash")
    doc.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    doc.updated_at = kwargs.get("updated_at", None)
    return doc


def _make_user_model(**kwargs) -> MagicMock:
    """创建模拟用户模型。"""
    user = MagicMock()
    user.storage_quota = kwargs.get(
        "storage_quota", 104857600
    )
    return user


class TestUploadDocument:
    """文件上传端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 document.service。"""
        with patch(
            "api.portal.document.router.upload_document"
        ) as mock_fn:
            self.mock_upload = mock_fn
            yield

    async def test_upload_success(
        self, client, user_headers
    ):
        """上传文件成功返回 201。"""
        self.mock_upload.return_value = (
            _make_document()
        )
        resp = await client.post(
            "/portal/documents/list/upload",
            files={
                "file": ("test.pdf", b"fake-content", "application/pdf")
            },
            headers=user_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "doc-001"

    async def test_upload_no_auth(self, client):
        """未认证无法上传文件。"""
        resp = await client.post(
            "/portal/documents/list/upload",
            files={
                "file": ("test.pdf", b"fake-content", "application/pdf")
            },
        )
        assert resp.status_code == 403

    async def test_upload_no_file(
        self, client, user_headers
    ):
        """缺少文件返回 422。"""
        resp = await client.post(
            "/portal/documents/list/upload",
            headers=user_headers,
        )
        assert resp.status_code == 422


class TestListDocuments:
    """文档列表查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 document 依赖。"""
        with (
            patch(
                "api.portal.document.router.list_documents"
            ) as mock_list,
            patch(
                "api.portal.document.router.repository"
            ) as mock_repo,
            patch(
                "api.portal.document.router.user_repo"
            ) as mock_user_repo,
        ):
            self.mock_list = mock_list
            self.mock_repo = mock_repo
            self.mock_user_repo = mock_user_repo
            yield

    async def test_list_documents_success(
        self, client, user_headers
    ):
        """认证用户查询文档列表返回 200。"""
        self.mock_list.return_value = (
            [_make_document()],
            1,
        )
        self.mock_repo.get_user_storage_used = AsyncMock(
            return_value=1024
        )
        self.mock_user_repo.get_by_id = AsyncMock(
            return_value=_make_user_model()
        )
        resp = await client.get(
            "/portal/documents/list",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert "storage_used" in data
        assert "storage_quota" in data

    async def test_list_documents_no_auth(self, client):
        """未认证无法查询文档列表。"""
        resp = await client.get("/portal/documents/list")
        assert resp.status_code == 403


class TestGetDocument:
    """文档详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 document.service。"""
        with patch(
            "api.portal.document.router.get_document"
        ) as mock_fn:
            self.mock_get = mock_fn
            yield

    async def test_get_document_success(
        self, client, user_headers
    ):
        """获取文档详情返回 200。"""
        self.mock_get.return_value = (
            _make_document()
        )
        resp = await client.get(
            "/portal/documents/list/detail?doc_id=doc-001",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "doc-001"

    async def test_get_document_not_found(
        self, client, user_headers
    ):
        """文档不存在返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_get.side_effect = (
            NotFoundException(message="文档不存在")
        )
        resp = await client.get(
            "/portal/documents/list/detail?doc_id=nonexistent",
            headers=user_headers,
        )
        assert resp.status_code == 404

    async def test_get_document_no_auth(self, client):
        """未认证无法获取文档详情。"""
        resp = await client.get(
            "/portal/documents/list/detail?doc_id=doc-001"
        )
        assert resp.status_code == 403


class TestDownloadDocument:
    """下载文档端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 document.service。"""
        with patch(
            "api.portal.document.router.get_document"
        ) as mock_fn:
            self.mock_get = mock_fn
            yield

    async def test_download_document_success(
        self, client, user_headers
    ):
        """下载文档返回文件内容。"""
        doc = _make_document(original_name="transcript.pdf")
        self.mock_get.return_value = doc
        resp = await client.get(
            "/portal/documents/list/detail/download?doc_id=doc-001",
            headers=user_headers,
        )
        assert resp.status_code == 200
        assert resp.content == b"fake file content"
        assert "Content-Disposition" in resp.headers
        assert "transcript.pdf" in resp.headers["Content-Disposition"]

    async def test_download_document_not_found(
        self, client, user_headers
    ):
        """下载不存在的文档返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_get.side_effect = NotFoundException(
            message="文档不存在"
        )
        resp = await client.get(
            "/portal/documents/list/detail/download?doc_id=nonexistent",
            headers=user_headers,
        )
        assert resp.status_code == 404

    async def test_download_document_no_auth(self, client):
        """未认证无法下载文档。"""
        resp = await client.get(
            "/portal/documents/list/detail/download?doc_id=doc-001"
        )
        assert resp.status_code == 403


class TestDeleteDocument:
    """删除文档端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_deps(self):
        """模拟 document.service。"""
        with patch(
            "api.portal.document.router.delete_document"
        ) as mock_fn:
            self.mock_delete = mock_fn
            yield

    async def test_delete_document_success(
        self, client, user_headers
    ):
        """删除文档成功返回 204。"""
        self.mock_delete.return_value = None
        resp = await client.post(
            "/portal/documents/list/detail/delete",
            json={"doc_id": "doc-001"},
            headers=user_headers,
        )
        assert resp.status_code == 204

    async def test_delete_document_not_found(
        self, client, user_headers
    ):
        """删除不存在的文档返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_delete.side_effect = (
            NotFoundException(message="文档不存在")
        )
        resp = await client.post(
            "/portal/documents/list/detail/delete",
            json={"doc_id": "nonexistent"},
            headers=user_headers,
        )
        assert resp.status_code == 404

    async def test_delete_document_no_auth(self, client):
        """未认证无法删除文档。"""
        resp = await client.post(
            "/portal/documents/list/detail/delete",
            json={"doc_id": "doc-001"},
        )
        assert resp.status_code == 403
