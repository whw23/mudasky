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

--- 获取内部接口密钥。
function _M.get_internal_secret()
  return ngx.shared.config:get("internal_secret") or ""
end

--- 获取后端 API 地址。
function _M.get_backend_url()
  return ngx.shared.config:get("backend_url") or "http://api:8000"
end

--- 检查路由是否公开。
function _M.is_public(method, uri)
  -- 认证路由全部放行（login/register/logout 等）
  if string.find(uri, "/api/auth/", 1, true) == 1 then
    return true
  end
  -- 公开路由只允许 GET
  if method == "GET" and string.find(uri, "/api/public/", 1, true) == 1 then
    return true
  end
  -- 健康检查
  if method == "GET" and uri == "/api/health" then
    return true
  end
  return false
end

return _M
