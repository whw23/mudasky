"""权限树生成模块。

应用启动时两步生成权限树：
1. 扫描 __init__.py 的 description 构建文件夹层级骨架
2. 从 OpenAPI spec 提取端点 summary 补全叶子节点
"""

import importlib
import pkgutil
from typing import Any


def _build_folder_tree(package_name: str) -> dict:
    """递归扫描包，用 __init__.py 的 description 构建文件夹层级。"""
    tree: dict[str, Any] = {}
    try:
        pkg = importlib.import_module(package_name)
    except ImportError:
        return tree

    for _importer, name, is_pkg in pkgutil.iter_modules(pkg.__path__):
        if not is_pkg:
            continue
        sub_module = importlib.import_module(f"{package_name}.{name}")
        desc = getattr(sub_module, "description", name)
        node: dict[str, Any] = {"description": desc}
        children = _build_folder_tree(f"{package_name}.{name}")
        if children:
            node["children"] = children
        tree[name] = node

    return tree


def _insert_endpoint(
    tree: dict, segments: list[str], summary: str
) -> None:
    """将端点按路径段逐层插入到权限树中。"""
    if not segments:
        return
    key = segments[0]
    if key not in tree:
        tree[key] = {
            "description": summary if len(segments) == 1 else key
        }
    node = tree[key]
    if len(segments) == 1:
        node["description"] = summary
    else:
        if "children" not in node:
            node["children"] = {}
        _insert_endpoint(
            node["children"], segments[1:], summary
        )


def build_permission_tree(app: Any) -> dict:
    """构建完整权限树（文件夹层级 + 端点层级）。"""
    tree: dict[str, Any] = {}
    for panel in ("admin", "portal"):
        folder_tree = _build_folder_tree(f"api.{panel}")
        tree[panel] = {
            "description": getattr(
                importlib.import_module(f"api.{panel}"),
                "description",
                panel,
            ),
            "children": folder_tree,
        }

    # 从 OpenAPI 补全叶子端点
    openapi = app.openapi()
    for path, methods in (openapi.get("paths") or {}).items():
        for method_info in methods.values():
            summary = method_info.get("summary", "")
            clean = path.lstrip("/")
            if clean.startswith("api/"):
                clean = clean[4:]
            if not (
                clean.startswith("admin/")
                or clean.startswith("portal/")
            ):
                continue
            segments = clean.split("/")
            if len(segments) >= 2:
                panel = segments[0]
                if panel in tree:
                    _insert_endpoint(
                        tree[panel].setdefault("children", {}),
                        segments[1:],
                        summary,
                    )

    return tree
