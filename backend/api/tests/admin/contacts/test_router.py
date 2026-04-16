"""访客联系路由集成测试。

覆盖访客列表、详情、标记、备注、历史、升为学员等端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_contact(**kwargs) -> MagicMock:
    """创建模拟访客对象。"""
    c = MagicMock()
    c.id = kwargs.get("id", "contact-001")
    c.phone = kwargs.get("phone", "+86-13800138000")
    c.username = kwargs.get("username", "visitor")
    c.contact_status = kwargs.get(
        "contact_status", "pending"
    )
    c.contact_note = kwargs.get("contact_note", None)
    c.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    return c


def _make_record(**kwargs) -> MagicMock:
    """创建模拟联系记录。"""
    r = MagicMock()
    r.id = kwargs.get("id", "record-001")
    r.staff_id = kwargs.get("staff_id", "staff-1")
    r.action = kwargs.get("action", "mark_contacted")
    r.note = kwargs.get("note", None)
    r.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    return r


class TestListContacts:
    """访客列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_contacts_success(
        self, client, superuser_headers
    ):
        """查询访客列表返回 200。"""
        self.mock_svc.list_contacts.return_value = (
            [_make_contact()],
            1,
        )
        resp = await client.get(
            "/admin/contacts/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    async def test_list_contacts_empty(
        self, client, superuser_headers
    ):
        """空访客列表返回空结果。"""
        self.mock_svc.list_contacts.return_value = ([], 0)
        resp = await client.get(
            "/admin/contacts/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0


class TestGetContactDetail:
    """访客详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_contact_success(
        self, client, superuser_headers
    ):
        """查询访客详情返回 200。"""
        self.mock_svc.get_contact.return_value = (
            _make_contact()
        )
        resp = await client.get(
            "/admin/contacts/list/detail"
            "?user_id=contact-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_get_contact_not_found(
        self, client, superuser_headers
    ):
        """查询不存在的访客返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.get_contact.side_effect = (
            NotFoundException(message="访客不存在")
        )
        resp = await client.get(
            "/admin/contacts/list/detail"
            "?user_id=nonexistent",
            headers=superuser_headers,
        )
        assert resp.status_code == 404


class TestMarkContact:
    """标记联系状态端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_mark_contact_success(
        self, client, superuser_headers
    ):
        """标记联系状态返回 200。"""
        self.mock_svc.mark_status.return_value = None
        resp = await client.post(
            "/admin/contacts/list/detail/mark",
            json={
                "user_id": "contact-001",
                "status": "contacted",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "状态已更新"


class TestAddNote:
    """添加备注端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_add_note_success(
        self, client, superuser_headers
    ):
        """添加备注返回 200。"""
        self.mock_svc.add_note.return_value = None
        resp = await client.post(
            "/admin/contacts/list/detail/note",
            json={
                "user_id": "contact-001",
                "note": "测试备注",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "备注已添加"


class TestGetContactHistory:
    """联系历史端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_history_success(
        self, client, superuser_headers
    ):
        """获取联系历史返回 200。"""
        self.mock_svc.get_history.return_value = [
            _make_record()
        ]
        resp = await client.get(
            "/admin/contacts/list/detail/history"
            "?user_id=contact-001",
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1


class TestUpgradeContact:
    """升为学员端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContactService。"""
        with patch(
            "api.admin.contacts.router.ContactService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_upgrade_contact_success(
        self, client, superuser_headers
    ):
        """升为学员返回 200。"""
        self.mock_svc.upgrade_to_student.return_value = None
        resp = await client.post(
            "/admin/contacts/list/detail/upgrade",
            json={"user_id": "contact-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "已升为学员"
