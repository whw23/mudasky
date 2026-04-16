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
