"""导航栏配置数据模型。"""

from pydantic import BaseModel


class NavCustomItem(BaseModel):
    """自定义导航项。"""

    slug: str
    name: str | dict
    category_id: str


class NavConfig(BaseModel):
    """导航栏配置。"""

    order: list[str]
    custom_items: list[NavCustomItem] = []


class NavReorderRequest(BaseModel):
    """排序请求。"""

    order: list[str]


class NavAddItemRequest(BaseModel):
    """新增导航项请求。"""

    slug: str
    name: str | dict
    description: str = ""


class NavRemoveItemRequest(BaseModel):
    """删除导航项请求。"""

    slug: str
    delete_content: bool = False
