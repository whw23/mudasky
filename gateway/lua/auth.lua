--- JWT 认证模块。
-- 处理 token 验签、CSRF 校验、用户信息注入。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")
local rate_limit = require("rate_limit")

--- 从路径提取权限字符串。
-- /api/admin/user/list/xxx → admin.user.list
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  if not path then return nil end
  local segments = {}
  for seg in string.gmatch(path, "[^/]+") do
    table.insert(segments, seg)
    if #segments == 3 then break end
  end
  if #segments < 3 then return nil end
  local perm = table.concat(segments, ".")
  perm = string.gsub(perm, "-", "_")
  return perm
end

--- 检查用户是否拥有指定权限。
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    if p == "*" then return true end
    if p == required then return true end
    if string.sub(p, -2) == ".*" then
      local prefix = string.sub(p, 1, -3)
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end
    end
  end
  return false
end

--- 返回 JSON 错误响应。
local function reject(status, code)
  ngx.status = status
  ngx.header["Content-Type"] = "application/json"
  ngx.say(cjson.encode({ code = code }))
  ngx.exit(status)
end

local uri = ngx.var.uri

-- 非 /api/ 路由直接放行
if not string.find(uri, "^/api/") then
  return
end

-- IP 限流检查（在公开路由放行前执行，覆盖 sms-code 等接口）
local method = ngx.req.get_method()
local client_ip = ngx.var.remote_addr
if rate_limit.is_limited(client_ip, method, uri) then
  reject(429, "TOO_MANY_REQUESTS")
end

-- 从 Cookie 读取语言偏好，注入 X-User-Locale（公开路由也需要）
local locale = "zh"
local cookie_str = ngx.var.http_cookie
if cookie_str then
  for pair in string.gmatch(cookie_str, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == "NEXT_INTL_LOCALE" then
      locale = v
      break
    end
  end
end
ngx.req.set_header("X-User-Locale", locale)

-- 公开路由放行
if config.is_public(method, uri) then
  return
end

-- CSRF 校验：变更请求必须携带 X-Requested-With 头
if method == "POST" or method == "PUT" or method == "PATCH" or method == "DELETE" then
  if not ngx.req.get_headers()["X-Requested-With"] then
    reject(403, "CSRF_REJECTED")
  end
end

-- 从 Cookie 读取 access_token
local cookie_header = ngx.var.http_cookie
if not cookie_header then
  reject(401, "ACCESS_TOKEN_MISSING")
end

local access_token
for pair in string.gmatch(cookie_header, "[^;]+") do
  local trimmed = string.gsub(pair, "^%s+", "")
  local k, v = string.match(trimmed, "^(.-)=(.+)$")
  if k == "access_token" then
    access_token = v
    break
  end
end

if not access_token then
  reject(401, "ACCESS_TOKEN_MISSING")
end

-- 验证 JWT
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, access_token)
if not jwt_obj.verified then
  if jwt_obj.reason and string.find(jwt_obj.reason, "expired") then
    reject(401, "ACCESS_TOKEN_EXPIRED")
  else
    reject(401, "TOKEN_INVALID")
  end
end

local payload = jwt_obj.payload

-- 检查用户是否启用
if not payload.is_active then
  reject(401, "USER_DISABLED")
end

-- 注入请求头（强制覆盖，防伪造）
ngx.req.set_header("X-User-Id", payload.sub)

-- 对 /api/admin/* 和 /api/portal/* 做权限校验
if string.find(uri, "^/api/admin/") or string.find(uri, "^/api/portal/") then
  local required_perm = extract_permission(uri)
  if required_perm then
    local perms = payload.permissions or {}
    if not has_permission(perms, required_perm) then
      reject(403, "FORBIDDEN")
    end
  end
end

