--- JWT 认证模块。
-- 处理 token 验签、CSRF 校验、用户信息注入。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")
local rate_limit = require("rate_limit")

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
  reject(401, "TOKEN_MISSING")
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
  reject(401, "TOKEN_MISSING")
end

-- 验证 JWT
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, access_token)
if not jwt_obj.verified then
  if jwt_obj.reason and string.find(jwt_obj.reason, "expired") then
    reject(401, "TOKEN_EXPIRED")
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

-- permissions 数组转逗号分隔字符串
local perms = payload.permissions or {}
ngx.req.set_header("X-User-Permissions", table.concat(perms, ","))
