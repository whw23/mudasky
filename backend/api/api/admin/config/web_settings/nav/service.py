"""导航栏配置业务逻辑层。"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.db.config import repository as config_repo
from app.db.content import repository as content_repo
from app.db.content.models import Category

from .schemas import NavConfig, NavCustomItem

# 预设导航项 key（不可删除）
BUILTIN_KEYS = {
    "home",
    "universities",
    "study-abroad",
    "requirements",
    "cases",
    "visa",
    "life",
    "news",
    "about",
}

DEFAULT_NAV_CONFIG = NavConfig(
    order=[
        "home",
        "universities",
        "study-abroad",
        "requirements",
        "cases",
        "visa",
        "life",
        "news",
        "about",
    ],
    custom_items=[],
)


class NavService:
    """导航栏配置服务。"""

    def __init__(self, session: AsyncSession) -> None:
        """初始化服务，注入数据库会话。"""
        self.session = session

    async def get_nav_config(self) -> NavConfig:
        """获取导航栏配置。"""
        config = await config_repo.get_by_key(
            self.session, "nav_config"
        )
        if not config:
            return DEFAULT_NAV_CONFIG
        return NavConfig(**config.value)

    async def reorder(self, order: list[str]) -> NavConfig:
        """更新导航栏排序。"""
        nav = await self.get_nav_config()
        custom_slugs = {
            item.slug for item in nav.custom_items
        }
        valid_keys = BUILTIN_KEYS | custom_slugs
        for key in order:
            if key not in valid_keys:
                raise BadRequestException(
                    message=f"无效的导航项: {key}",
                    code="INVALID_NAV_KEY",
                )
        nav.order = order
        await self._save(nav)
        return nav

    async def add_item(
        self,
        slug: str,
        name: str | dict,
        description: str = "",
    ) -> NavConfig:
        """新增自定义导航项（同时创建对应分类）。"""
        nav = await self.get_nav_config()
        if slug in BUILTIN_KEYS or any(
            item.slug == slug for item in nav.custom_items
        ):
            raise BadRequestException(
                message=f"导航项 {slug} 已存在",
                code="NAV_ITEM_EXISTS",
            )
        # 创建对应的 category
        display_name = (
            name
            if isinstance(name, str)
            else name.get("zh", slug)
        )
        category = Category(
            name=display_name,
            slug=slug,
            description=description,
            sort_order=0,
        )
        category = await content_repo.create_category(
            self.session, category
        )
        # 更新 nav_config
        nav.custom_items.append(
            NavCustomItem(
                slug=slug,
                name=name,
                category_id=category.id,
            )
        )
        nav.order.append(slug)
        await self._save(nav)
        return nav

    async def remove_item(
        self, slug: str, delete_content: bool = False
    ) -> NavConfig:
        """删除自定义导航项。"""
        if slug in BUILTIN_KEYS:
            raise BadRequestException(
                message="预设导航项不可删除",
                code="BUILTIN_NAV_ITEM",
            )
        nav = await self.get_nav_config()
        item = next(
            (i for i in nav.custom_items if i.slug == slug),
            None,
        )
        if not item:
            raise NotFoundException(
                message=f"导航项 {slug} 不存在",
                code="NAV_ITEM_NOT_FOUND",
            )
        if delete_content:
            await content_repo.delete_articles_by_category(
                self.session, item.category_id
            )
            category = await content_repo.get_category_by_id(
                self.session, item.category_id
            )
            if category:
                await content_repo.delete_category(
                    self.session, category
                )
        nav.custom_items = [
            i for i in nav.custom_items if i.slug != slug
        ]
        nav.order = [k for k in nav.order if k != slug]
        await self._save(nav)
        return nav

    async def _save(self, nav: NavConfig) -> None:
        """保存导航栏配置到数据库。"""
        config = await config_repo.get_by_key(
            self.session, "nav_config"
        )
        if config:
            await config_repo.update_value(
                self.session, config, nav.model_dump()
            )
        else:
            await config_repo.create(
                self.session,
                "nav_config",
                nav.model_dump(),
                "导航栏配置",
            )
        await self.session.commit()
