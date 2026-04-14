"""Portal 内容路由集成测试。

覆盖用户文章 CRUD 端点：list/create/edit/delete。
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
    article.content_type = kwargs.get(
        "content_type", "markdown"
    )
    article.content = kwargs.get("content", "内容")
    article.file_url = kwargs.get("file_url", None)
    article.excerpt = kwargs.get("excerpt", "摘要")
    article.cover_image = kwargs.get("cover_image", None)
    article.category_id = kwargs.get(
        "category_id", "cat-001"
    )
    article.author_id = kwargs.get("author_id", "user-1")
    article.status = kwargs.get("status", "draft")
    article.is_pinned = kwargs.get("is_pinned", False)
    article.view_count = kwargs.get("view_count", 0)
    article.published_at = kwargs.get(
        "published_at", None
    )
    article.created_at = kwargs.get(
        "created_at", datetime.now(timezone.utc)
    )
    article.updated_at = kwargs.get("updated_at", None)
    return article


class TestListMyArticles:
    """用户查询自己文章列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.portal.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_my_articles_success(
        self, client, user_headers
    ):
        """认证用户查询自己的文章返回 200。"""
        self.mock_svc.list_my_articles.return_value = (
            [_make_article()],
            1,
        )
        resp = await client.get(
            "/portal/articles/list",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    async def test_list_my_articles_empty(
        self, client, user_headers
    ):
        """文章列表为空时返回空列表。"""
        self.mock_svc.list_my_articles.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/portal/articles/list",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []

    async def test_list_my_articles_with_pagination(
        self, client, user_headers
    ):
        """分页参数传递正确。"""
        self.mock_svc.list_my_articles.return_value = (
            [],
            0,
        )
        resp = await client.get(
            "/portal/articles/list?page=2&page_size=10",
            headers=user_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 2
        assert data["page_size"] == 10

    async def test_list_my_articles_no_auth(self, client):
        """未认证用户查询文章返回 403。"""
        resp = await client.get("/portal/articles/list")
        assert resp.status_code == 403


class TestCreateArticle:
    """用户创建文章端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.portal.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_create_article_success(
        self, client, user_headers
    ):
        """创建文章返回 201。"""
        self.mock_svc.create_article.return_value = (
            _make_article()
        )
        resp = await client.post(
            "/portal/articles/create",
            json={
                "title": "新文章",
                "slug": "new-article",
                "content": "文章内容",
                "category_id": "cat-001",
            },
            headers=user_headers,
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "测试文章"

    async def test_create_article_missing_fields(
        self, client, user_headers
    ):
        """缺少必填字段返回 422。"""
        resp = await client.post(
            "/portal/articles/create",
            json={"title": "新文章"},
            headers=user_headers,
        )
        assert resp.status_code == 422

    async def test_create_article_no_auth(self, client):
        """未认证用户创建文章返回 403。"""
        resp = await client.post(
            "/portal/articles/create",
            json={
                "title": "新文章",
                "slug": "new-article",
                "content": "内容",
                "category_id": "cat-001",
            },
        )
        assert resp.status_code == 403


class TestUpdateOwnArticle:
    """用户更新自己文章端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.portal.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_update_own_article_success(
        self, client, user_headers
    ):
        """更新自己的文章返回 200。"""
        self.mock_svc.update_own_article.return_value = (
            _make_article(title="更新后")
        )
        resp = await client.post(
            "/portal/articles/edit/article-001",
            json={"title": "更新后"},
            headers=user_headers,
        )
        assert resp.status_code == 200

    async def test_update_own_article_not_found(
        self, client, user_headers
    ):
        """更新不存在的文章返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.update_own_article.side_effect = (
            NotFoundException(
                message="文章不存在",
                code="ARTICLE_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/portal/articles/edit/nonexistent",
            json={"title": "更新"},
            headers=user_headers,
        )
        assert resp.status_code == 404

    async def test_update_other_article_forbidden(
        self, client, user_headers
    ):
        """更新别人的文章返回 403。"""
        from app.core.exceptions import ForbiddenException

        self.mock_svc.update_own_article.side_effect = (
            ForbiddenException(
                message="无权操作此文章",
                code="ARTICLE_ACCESS_DENIED",
            )
        )
        resp = await client.post(
            "/portal/articles/edit/article-002",
            json={"title": "更新"},
            headers=user_headers,
        )
        assert resp.status_code == 403


class TestDeleteOwnArticle:
    """用户删除自己文章端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.portal.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_delete_own_article_success(
        self, client, user_headers
    ):
        """删除自己的文章返回 204。"""
        self.mock_svc.delete_own_article.return_value = (
            None
        )
        resp = await client.post(
            "/portal/articles/delete/article-001",
            headers=user_headers,
        )
        assert resp.status_code == 204

    async def test_delete_own_article_not_found(
        self, client, user_headers
    ):
        """删除不存在的文章返回 404。"""
        from app.core.exceptions import NotFoundException

        self.mock_svc.delete_own_article.side_effect = (
            NotFoundException(
                message="文章不存在",
                code="ARTICLE_NOT_FOUND",
            )
        )
        resp = await client.post(
            "/portal/articles/delete/nonexistent",
            headers=user_headers,
        )
        assert resp.status_code == 404

    async def test_delete_other_article_forbidden(
        self, client, user_headers
    ):
        """删除别人的文章返回 403。"""
        from app.core.exceptions import ForbiddenException

        self.mock_svc.delete_own_article.side_effect = (
            ForbiddenException(
                message="无权操作此文章",
                code="ARTICLE_ACCESS_DENIED",
            )
        )
        resp = await client.post(
            "/portal/articles/delete/article-002",
            headers=user_headers,
        )
        assert resp.status_code == 403
