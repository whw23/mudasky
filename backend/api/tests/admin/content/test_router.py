"""内容路由集成测试。

覆盖文章和分类的公开查询、用户操作、管理员管理端点。
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _make_article(**kwargs) -> MagicMock:
    """创建模拟文章对象。"""
    article = MagicMock()
    article.id = kwargs.get("id", "article-001")
    article.title = kwargs.get("title", "测试文章")
    article.slug = kwargs.get("slug", "test-article")
    article.content_type = kwargs.get("content_type", "markdown")
    article.content = kwargs.get("content", "内容")
    article.file_url = kwargs.get("file_url", None)
    article.excerpt = kwargs.get("excerpt", "摘要")
    article.cover_image = kwargs.get("cover_image", None)
    article.category_id = kwargs.get(
        "category_id", "cat-001"
    )
    article.author_id = kwargs.get("author_id", "user-1")
    article.status = kwargs.get("status", "published")
    article.is_pinned = kwargs.get("is_pinned", False)
    article.view_count = kwargs.get("view_count", 0)
    article.published_at = kwargs.get(
        "published_at", datetime.now(timezone.utc)
    )
    article.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    article.updated_at = kwargs.get("updated_at", None)
    return article


def _make_category(**kwargs) -> MagicMock:
    """创建模拟分类对象。"""
    cat = MagicMock()
    cat.id = kwargs.get("id", "cat-001")
    cat.name = kwargs.get("name", "测试分类")
    cat.slug = kwargs.get("slug", "test-category")
    cat.description = kwargs.get("description", "描述")
    cat.sort_order = kwargs.get("sort_order", 0)
    cat.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    return cat


class TestPublicArticles:
    """公开文章查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.public.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_published_articles(self, client):
        """查询已发布文章列表返回 200。"""
        self.mock_svc.list_published.return_value = (
            [_make_article()],
            1,
        )
        resp = await client.get(
            "/public/content/articles"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_articles_with_pagination(
        self, client
    ):
        """分页参数传递正确。"""
        self.mock_svc.list_published.return_value = ([], 0)
        resp = await client.get(
            "/public/content/articles?page=2&page_size=10"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2
        assert data["page_size"] == 10

    async def test_get_published_article(self, client):
        """查询已发布文章详情返回 200。"""
        self.mock_svc.get_article.return_value = (
            _make_article(status="published")
        )
        resp = await client.get(
            "/public/content/article/article-001"
        )
        assert resp.status_code == 200

    async def test_get_draft_article_404(self, client):
        """查询草稿文章返回 404。"""
        self.mock_svc.get_article.return_value = (
            _make_article(status="draft")
        )
        resp = await client.get(
            "/public/content/article/article-001"
        )
        assert resp.status_code == 404


class TestPublicCategories:
    """公开分类查询端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.public.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_categories(self, client):
        """查询分类列表返回 200。"""
        self.mock_svc.list_categories.return_value = [
            _make_category()
        ]
        self.mock_svc.get_article_counts_by_category.return_value = {
            "cat-001": 5
        }
        resp = await client.get(
            "/public/content/categories"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["article_count"] == 5


class TestAdminArticles:
    """管理员文章管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.admin.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_admin_list_articles(
        self, client, superuser_headers
    ):
        """管理员查询所有文章返回 200。"""
        self.mock_svc.list_all_articles.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/admin/articles/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_update_article(
        self, client, superuser_headers
    ):
        """管理员更新文章返回 200。"""
        self.mock_svc.update_article.return_value = (
            _make_article()
        )
        resp = await client.post(
            "/admin/articles/list/detail/edit",
            json={
                "article_id": "article-001",
                "status": "published",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_delete_article(
        self, client, superuser_headers
    ):
        """管理员删除文章返回 204。"""
        self.mock_svc.delete_article_admin.return_value = (
            None
        )
        resp = await client.post(
            "/admin/articles/list/detail/delete",
            json={"article_id": "article-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204


class TestAdminCategories:
    """管理员分类管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.admin.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_admin_list_categories(
        self, client, superuser_headers
    ):
        """管理员查询分类列表返回 200。"""
        self.mock_svc.list_categories.return_value = []
        self.mock_svc.get_article_counts_by_category.return_value = {}
        resp = await client.get(
            "/admin/categories/list",
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_create_category(
        self, client, superuser_headers
    ):
        """管理员创建分类返回 201。"""
        self.mock_svc.create_category.return_value = (
            _make_category()
        )
        resp = await client.post(
            "/admin/categories/list/create",
            json={
                "name": "新分类",
                "slug": "new-cat",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 201

    async def test_admin_update_category(
        self, client, superuser_headers
    ):
        """管理员更新分类返回 200。"""
        self.mock_svc.update_category.return_value = (
            _make_category(name="更新分类")
        )
        resp = await client.post(
            "/admin/categories/list/detail/edit",
            json={
                "category_id": "cat-001",
                "name": "更新分类",
            },
            headers=superuser_headers,
        )
        assert resp.status_code == 200

    async def test_admin_delete_category(
        self, client, superuser_headers
    ):
        """管理员删除分类返回 204。"""
        self.mock_svc.delete_category.return_value = None
        resp = await client.post(
            "/admin/categories/list/detail/delete",
            json={"category_id": "cat-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204
