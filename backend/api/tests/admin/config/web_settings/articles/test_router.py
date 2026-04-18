"""文章路由集成测试。

覆盖管理员文章管理端点。
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


class TestAdminArticles:
    """管理员文章管理端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ArticleService。"""
        with patch(
            "api.admin.config.web_settings.articles.router.ArticleService"
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
            "/admin/web-settings/articles/list",
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
            "/admin/web-settings/articles/list/detail/edit",
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
            "/admin/web-settings/articles/list/detail/delete",
            json={"article_id": "article-001"},
            headers=superuser_headers,
        )
        assert resp.status_code == 204
