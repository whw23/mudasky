"""内容模块（文章 + 分类）E2E 测试。"""

import uuid

import pytest


@pytest.mark.e2e
class TestPublicContent:
    """公开内容端点测试（无需认证）。"""

    async def test_list_categories(self, anon_client):
        """匿名访问分类列表返回 200。"""
        resp = await anon_client.get(
            "/api/public/content/categories"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    async def test_list_published_articles(self, anon_client):
        """匿名访问已发布文章列表返回 200。"""
        resp = await anon_client.get(
            "/api/public/content/articles"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert isinstance(data["items"], list)


@pytest.mark.e2e
class TestCategoryCrud:
    """管理员分类 CRUD 测试。"""

    async def test_category_lifecycle(
        self, superuser_client
    ):
        """创建 -> 更新 -> 删除分类。"""
        suffix = uuid.uuid4().hex[:8]

        # 1. 创建分类
        create_resp = await superuser_client.post(
            "/api/admin/category/create",
            json={
                "name": f"E2E 测试分类 {suffix}",
                "slug": f"e2e-test-{suffix}",
                "description": "E2E 测试用分类",
                "sort_order": 99,
            },
        )
        assert create_resp.status_code == 201
        category = create_resp.json()
        category_id = category["id"]
        assert category["name"] == f"E2E 测试分类 {suffix}"
        assert category["slug"] == f"e2e-test-{suffix}"

        # 2. 更新分类
        update_resp = await superuser_client.post(
            f"/api/admin/category/edit/{category_id}",
            json={"name": f"E2E 更新分类 {suffix}"},
        )
        assert update_resp.status_code == 200
        assert (
            update_resp.json()["name"]
            == f"E2E 更新分类 {suffix}"
        )

        # 3. 删除分类
        delete_resp = await superuser_client.post(
            f"/api/admin/category/delete/{category_id}"
        )
        assert delete_resp.status_code == 204

    async def test_create_category_unauthorized(
        self, e2e_client
    ):
        """未认证创建分类返回 401。"""
        resp = await e2e_client.post(
            "/api/admin/category/create",
            json={
                "name": "unauthorized",
                "slug": "unauthorized",
            },
        )
        assert resp.status_code == 401


@pytest.mark.e2e
class TestArticleCrud:
    """文章 CRUD 测试。"""

    async def test_article_lifecycle(
        self, superuser_client, anon_client
    ):
        """创建分类 -> 创建文章 -> 公开访问 -> 更新 -> 删除文章 -> 删除分类。"""
        suffix = uuid.uuid4().hex[:8]

        # 1. 先创建一个分类
        cat_resp = await superuser_client.post(
            "/api/admin/category/create",
            json={
                "name": f"E2E 文章分类 {suffix}",
                "slug": f"e2e-article-cat-{suffix}",
            },
        )
        assert cat_resp.status_code == 201
        category_id = cat_resp.json()["id"]

        try:
            # 2. 创建文章
            create_resp = await superuser_client.post(
                "/api/portal/article/create",
                json={
                    "title": f"E2E 测试文章 {suffix}",
                    "slug": f"e2e-test-article-{suffix}",
                    "content": "这是 E2E 测试文章正文内容。",
                    "category_id": category_id,
                    "status": "published",
                },
            )
            assert create_resp.status_code == 201
            article = create_resp.json()
            article_id = article["id"]
            assert (
                article["title"] == f"E2E 测试文章 {suffix}"
            )
            assert article["status"] == "published"
            assert article["category_id"] == category_id

            # 3. 匿名用户可以访问已发布文章
            public_resp = await anon_client.get(
                f"/api/public/content/article/{article_id}"
            )
            assert public_resp.status_code == 200
            assert (
                public_resp.json()["title"]
                == f"E2E 测试文章 {suffix}"
            )

            # 4. 更新文章标题
            update_resp = await superuser_client.post(
                f"/api/portal/article/edit/{article_id}",
                json={
                    "title": f"E2E 更新文章 {suffix}"
                },
            )
            assert update_resp.status_code == 200
            assert (
                update_resp.json()["title"]
                == f"E2E 更新文章 {suffix}"
            )

            # 5. 删除文章
            del_resp = await superuser_client.post(
                f"/api/portal/article/delete/{article_id}"
            )
            assert del_resp.status_code == 204
        finally:
            # 6. 清理：删除分类
            await superuser_client.post(
                f"/api/admin/category/delete/{category_id}"
            )
