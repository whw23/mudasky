"""HTTP 缓存工具。

提供 ETag 生成和 304 响应判断。
"""

import hashlib

from fastapi import Response


def set_cache_headers(
    response: Response,
    etag_seed: str,
    max_age: int,
    if_none_match: str | None = None,
) -> bool:
    """设置缓存响应头，返回是否命中 304。

    Args:
        response: FastAPI Response 对象
        etag_seed: 用于生成 ETag 的种子字符串
        max_age: Cache-Control max-age 秒数
        if_none_match: 客户端传入的 If-None-Match 头

    Returns:
        True 表示命中 304（调用方应直接返回 response），
        False 表示未命中（调用方返回正常数据）。
    """
    etag = f'"{hashlib.md5(etag_seed.encode()).hexdigest()}"'

    if if_none_match == etag:
        response.status_code = 304
        return True

    response.headers["Cache-Control"] = f"public, max-age={max_age}"
    response.headers["ETag"] = etag
    return False
