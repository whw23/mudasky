--- JWT 认证模块。
-- 处理 token 验签、CSRF 校验、用户信息注入。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")
local rate_limit = require("rate_limit")

--- 从路径提取权限码。
-- URL 路径完全静态，权限码 = 去掉 /api/ 前缀。
local function extract_permission(uri)
  local path = string.match(uri, "^/api/(.+)$")
  return path
end

--- 检查用户是否拥有指定权限。
-- 支持通配符（path/*）和精确匹配，两者都包含祖先路径。
local function has_permission(user_perms, required)
  for _, p in ipairs(user_perms) do
    -- 全部权限
    if p == "*" then return true end

    if string.sub(p, -2) == "/*" then
      -- 通配符：path/* 格式
      local prefix = string.sub(p, 1, -2)  -- 去掉 *，保留 /

      -- 子路径匹配：required 在权限前缀之下
      if string.find(required, prefix, 1, true) == 1 then
        return true
      end

      -- 祖先匹配：权限前缀在 required 之下（required 是祖先）
      if string.find(prefix, required .. "/", 1, true) == 1 then
        return true
      end

    else
      -- 精确匹配（去掉可能的尾部斜杠）
      local target = p
      if string.sub(target, -1) == "/" then
        target = string.sub(target, 1, -2)
      end

      -- 精确匹配当前节点
      if required == target then
        return true
      end

      -- 祖先匹配：target 路径在 required 之下（required 是祖先）
      if string.find(target, required .. "/", 1, true) == 1 then
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

local VALID_LOCALES = { zh = true, en = true, ja = true, de = true }

local uri = ngx.var.uri

-- 非 /api/ 路由直接放行
if not string.find(uri, "^/api/") then
  return
end

-- IP 限流检查（在公开路由放行前执行，覆盖 sms-code 等接口）
-- 携带有效 internal_secret cookie 的请求跳过限流（E2E 测试 / 浏览器调试）
local method = ngx.req.get_method()
local client_ip = ngx.var.remote_addr
local internal_secret
if ngx.var.http_cookie then
  for pair in string.gmatch(ngx.var.http_cookie, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == "internal_secret" then
      internal_secret = v
      break
    end
  end
end
local configured_secret = config.get_internal_secret()
local skip_rate_limit = configured_secret ~= "" and internal_secret == configured_secret
if not skip_rate_limit and rate_limit.is_limited(client_ip, method, uri) then
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
      if VALID_LOCALES[v] then
        locale = v
      end
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

-- 检查用户是否启用（JWT claims 快速检查）
if not payload.is_active then
  reject(401, "USER_DISABLED")
end

-- 检查用户黑名单（后端禁用/改角色时 push 写入）
local user_id = payload.sub
local blacklist = ngx.shared.user_blacklist
if blacklist:get("bl:" .. user_id) then
  reject(401, "TOKEN_REVOKED")
end

-- 注入请求头（强制覆盖，防伪造）
ngx.req.set_header("X-User-Id", payload.sub)

-- 对会话管理接口注入 X-Refresh-Token-Hash
if string.find(uri, "/api/portal/profile/sessions", 1, true) == 1 then
  local rt_cookie
  for pair in string.gmatch(cookie_header, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == "refresh_token" then
      rt_cookie = v
      break
    end
  end
  if rt_cookie then
    local resty_sha256 = require("resty.sha256")
    local str_util = require("resty.string")
    local sha = resty_sha256:new()
    sha:update(rt_cookie)
    local digest = sha:final()
    ngx.req.set_header("X-Refresh-Token-Hash", str_util.to_hex(digest))
  end
end

-- 对 /api/admin/* 和 /api/portal/* 做权限校验
if string.find(uri, "^/api/admin/") or string.find(uri, "^/api/portal/") then
  local required_perm = extract_permission(uri)
  local perms = payload.permissions or {}
  if not required_perm or not has_permission(perms, required_perm) then
    reject(403, "FORBIDDEN")
  end
end

