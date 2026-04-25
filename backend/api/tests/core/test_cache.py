"""HTTP 缓存工具单元测试。

覆盖 set_cache_headers 的 304 命中、Cache-Control 和 no-cache 分支。
"""

import hashlib
from unittest.mock import MagicMock, patch

from fastapi import Response

from api.core.cache import set_cache_headers


class TestSetCacheHeaders:
    """set_cache_headers 缓存设置测试。"""

    def test_etag_hit_returns_304(self):
        """ETag 命中时返回 True 并设置 304。"""
        response = Response()
        seed = "test-seed"
        etag = f'"{hashlib.md5(seed.encode()).hexdigest()}"'

        result = set_cache_headers(response, seed, etag)

        assert result is True
        assert response.status_code == 304

    def test_etag_miss_returns_false(self):
        """ETag 不匹配时返回 False。"""
        response = Response()

        result = set_cache_headers(
            response, "seed", '"wrong"'
        )

        assert result is False
        assert "ETag" in response.headers

    @patch("api.core.cache.settings")
    def test_cache_control_with_max_age(self, mock_settings):
        """CACHE_MAX_AGE > 0 时设置 public max-age。"""
        mock_settings.CACHE_MAX_AGE = 3600
        response = Response()

        result = set_cache_headers(response, "seed", None)

        assert result is False
        assert response.headers["Cache-Control"] == (
            "public, max-age=3600"
        )

    @patch("api.core.cache.settings")
    def test_cache_control_no_cache(self, mock_settings):
        """CACHE_MAX_AGE = 0 时设置 no-cache。"""
        mock_settings.CACHE_MAX_AGE = 0
        response = Response()

        result = set_cache_headers(response, "seed", None)

        assert result is False
        assert response.headers["Cache-Control"] == "no-cache"

    def test_etag_format(self):
        """ETag 使用 MD5 哈希并加引号。"""
        response = Response()
        seed = "my-resource"
        expected = f'"{hashlib.md5(seed.encode()).hexdigest()}"'

        set_cache_headers(response, seed, None)

        assert response.headers["ETag"] == expected

    def test_no_if_none_match(self):
        """if_none_match 为 None 时不命中 304。"""
        response = Response()

        result = set_cache_headers(
            response, "seed", None
        )

        assert result is False
