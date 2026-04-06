"""安全工具模块。

提供密码哈希功能。JWT 由 OpenResty 网关层管理，Backend 不碰 JWT_SECRET。
"""

import bcrypt


def hash_password(password: str) -> str:
    """对密码进行 bcrypt 哈希。"""
    return bcrypt.hashpw(
        password.encode("utf-8"), bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """验证密码是否匹配。"""
    return bcrypt.checkpw(
        password.encode("utf-8"), hashed.encode("utf-8")
    )
