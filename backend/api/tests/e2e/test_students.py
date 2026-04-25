"""学生管理模块网关集成测试。

通过网关的完整请求，验证学生管理相关接口。
"""

import pytest


@pytest.mark.e2e
class TestListAdvisors:
    """顾问列表接口测试。"""

    async def test_list_advisors(self, superuser_client):
        """超级管理员获取顾问列表返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/students/meta/advisors"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_list_advisors_unauthorized(
        self, e2e_client
    ):
        """未认证用户访问顾问列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/students/meta/advisors"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestListStudents:
    """学生列表接口测试。"""

    async def test_list_students(self, superuser_client):
        """超级管理员获取学生列表返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/students/list",
            params={"my_students": False},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)

    async def test_list_students_with_pagination(
        self, superuser_client
    ):
        """分页参数正常工作。"""
        resp = await superuser_client.get(
            "/api/admin/students/list",
            params={
                "page": 1,
                "page_size": 5,
                "my_students": False,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    async def test_list_students_my_students_filter(
        self, superuser_client
    ):
        """my_students=True 默认筛选当前顾问的学生。"""
        resp = await superuser_client.get(
            "/api/admin/students/list",
            params={"my_students": True},
        )
        assert resp.status_code == 200
        assert "items" in resp.json()

    async def test_list_students_unauthorized(
        self, e2e_client
    ):
        """未认证用户访问学生列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/students/list"
        )
        assert resp.status_code == 401

    async def test_list_students_anon_no_csrf(
        self, anon_client
    ):
        """匿名用户（无 CSRF header）访问返回 401。"""
        resp = await anon_client.get(
            "/api/admin/students/list"
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestStudentDetail:
    """学生详情接口测试。"""

    async def test_get_student_detail(
        self, superuser_client
    ):
        """从列表获取一个学生 ID，查询详情返回 200。"""
        list_resp = await superuser_client.get(
            "/api/admin/students/list",
            params={"my_students": False},
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        if not items:
            pytest.skip("无学生数据，跳过详情测试")

        user_id = items[0]["id"]
        resp = await superuser_client.get(
            "/api/admin/students/list/detail",
            params={"user_id": user_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == user_id

    async def test_get_student_detail_unauthorized(
        self, e2e_client
    ):
        """未认证用户查询学生详情返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/students/list/detail",
            params={"user_id": "nonexistent"},
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestStudentDocuments:
    """学生文件列表接口测试。"""

    async def test_list_student_documents(
        self, superuser_client
    ):
        """查询学生文件列表返回 200。"""
        # 先找到一个学生
        list_resp = await superuser_client.get(
            "/api/admin/students/list",
            params={"my_students": False},
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        if not items:
            pytest.skip("无学生数据，跳过文件列表测试")

        user_id = items[0]["id"]
        resp = await superuser_client.get(
            "/api/admin/students/list/detail/documents/list",
            params={"user_id": user_id},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data

    async def test_list_student_documents_with_pagination(
        self, superuser_client
    ):
        """学生文件列表分页参数正常工作。"""
        list_resp = await superuser_client.get(
            "/api/admin/students/list",
            params={"my_students": False},
        )
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        if not items:
            pytest.skip("无学生数据，跳过文件分页测试")

        user_id = items[0]["id"]
        resp = await superuser_client.get(
            "/api/admin/students/list/detail/documents/list",
            params={
                "user_id": user_id,
                "page": 1,
                "page_size": 5,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5

    async def test_list_student_documents_unauthorized(
        self, e2e_client
    ):
        """未认证用户查询学生文件列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/students/list/detail/documents/list",
            params={"user_id": "nonexistent"},
        )
        assert resp.status_code == 401
