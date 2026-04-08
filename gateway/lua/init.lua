--- 共享配置模块。
-- 提供 JWT 密钥、token 过期时间、公开路由白名单。

local _M = {}

--- 获取 JWT 密钥。
function _M.get_jwt_secret()
  return ngx.shared.config:get("jwt_secret") or ""
end

--- 获取 access token 过期时间（秒）。
function _M.get_access_expire_seconds()
  return (ngx.shared.config:get("access_expire_minutes") or 15) * 60
end

--- 获取 refresh token 过期时间（秒）。
function _M.get_refresh_expire_seconds()
  return (ngx.shared.config:get("refresh_expire_days") or 30) * 86400
end

--- 公开路由白名单（精确匹配）。
_M.public_routes = {
  ["POST:/api/auth/sms-code"] = true,
  ["POST:/api/auth/register"] = true,
  ["POST:/api/auth/login"] = true,
  ["POST:/api/auth/refresh"] = true,
  ["POST:/api/auth/refresh-token-hash"] = true,
  ["GET:/api/health"] = true,
  ["GET:/api/content/categories"] = true,
}

--- 公开路由前缀（用于动态路由）。
_M.public_prefixes = {
  { method = "GET", prefix = "/api/content/articles" },
}

--- 检查路由是否公开。
function _M.is_public(method, uri)
  if _M.public_routes[method .. ":" .. uri] then
    return true
  end
  for _, rule in ipairs(_M.public_prefixes) do
    if method == rule.method and string.sub(uri, 1, #rule.prefix) == rule.prefix then
      return true
    end
  end
  return false
end

return _M
