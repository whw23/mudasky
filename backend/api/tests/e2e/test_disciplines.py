"""学科分类管理模块 E2E 测试。"""

import pytest


@pytest.mark.e2e
class TestDisciplineCategories:
    """学科大分类接口测试。"""

    async def test_list_categories(self, superuser_client):
        """获取学科大分类列表返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/disciplines/categories/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_category_lifecycle(self, superuser_client):
        """创建 -> 编辑 -> 删除学科大分类（完整生命周期）。"""
        # 1. 创建
        create_resp = await superuser_client.post(
            "/api/admin/web-settings/disciplines/categories/list/create",
            json={"name": "E2E 测试大分类", "sort_order": 99},
        )
        assert create_resp.status_code == 201
        category = create_resp.json()
        category_id = category["id"]
        assert category["name"] == "E2E 测试大分类"
        assert category["sort_order"] == 99

        try:
            # 2. 编辑
            update_resp = await superuser_client.post(
                "/api/admin/web-settings/disciplines/categories/list/detail/edit",
                json={
                    "category_id": category_id,
                    "name": "E2E 测试大分类（已修改）",
                },
            )
            assert update_resp.status_code == 200
            assert update_resp.json()["name"] == "E2E 测试大分类（已修改）"

        finally:
            # 3. 删除（清理）
            delete_resp = await superuser_client.post(
                "/api/admin/web-settings/disciplines/categories/list/detail/delete",
                json={"category_id": category_id},
            )
            assert delete_resp.status_code == 204


@pytest.mark.e2e
class TestDisciplines:
    """学科接口测试。"""

    async def test_list_disciplines(self, superuser_client):
        """获取学科列表返回 200。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/disciplines/list"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_discipline_lifecycle(self, superuser_client):
        """创建分类 -> 创建学科 -> 编辑学科 -> 删除学科 -> 删除分类。"""
        # 1. 先创建大分类（学科依赖分类）
        cat_resp = await superuser_client.post(
            "/api/admin/web-settings/disciplines/categories/list/create",
            json={"name": "E2E 学科测试分类", "sort_order": 98},
        )
        assert cat_resp.status_code == 201
        category_id = cat_resp.json()["id"]

        try:
            # 2. 创建学科
            create_resp = await superuser_client.post(
                "/api/admin/web-settings/disciplines/list/create",
                json={
                    "category_id": category_id,
                    "name": "E2E 测试学科",
                    "sort_order": 1,
                },
            )
            assert create_resp.status_code == 201
            discipline = create_resp.json()
            discipline_id = discipline["id"]
            assert discipline["name"] == "E2E 测试学科"
            assert discipline["category_id"] == category_id

            try:
                # 3. 编辑学科
                update_resp = await superuser_client.post(
                    "/api/admin/web-settings/disciplines/list/detail/edit",
                    json={
                        "discipline_id": discipline_id,
                        "name": "E2E 测试学科（已修改）",
                    },
                )
                assert update_resp.status_code == 200
                assert (
                    update_resp.json()["name"] == "E2E 测试学科（已修改）"
                )

            finally:
                # 4. 删除学科
                del_disc_resp = await superuser_client.post(
                    "/api/admin/web-settings/disciplines/list/detail/delete",
                    json={"discipline_id": discipline_id},
                )
                assert del_disc_resp.status_code == 204

        finally:
            # 5. 删除大分类（清理）
            del_cat_resp = await superuser_client.post(
                "/api/admin/web-settings/disciplines/categories/list/detail/delete",
                json={"category_id": category_id},
            )
            assert del_cat_resp.status_code == 204


@pytest.mark.e2e
class TestDisciplineImportExport:
    """学科导入导出接口测试。"""

    async def test_import_template(self, superuser_client):
        """下载导入模板返回 Excel 文件。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/disciplines/import/template"
        )
        assert resp.status_code == 200
        content_type = resp.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "octet-stream" in content_type
        assert len(resp.content) > 0

    async def test_export(self, superuser_client):
        """导出学科分类返回 Excel 文件。"""
        resp = await superuser_client.get(
            "/api/admin/web-settings/disciplines/export"
        )
        assert resp.status_code == 200
        content_type = resp.headers.get("content-type", "")
        assert "spreadsheetml" in content_type or "octet-stream" in content_type
        assert len(resp.content) > 0


@pytest.mark.e2e
class TestDisciplinesUnauthorized:
    """学科分类接口未授权访问测试。"""

    async def test_list_categories_unauthorized(self, e2e_client):
        """未登录访问学科大分类列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/web-settings/disciplines/categories/list"
        )
        assert resp.status_code == 401

    async def test_list_disciplines_unauthorized(self, e2e_client):
        """未登录访问学科列表返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/web-settings/disciplines/list"
        )
        assert resp.status_code == 401

    async def test_create_category_unauthorized(self, e2e_client):
        """未登录创建学科大分类返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/web-settings/disciplines/categories/list/create",
            json={"name": "Hack 分类"},
        )
        assert resp.status_code == 401

    async def test_export_unauthorized(self, e2e_client):
        """未登录导出学科分类返回 401。"""
        resp = await e2e_client.get(
            "/api/admin/web-settings/disciplines/export"
        )
        assert resp.status_code == 401
