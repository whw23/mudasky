"""学科分类公开响应模型。"""

from pydantic import BaseModel


class DisciplineItem(BaseModel):
    """学科项。"""

    id: str
    name: str
    model_config = {"from_attributes": True}


class DisciplineCategoryTree(BaseModel):
    """学科大分类树形结构。"""

    id: str
    name: str
    disciplines: list[DisciplineItem] = []
    model_config = {"from_attributes": True}
