"""公开学科分类服务。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.discipline import repository

from .schemas import DisciplineCategoryTree, DisciplineItem


class DisciplinePublicService:
    """学科分类公开查询服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务。"""
        self.session = session

    async def get_discipline_tree(self) -> list[DisciplineCategoryTree]:
        """获取学科分类树形结构。"""
        categories = await repository.list_categories(self.session)
        tree = []
        for cat in categories:
            disciplines = await repository.list_disciplines(
                self.session, cat.id
            )
            tree.append(
                DisciplineCategoryTree(
                    id=cat.id,
                    name=cat.name,
                    disciplines=[
                        DisciplineItem.model_validate(d) for d in disciplines
                    ],
                )
            )
        return tree
