"""初始化系统配置。"""

from sqlalchemy import select

from app.config.models import SystemConfig


async def init_system_config(session) -> None:
    """初始化系统配置项。已存在则跳过。"""
    configs = [
        {
            "key": "phone_country_codes",
            "value": [
                {"code": "+86", "country": "\ud83c\udde8\ud83c\uddf3", "label": "\u4e2d\u56fd", "digits": 11, "enabled": True},
                {"code": "+81", "country": "\ud83c\uddef\ud83c\uddf5", "label": "\u65e5\u672c", "digits": 10, "enabled": False},
                {"code": "+49", "country": "\ud83c\udde9\ud83c\uddea", "label": "\u5fb7\u56fd", "digits": 10, "enabled": False},
                {"code": "+65", "country": "\ud83c\uddf8\ud83c\uddec", "label": "\u65b0\u52a0\u5761", "digits": 8, "enabled": False},
                {"code": "+1", "country": "\ud83c\uddfa\ud83c\uddf8", "label": "US/CA", "digits": 10, "enabled": False},
                {"code": "+44", "country": "\ud83c\uddec\ud83c\udde7", "label": "\u82f1\u56fd", "digits": 10, "enabled": False},
                {"code": "+82", "country": "\ud83c\uddf0\ud83c\uddf7", "label": "\u97e9\u56fd", "digits": 10, "enabled": False},
                {"code": "+33", "country": "\ud83c\uddeb\ud83c\uddf7", "label": "\u6cd5\u56fd", "digits": 9, "enabled": False},
            ],
            "description": "\u542f\u7528\u7684\u624b\u673a\u53f7\u56fd\u5bb6\u7801\u5217\u8868",
        },
        {
            "key": "contact_info",
            "value": {
                "address": "苏州独墅湖大学城林泉街377号公共学院5号楼7楼",
                "phone": "189-1268-6656",
                "email": "haoranxuexing@163.com",
                "wechat": "mutu_edu",
                "office_hours": "\u5468\u4e00\u81f3\u5468\u4e94 9:00-18:00",
            },
            "description": "\u8054\u7cfb\u65b9\u5f0f\u914d\u7f6e",
        },
        {
            "key": "site_info",
            "value": {
                "brand_name": {
                    "zh": "慕大国际教育",
                    "en": "MUTU International Education",
                    "ja": "MUTU International Education",
                    "de": "MUTU International Education",
                },
                "tagline": {
                    "zh": "专注国际教育 · 专注出国服务",
                    "en": "Focused on International Education · Focused on Study Abroad",
                    "ja": "国際教育に専念 · 留学サービスに専念",
                    "de": "Fokus auf internationale Bildung · Fokus auf Auslandsstudium",
                },
                "hotline": "189-1268-6656",
                "hotline_contact": "苏老师",
                "logo_url": "",
                "favicon_url": "",
                "wechat_qr_url": "",
                "company_name": "浩然学行(苏州)文化传播有限公司",
                "icp_filing": "苏ICP备2022046719号-1",
            },
            "description": "\u54c1\u724c\u4fe1\u606f\u914d\u7f6e",
        },
        {
            "key": "homepage_stats",
            "value": [
                {"value": "15+", "label": "\u5e74\u529e\u5b66\u7ecf\u9a8c"},
                {"value": "500+", "label": "\u6210\u529f\u6848\u4f8b"},
                {"value": "50+", "label": "\u5408\u4f5c\u9662\u6821"},
                {"value": "98%", "label": "\u7b7e\u8bc1\u901a\u8fc7\u7387"},
            ],
            "description": "\u9996\u9875\u7edf\u8ba1\u6570\u5b57",
        },
        {
            "key": "about_info",
            "value": {
                "history": "\u6155\u5927\u56fd\u9645\u6559\u80b2\u6210\u7acb\u4e8e2011\u5e74\uff0c\u4e13\u6ce8\u4e8e\u5c0f\u8bed\u79cd\u7559\u5b66\u9879\u76ee\u8fd0\u8425\u5df215\u5e74\u3002\u4f5c\u4e3a\u6155\u5c3c\u9ed1\u5927\u5b66\u8bed\u8a00\u4e2d\u5fc3\u6c5f\u82cf\u7701\u552f\u4e00\u6307\u5b9a\u62db\u751f\u8003\u70b9\uff0c\u6211\u4eec\u59cb\u7ec8\u79c9\u627f\"\u4e13\u4e1a\u3001\u8bda\u4fe1\u3001\u9ad8\u6548\"\u7684\u670d\u52a1\u7406\u5ff5\uff0c\u4e3a\u6570\u767e\u4f4d\u5b66\u5b50\u6210\u529f\u5706\u68a6\u6d77\u5916\u540d\u6821\u3002\u4ece\u6700\u521d\u7684\u5fb7\u8bed\u57f9\u8bad\u5230\u5982\u4eca\u6db5\u76d6\u5fb7\u8bed\u3001\u65e5\u8bed\u3001\u6cd5\u8bed\u3001\u97e9\u8bed\u7b49\u591a\u8bed\u79cd\u7559\u5b66\u670d\u52a1\uff0c\u6211\u4eec\u4e0d\u65ad\u62d3\u5c55\u4e1a\u52a1\u7248\u56fe\uff0c\u81f4\u529b\u4e8e\u6210\u4e3a\u4e2d\u56fd\u9886\u5148\u7684\u56fd\u9645\u6559\u80b2\u670d\u52a1\u673a\u6784\u3002",
                "mission": "\u8ba9\u6bcf\u4e00\u4f4d\u6709\u7559\u5b66\u68a6\u60f3\u7684\u5b66\u5b50\u90fd\u80fd\u83b7\u5f97\u4e13\u4e1a\u3001\u8d34\u5fc3\u7684\u4e00\u7ad9\u5f0f\u7559\u5b66\u670d\u52a1\uff0c\u5e2e\u52a9\u5b66\u751f\u627e\u5230\u6700\u9002\u5408\u81ea\u5df1\u7684\u6d77\u5916\u5b66\u5e9c\uff0c\u5b9e\u73b0\u4eba\u751f\u4ef7\u503c\u7684\u98de\u8dc3\u3002",
                "vision": "\u6210\u4e3a\u4e2d\u56fd\u6700\u503c\u5f97\u4fe1\u8d56\u7684\u56fd\u9645\u6559\u80b2\u670d\u52a1\u54c1\u724c\uff0c\u6253\u901a\u4e2d\u56fd\u5b66\u5b50\u4e0e\u4e16\u754c\u540d\u6821\u4e4b\u95f4\u7684\u6865\u6881\uff0c\u63a8\u52a8\u4e2d\u5916\u6559\u80b2\u6587\u5316\u4ea4\u6d41\u4e0e\u878d\u5408\u3002",
                "partnership": "\u6155\u5927\u56fd\u9645\u662f\u6155\u5c3c\u9ed1\u5927\u5b66\u8bed\u8a00\u4e2d\u5fc3\uff08Sprachenzentrum der LMU M\u00fcnchen\uff09\u5728\u6c5f\u82cf\u7701\u7684\u552f\u4e00\u5b98\u65b9\u6307\u5b9a\u62db\u751f\u8003\u70b9\u3002\u6155\u5c3c\u9ed1\u5927\u5b66\u8bed\u8a00\u4e2d\u5fc3\u662f\u5fb7\u56fd\u6700\u6743\u5a01\u7684\u5fb7\u8bed\u57f9\u8bad\u673a\u6784\u4e4b\u4e00\uff0c\u5176\u5fb7\u8bed\u8bfe\u7a0b\u53d7\u5230\u5168\u7403\u8ba4\u53ef\u3002\u901a\u8fc7\u4e0e\u6155\u5c3c\u9ed1\u5927\u5b66\u8bed\u8a00\u4e2d\u5fc3\u7684\u6df1\u5ea6\u5408\u4f5c\uff0c\u6211\u4eec\u4e3a\u5b66\u751f\u63d0\u4f9b\u539f\u6c41\u539f\u5473\u7684\u5fb7\u8bed\u6559\u5b66\u3001\u8003\u8bd5\u8ba4\u8bc1\u4ee5\u53ca\u76f4\u901a\u5fb7\u56fd\u540d\u6821\u7684\u7eff\u8272\u901a\u9053\u3002",
            },
            "description": "\u5173\u4e8e\u6211\u4eec\u9875\u9762\u5185\u5bb9",
        },
        {
            "key": "panel_pages",
            "value": {
                "admin": [
                    {"key": "dashboard", "icon": "LayoutDashboard"},
                    {"key": "users", "icon": "Users", "permissions": ["admin/users/*"]},
                    {"key": "roles", "icon": "Shield", "permissions": ["admin/roles/*"]},
                    {"key": "general-settings", "icon": "Wrench", "permissions": ["admin/general-settings/*"]},
                    {"key": "web-settings", "icon": "Settings", "permissions": ["admin/web-settings/*"]},
                ],
                "portal": [
                    {"key": "overview", "icon": "LayoutDashboard"},
                    {"key": "profile", "icon": "User"},
                    {"key": "documents", "icon": "FileText"},
                    {"key": "articles", "icon": "FileEdit"},
                ],
            },
            "description": "面板页面配置",
        },
    ]

    for cfg in configs:
        existing = await session.execute(
            select(SystemConfig).where(SystemConfig.key == cfg["key"])
        )
        if not existing.scalar_one_or_none():
            session.add(SystemConfig(**cfg))
            await session.flush()
            print(f"  + {cfg['key']} 已初始化")
        else:
            print(f"  - {cfg['key']} 已存在，跳过")
