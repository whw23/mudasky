"""内容领域公开路由单元测试。

覆盖文章列表、文章详情、分类列表端点及 ETag 304 分支。
"""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.core.exceptions import NotFoundException


def _make_article(**overrides):
    """创建模拟文章对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="art-001", title="测试文章",
        slug="test-article", content_type="markdown",
        content="内容", file_url=None,
        excerpt="摘要", cover_image=None,
        category_id="cat-001", author_id="user-1",
        status="published", is_pinned=False,
        view_count=0,
        published_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
        updated_at=None,
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


def _make_category(**overrides):
    """创建模拟分类对象（SimpleNamespace 兼容 from_attributes）。"""
    defaults = dict(
        id="cat-001", name="测试分类",
        slug="test-cat", description="描述",
        sort_order=0,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    return SimpleNamespace(**defaults)


class TestListPublishedArticles:
    """分页查询已发布文章端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 ContentService。"""
        with patch(
            "api.public.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_articles_success(self, client):
        """查询已发布文章列表返回 200。"""
        self.mock_svc.list_published.return_value = (
            [_make_article()], 1
        )
        resp = await client.get("/public/content/articles")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

    async def test_list_articles_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        self.mock_svc.list_published.return_value = ([], 0)
        resp1 = await client.get("/public/content/articles")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/content/articles",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_articles_empty(self, client):
        """空文章列表返回空数组。"""
        self.mock_svc.list_published.return_value = ([], 0)
        resp = await client.get("/public/content/articles")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0


class TestGetPublishedArticle:
    """获取已发布文章详情端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_get_article_success(self, client):
        """获取已发布文章返回 200。"""
        article = _make_article(
            updated_at=datetime(
                2026, 1, 1, tzinfo=timezone.utc
            )
        )
        self.mock_svc.get_article.return_value = article
        resp = await client.get(
            "/public/content/article/art-001"
        )
        assert resp.status_code == 200

    async def test_get_article_not_published(self, client):
        """获取未发布文章返回 404。"""
        article = _make_article(status="draft")
        self.mock_svc.get_article.return_value = article
        resp = await client.get(
            "/public/content/article/art-001"
        )
        assert resp.status_code == 404

    async def test_get_article_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        article = _make_article(
            updated_at=datetime(
                2026, 1, 1, tzinfo=timezone.utc
            )
        )
        self.mock_svc.get_article.return_value = article
        resp1 = await client.get(
            "/public/content/article/art-001"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/content/article/art-001",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_get_article_not_found(self, client):
        """文章不存在返回 404。"""
        self.mock_svc.get_article.side_effect = (
            NotFoundException(
                message="文章不存在",
                code="ARTICLE_NOT_FOUND",
            )
        )
        resp = await client.get(
            "/public/content/article/nonexistent"
        )
        assert resp.status_code == 404


class TestListCategories:
    """查询分类列表端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        with patch(
            "api.public.content.router.ContentService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_categories_success(self, client):
        """查询分类列表返回 200。"""
        cat = _make_category()
        self.mock_svc.list_categories.return_value = [cat]
        self.mock_svc.get_article_counts_by_category.return_value = {
            "cat-001": 3
        }
        resp = await client.get(
            "/public/content/categories"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1

    async def test_list_categories_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        cat = _make_category()
        self.mock_svc.list_categories.return_value = [cat]
        self.mock_svc.get_article_counts_by_category.return_value = {}
        resp1 = await client.get(
            "/public/content/categories"
        )
        etag = resp1.headers.get("ETag")
        assert etag is not None

        resp2 = await client.get(
            "/public/content/categories",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_categories_empty(self, client):
        """空分类列表返回空数组。"""
        self.mock_svc.list_categories.return_value = []
        self.mock_svc.get_article_counts_by_category.return_value = {}
        resp = await client.get(
            "/public/content/categories"
        )
        assert resp.status_code == 200
        assert resp.json() == []
