"""学生管理路由集成测试。

覆盖学生列表、详情、编辑、指定顾问、降为访客、文件列表等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_student(**kwargs) -> MagicMock:
    """创建模拟学生对象。"""
    s = MagicMock()
    s.id = kwargs.get("id", "student-001")
    s.phone = kwargs.get("phone", "+86-13800138000")
    s.username = kwargs.get("username", "student")
    s.is_active = kwargs.get("is_active", True)
    s.contact_status = kwargs.get("contact_status", None)
    s.contact_note = kwargs.get("contact_note", None)
    s.advisor_id = kwargs.get("advisor_id", None)
    s.storage_quota = kwargs.get("storage_quota", 104857600)
    s.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    s.updated_at = kwargs.get("updated_at", None)
    return s


class TestListStudents:
    """学生列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_students_success(
        self, client, superuser_headers
    ):
        """查询学生列表返回 200。"""
        self.mock_svc.list_students.return_value = (
            [_make_student()],
            1,
        )
        resp = await client.get(
            "/admin/students/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    async def test_list_students_empty(
        self, client, superuser_headers
    ):
        """空学生列表返回空结果。"""
        self.mock_svc.list_students.return_value = ([], 0)
        resp = await client.get(
            "/admin/students/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0

    async def test_list_students_with_advisor_filter(
        self, client, superuser_headers
    ):
        """按顾问 ID 筛选学生列表。"""
        self.mock_svc.list_students.return_value = (
            [_make_student(advisor_id="advisor-001")],
            1,
        )
        resp = await client.get(
            "/admin/students/list"
            "?advisor_id=advisor-001&my_students=false",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1


class TestGetStudentDetail:
    """学生详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_student_success(
        self, client, superuser_headers
    ):
        """查询学生详情返回 200。"""
        self.mock_svc.get_student.return_value = (
            _make_student()
        )
        resp = await client.get(
            "/admin/students/list/detail?user_id=student-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_student_not_found(
        self, client, superuser_headers
    ):
        """查询不存在的学生返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_student.side_effect = (
            NotFoundException(message="学生不存在")
        )
        resp = await client.get(
            "/admin/students/list/detail?user_id=nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestEditStudent:
    """编辑学生端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_edit_student_success(
        self, client, superuser_headers
    ):
        """编辑学生信息返回 200。"""
        self.mock_svc.edit_student.return_value = (
            _make_student(is_active=False)
        )
        resp = await client.post(
            "/admin/students/list/detail/edit",
            json={"user_id": "student-001", "is_active": False},
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_edit_student_not_found(
        self, client, superuser_headers
    ):
        """编辑不存在的学生返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.edit_student.side_effect = (
            NotFoundException(message="学生不存在")
        )
        resp = await client.post(
            "/admin/students/list/detail/edit",
            json={"user_id": "nonexistent", "is_active": False},
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestAssignAdvisor:
    """指定顾问端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_assign_advisor_success(
        self, client, superuser_headers
    ):
        """指定顾问返回 200。"""
        self.mock_svc.assign_advisor.return_value = None
        resp = await client.post(
            "/admin/students/list/detail/assign-advisor",
            json={
                "user_id": "student-001",
                "advisor_id": "advisor-001",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "顾问已分配"

    async def test_assign_advisor_not_found(
        self, client, superuser_headers
    ):
        """指定顾问时学生不存在返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.assign_advisor.side_effect = (
            NotFoundException(message="学生不存在")
        )
        resp = await client.post(
            "/admin/students/list/detail/assign-advisor",
            json={
                "user_id": "nonexistent",
                "advisor_id": "advisor-001",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 404

    async def test_assign_advisor_clear(
        self, client, superuser_headers
    ):
        """清除顾问分配返回 200。"""
        self.mock_svc.assign_advisor.return_value = None
        resp = await client.post(
            "/admin/students/list/detail/assign-advisor",
            json={
                "user_id": "student-001",
                "advisor_id": None,
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "顾问已分配"


class TestDowngradeStudent:
    """降为访客端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_downgrade_student_success(
        self, client, superuser_headers
    ):
        """降为访客返回 200。"""
        self.mock_svc.downgrade_to_visitor.return_value = None
        resp = await client.post(
            "/admin/students/list/detail/downgrade",
            json={"user_id": "student-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "已降为访客"


class TestListStudentDocuments:
    """学生文件列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_student_documents_success(
        self, client, superuser_headers
    ):
        """查询学生文件列表返回 200。"""
        self.mock_svc.list_student_documents.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/admin/students/list/detail/documents/list"
            "?user_id=student-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

class TestListAdvisors:
    """可选顾问列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_advisors_success(
        self, client, superuser_headers
    ):
        """查询顾问列表返回 200。"""
        advisor = MagicMock()
        advisor.id = "advisor-001"
        advisor.username = "顾问一"
        advisor.phone = "+86-13900139000"
        self.mock_svc.list_advisors.return_value = [advisor]
        resp = await client.get(
            "/admin/students/meta/advisors",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    async def test_list_advisors_empty(
        self, client, superuser_headers
    ):
        """无顾问时返回空列表。"""
        self.mock_svc.list_advisors.return_value = []
        resp = await client.get(
            "/admin/students/meta/advisors",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json() == []


class TestGetStudentDocument:
    """学生文件详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_student_document_success(
        self, client, superuser_headers
    ):
        """获取学生文件详情返回 200。"""
        doc = MagicMock()
        doc.id = "doc-001"
        doc.original_name = "成绩单.pdf"
        self.mock_svc.get_student_document.return_value = doc
        resp = await client.get(
            "/admin/students/list/detail/documents/list/detail"
            "?doc_id=doc-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_student_document_not_found(
        self, client, superuser_headers
    ):
        """文件不存在返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_student_document.side_effect = (
            NotFoundException(message="文件不存在")
        )
        resp = await client.get(
            "/admin/students/list/detail/documents/list/detail"
            "?doc_id=nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestDownloadStudentDocument:
    """学生文件下载端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 StudentService。"""
        with patch(
            "api.admin.students.router.StudentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_download_student_document_success(
        self, client, superuser_headers
    ):
        """下载学生文件返回文件内容。"""
        doc = MagicMock()
        doc.file_data = b"fake pdf content"
        doc.mime_type = "application/pdf"
        doc.original_name = "transcript.pdf"
        self.mock_svc.get_student_document.return_value = doc
        resp = await client.get(
            "/admin/students/list/detail/documents/list/detail/download"
            "?doc_id=doc-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.content == b"fake pdf content"
        assert "Content-Disposition" in resp.headers

    async def test_download_student_document_not_found(
        self, client, superuser_headers
    ):
        """下载不存在的文件返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_student_document.side_effect = (
            NotFoundException(message="文件不存在")
        )
        resp = await client.get(
            "/admin/students/list/detail/documents/list/detail/download"
            "?doc_id=nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404
