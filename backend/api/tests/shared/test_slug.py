"""slug 生成工具单元测试。

测试从标题生成 URL 友好的 slug。
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.content.models import Category
from app.utils.slug import generate_slug, generate_unique_slug


# ---- generate_slug ----


class TestGenerateSlug:
    """slug 生成测试。"""

    def test_english_title(self):
        """英文标题正确生成 slug。"""
        result = generate_slug("Hello World")
        assert result == "hello-world"

    def test_chinese_title(self):
        """中文标题生成拼音 slug。"""
        result = generate_slug("留学生活")
        assert len(result) > 0
        assert " " not in result

    def test_mixed_language(self):
        """中英混合标题。"""
        result = generate_slug("Hello 世界")
        assert len(result) > 0

    def test_special_characters(self):
        """特殊字符被移除或转换。"""
        result = generate_slug("Hello! World? #2024")
        assert "!" not in result
        assert "?" not in result
        assert "#" not in result

    def test_max_length(self):
        """超长标题截断到 200 字符。"""
        long_title = "A" * 500
        result = generate_slug(long_title)
        assert len(result) <= 200

    def test_empty_string(self):
        """空字符串返回空 slug。"""
        result = generate_slug("")
        assert result == ""

    def test_whitespace_only(self):
        """纯空白字符返回空 slug。"""
        result = generate_slug("   ")
        assert result == ""

    def test_numbers(self):
        """数字保留在 slug 中。"""
        result = generate_slug("Chapter 1 Section 2")
        assert "1" in result
        assert "2" in result


# ---- generate_unique_slug ----


class TestGenerateUniqueSlug:
    """唯一 slug 生成测试。

    使用真实 SQLAlchemy 模型（Category）以满足 select() 类型要求。
    """

    async def test_unique_first_try(self):
        """slug 不存在时直接返回。"""
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        result = await generate_unique_slug(
            session, "Hello World", Category
        )

        assert result == "hello-world"

    async def test_duplicate_adds_suffix(self):
        """slug 重复时追加数字后缀。"""
        session = AsyncMock()
        result_exists = MagicMock()
        result_exists.scalar_one_or_none.return_value = "existing-id"
        result_not_exists = MagicMock()
        result_not_exists.scalar_one_or_none.return_value = None

        session.execute = AsyncMock(
            side_effect=[result_exists, result_not_exists]
        )

        result = await generate_unique_slug(
            session, "Hello World", Category
        )

        assert result == "hello-world-2"

    async def test_multiple_duplicates(self):
        """多次重复时数字递增。"""
        session = AsyncMock()
        exists = MagicMock()
        exists.scalar_one_or_none.return_value = "id"
        not_exists = MagicMock()
        not_exists.scalar_one_or_none.return_value = None

        session.execute = AsyncMock(
            side_effect=[exists, exists, not_exists]
        )

        result = await generate_unique_slug(
            session, "Hello World", Category
        )

        assert result == "hello-world-3"

    async def test_exclude_id(self):
        """排除自身 ID 时不冲突。"""
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        result = await generate_unique_slug(
            session, "Hello", Category, exclude_id="self-id"
        )

        assert result == "hello"
        session.execute.assert_awaited_once()

    async def test_empty_slug_fallback(self):
        """空标题使用 untitled 作为兜底。"""
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        session.execute.return_value = mock_result

        result = await generate_unique_slug(
            session, "", Category
        )

        assert result == "untitled"
