"""ORM 模型通用工具。"""

from pydantic import BaseModel


def apply_updates(
    model: object,
    data: BaseModel,
    exclude: set[str] | None = None,
) -> None:
    """将 Pydantic schema 中已设置的字段更新到 ORM 模型。

    只更新调用方显式传入的字段（exclude_unset），跳过 exclude 中指定的字段。
    """
    for field, value in data.model_dump(
        exclude_unset=True
    ).items():
        if exclude and field in exclude:
            continue
        setattr(model, field, value)
