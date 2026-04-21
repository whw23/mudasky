"""权限树生成模块。

遍历 FastAPI 路由列表 + router.label 构建权限树：
1. 从扁平路由的 endpoint 模块回溯 router.label，构建前缀→标签映射
2. 用标签映射和路由 summary 组装分支节点（有 label 的 router）+ 叶子节点（endpoint）
"""

import importlib
from collections import defaultdict
from typing import Any

from fastapi import APIRouter
from fastapi.routing import APIRoute


_PANELS = ("admin", "portal")


def _get_panel(path: str) -> str | None:
    """从路由路径提取面板名，非 admin/portal 返回 None。"""
    parts = path.strip("/").split("/", 1)
    return parts[0] if parts and parts[0] in _PANELS else None


def _collect_panel_routes(
    app: Any,
) -> dict[str, list[tuple[str, str]]]:
    """按 endpoint 模块分组收集 admin/portal 路由。

    返回 {module_name: [(full_path, summary), ...]}。
    """
    groups: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if _get_panel(route.path) is None:
            continue
        mod_name = route.endpoint.__module__
        groups[mod_name].append((route.path, route.summary or ""))
    return dict(groups)


def _find_own_route_suffix(router: Any, mod_name: str) -> str:
    """找到 router 上直属路由的路径后缀（含 router.prefix）。

    router.routes 中的路径已包含 router.prefix，
    直接返回完整路径作为后缀。
    """
    for r in router.routes:
        if not isinstance(r, APIRoute):
            continue
        if r.endpoint.__module__ == mod_name:
            return r.path
    return ""


def _find_sample_for_router(
    router: Any,
    mod_name: str,
    all_paths: list[str],
) -> str | None:
    """找到属于指定 router 的一条扁平路由路径。"""
    suffix = _find_own_route_suffix(router, mod_name)
    if not suffix:
        return None
    for path in all_paths:
        if path.endswith(suffix):
            return path
    return None


def _compute_parent_prefix(
    router: Any, mod_name: str, sample_path: str
) -> str:
    """从 sample_path 反推 router 的父前缀。

    full_path = parent_prefix + route_suffix，
    route_suffix 已包含 router.prefix。
    """
    suffix = _find_own_route_suffix(router, mod_name)
    if suffix and sample_path.endswith(suffix):
        return sample_path[: -len(suffix)]
    return sample_path


def _find_labeled_routers(mod: Any) -> list[Any]:
    """从模块中找出所有带 label 和 prefix 的 APIRouter 实例。"""
    routers = []
    seen_ids: set[int] = set()
    for attr_name in dir(mod):
        obj = getattr(mod, attr_name, None)
        if not isinstance(obj, APIRouter):
            continue
        if id(obj) in seen_ids:
            continue
        seen_ids.add(id(obj))
        label = getattr(obj, "label", None)
        prefix = getattr(obj, "prefix", "")
        if label and prefix:
            routers.append(obj)
    return routers


def _modules_to_scan(mod_name: str) -> list[str]:
    """返回需要扫描的模块列表：当前模块 + 父包。"""
    result = [mod_name]
    # router 模块的父包可能定义了带 label 的 router
    if mod_name.endswith(".router"):
        parent = mod_name.rsplit(".router", 1)[0]
        result.append(parent)
    return result


def _build_label_map(
    module_routes: dict[str, list[tuple[str, str]]],
) -> dict[str, str]:
    """构建 URL 前缀 → 中文标签的映射。

    遍历每个 endpoint 模块及其父包，找所有带 label+prefix 的 router，
    通过扁平路由路径反推完整前缀。
    """
    label_map: dict[str, str] = {}
    seen_routers: set[int] = set()
    for mod_name, routes in module_routes.items():
        paths = [p for p, _ in routes]
        for scan_mod in _modules_to_scan(mod_name):
            mod = importlib.import_module(scan_mod)
            for router in _find_labeled_routers(mod):
                if id(router) in seen_routers:
                    continue
                sample = _find_sample_for_router(
                    router, mod_name, paths
                )
                if sample is None:
                    continue
                seen_routers.add(id(router))
                parent = _compute_parent_prefix(
                    router, mod_name, sample
                )
                full = parent + router.prefix
                label_map[full] = router.label
    return label_map


def _find_deepest_prefix(
    path: str, label_map: dict[str, str]
) -> tuple[str, str]:
    """找到路径匹配的最深标签前缀，返回 (prefix, remaining_path)。"""
    best = ""
    for prefix in label_map:
        if path.startswith(prefix + "/") or path == prefix:
            if len(prefix) > len(best):
                best = prefix
    if best:
        remaining = path[len(best) :].lstrip("/")
        return best, remaining
    return "", path.lstrip("/")


def _add_panel_labels(label_map: dict[str, str]) -> None:
    """为 admin/portal 面板添加标签。"""
    for panel in _PANELS:
        mod = importlib.import_module(f"api.{panel}")
        desc = getattr(mod, "description", panel)
        label_map[f"/{panel}"] = desc


def _find_all_matching_prefixes(
    path: str, label_map: dict[str, str]
) -> list[str]:
    """找到路径匹配的所有标签前缀，按长度从短到长排序。"""
    matches = []
    for prefix in label_map:
        if path.startswith(prefix + "/") or path == prefix:
            matches.append(prefix)
    matches.sort(key=len)
    return matches


# 虚拟页面节点：纯前端路由，无后端 API 端点
_VIRTUAL_NODES: dict[str, dict[str, str]] = {
    "admin": {"dashboard": "管理仪表盘"},
    "portal": {"overview": "用户总览"},
}


def _build_tree_from_routes(
    app: Any, label_map: dict[str, str]
) -> dict[str, Any]:
    """用标签映射和路由 summary 构建权限树。

    有 label 的 router 前缀按层级嵌套形成分支节点（带 children），
    endpoint 路径的剩余部分作为叶子节点。
    """
    tree: dict[str, Any] = {}
    for panel in _PANELS:
        panel_prefix = f"/{panel}"
        panel_label = label_map.get(panel_prefix, panel)
        tree[panel] = {"description": panel_label, "children": {}}

    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        panel = _get_panel(route.path)
        if panel is None:
            continue
        path_after_panel = route.path[len(f"/{panel}") :].lstrip("/")
        if not path_after_panel:
            continue

        # 找到所有匹配的标签前缀（从浅到深）
        all_prefixes = _find_all_matching_prefixes(
            route.path, label_map
        )
        # 过滤掉面板自身的前缀
        panel_prefix = f"/{panel}"
        branch_prefixes = [
            p for p in all_prefixes if p != panel_prefix
        ]

        if not branch_prefixes:
            # 直属面板的叶子节点
            tree[panel]["children"][path_after_panel] = {
                "description": route.summary or ""
            }
            continue

        # 按层级依次确保分支节点存在
        current = tree[panel]["children"]
        prev_prefix = panel_prefix
        for bp in branch_prefixes:
            # 当前分支的 key = 去掉父前缀后的部分
            segment = bp[len(prev_prefix) :].strip("/")
            if segment not in current:
                current[segment] = {
                    "description": label_map[bp],
                    "children": {},
                }
            if "children" not in current[segment]:
                current[segment]["children"] = {}
            current = current[segment]["children"]
            prev_prefix = bp

        # 叶子 key = 去掉最深前缀后的剩余部分
        deepest = branch_prefixes[-1]
        leaf_key = route.path[len(deepest) :].lstrip("/")
        if leaf_key:
            current[leaf_key] = {
                "description": route.summary or ""
            }

    # 添加虚拟页面节点
    for panel, nodes in _VIRTUAL_NODES.items():
        if panel in tree:
            for key, desc in nodes.items():
                if key not in tree[panel]["children"]:
                    tree[panel]["children"][key] = {
                        "description": desc,
                    }

    return tree


def build_permission_tree(app: Any) -> dict:
    """构建完整权限树。

    1. 按模块分组收集路由
    2. 从 router.label 构建前缀→标签映射
    3. 用映射 + 路由 summary 组装树
    """
    module_routes = _collect_panel_routes(app)
    label_map = _build_label_map(module_routes)
    _add_panel_labels(label_map)
    return _build_tree_from_routes(app, label_map)
