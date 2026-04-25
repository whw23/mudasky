"""model_utils 单元测试。

测试 ORM 模型通用更新工具。
"""

from pydantic import BaseModel

from app.db.model_utils import apply_updates


class UpdateSchema(BaseModel):
    """测试用 Pydantic schema。"""

    name: str | None = None
    title: str | None = None
    status: str | None = None


class FakeModel:
    """测试用模型替身。"""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


# ---- apply_updates ----


class TestApplyUpdates:
    """模型字段更新测试。"""

    def test_update_set_fields(self):
        """只更新显式设置的字段。"""
        model = FakeModel(name="旧名称", title="旧标题")
        data = UpdateSchema(name="新名称")

        apply_updates(model, data)

        assert model.name == "新名称"
        assert model.title == "旧标题"

    def test_skip_unset_fields(self):
        """未设置的字段不更新。"""
        model = FakeModel(name="旧名称", title="旧标题")
        data = UpdateSchema(name="新名称")

        apply_updates(model, data)

        assert model.name == "新名称"
        assert model.title == "旧标题"

    def test_exclude_fields(self):
        """exclude 中的字段被跳过。"""
        model = FakeModel(
            name="旧名称", status="draft"
        )
        data = UpdateSchema(
            name="新名称", status="published"
        )

        apply_updates(model, data, exclude={"status"})

        assert model.name == "新名称"
        assert model.status == "draft"

    def test_all_fields_set(self):
        """所有字段都设置时全部更新。"""
        model = FakeModel(name="N", title="T", status="S")
        data = UpdateSchema(
            name="A", title="B", status="C"
        )

        apply_updates(model, data)

        assert model.name == "A"
        assert model.title == "B"
        assert model.status == "C"

    def test_exclude_none(self):
        """exclude 为 None 时不跳过任何字段。"""
        model = FakeModel(name="old", title="old")
        data = UpdateSchema(name="new", title="new")

        apply_updates(model, data, exclude=None)

        assert model.name == "new"
        assert model.title == "new"

    def test_empty_schema(self):
        """空 schema（无字段设置）不修改模型。"""
        model = FakeModel(name="keep", title="keep")
        data = UpdateSchema()

        apply_updates(model, data)

        assert model.name == "keep"
        assert model.title == "keep"
