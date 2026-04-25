"""学科分类公开路由单元测试。

覆盖 GET /public/disciplines/list 端点的正向和缓存场景。
"""

from unittest.mock import AsyncMock, patch

import pytest

from api.public.discipline.schemas import (
    DisciplineCategoryTree,
    DisciplineItem,
)


class TestListDisciplines:
    """获取学科分类树端点测试。"""

    @pytest.fixture(autouse=True)
    def _patch_service(self):
        """模拟 DisciplinePublicService。"""
        with patch(
            "api.public.discipline.router.DisciplinePublicService"
        ) as mock_cls:
            self.mock_svc = AsyncMock()
            mock_cls.return_value = self.mock_svc
            yield

    async def test_list_disciplines_success(self, client):
        """正常返回学科分类树，状态码 200。"""
        tree = [
            DisciplineCategoryTree(
                id="cat-1",
                name="工学",
                disciplines=[
                    DisciplineItem(id="disc-1", name="计算机科学与技术"),
                    DisciplineItem(id="disc-2", name="软件工程"),
                ],
            ),
        ]
        self.mock_svc.get_discipline_tree.return_value = tree

        resp = await client.get("/public/disciplines/list")

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "cat-1"
        assert data[0]["name"] == "工学"
        assert len(data[0]["disciplines"]) == 2
        assert data[0]["disciplines"][0]["name"] == "计算机科学与技术"

    async def test_list_disciplines_empty(self, client):
        """无学科分类时返回空列表，状态码 200。"""
        self.mock_svc.get_discipline_tree.return_value = []

        resp = await client.get("/public/disciplines/list")

        assert resp.status_code == 200
        data = resp.json()
        assert data == []

    async def test_list_disciplines_etag_match(self, client):
        """ETag 匹配时返回 304。"""
        tree = [
            DisciplineCategoryTree(
                id="cat-1",
                name="理学",
                disciplines=[
                    DisciplineItem(id="disc-1", name="数学"),
                ],
            ),
        ]
        self.mock_svc.get_discipline_tree.return_value = tree

        # 首次请求获取 ETag
        resp1 = await client.get("/public/disciplines/list")
        etag = resp1.headers.get("ETag")
        assert etag is not None

        # 带 If-None-Match 请求，ETag 匹配返回 304
        resp2 = await client.get(
            "/public/disciplines/list",
            headers={"If-None-Match": etag},
        )
        assert resp2.status_code == 304

    async def test_list_disciplines_etag_mismatch(self, client):
        """ETag 不匹配时返回 200 和完整数据。"""
        tree = [
            DisciplineCategoryTree(
                id="cat-1",
                name="工学",
                disciplines=[
                    DisciplineItem(id="disc-1", name="电子信息工程"),
                ],
            ),
        ]
        self.mock_svc.get_discipline_tree.return_value = tree

        # 使用错误的 ETag
        resp = await client.get(
            "/public/disciplines/list",
            headers={"If-None-Match": '"wrong-etag"'},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["disciplines"][0]["name"] == "电子信息工程"
        assert "ETag" in resp.headers
