--- 前端面板路由权限守卫。
-- 对 /admin/* 和 /portal/* 页面请求做 JWT 校验和权限检查。
-- 未登录 → 302 重定向首页；无权限 → 302 重定向用户中心。

local jwt = require("resty.jwt")
local config = require("init")

local VALID_LOCALES = { zh = true, en = true, ja = true, de = true }

--- 从 Cookie 中提取指定 key 的值。
local function get_cookie(name)
  local cookie_header = ngx.var.http_cookie
  if not cookie_header then return nil end
  for pair in string.gmatch(cookie_header, "[^;]+") do
    local trimmed = string.gsub(pair, "^%s+", "")
    local k, v = string.match(trimmed, "^(.-)=(.+)$")
    if k == name then return v end
  end
  return nil
end

--- 从 URI 中提取 locale 和面板类型。
-- /zh/admin/dashboard → "zh", "admin"
-- /admin/dashboard → "zh", "admin"（无 locale 时默认 zh）
local function extract_locale_and_panel(uri)
  local loc, panel = string.match(uri, "^/([a-z][a-z])/(admin)")
  if not loc then
    loc, panel = string.match(uri, "^/([a-z][a-z])/(portal)")
  end
  if not panel then
    panel = string.match(uri, "^/(admin)") or string.match(uri, "^/(portal)")
  end
  if loc and not VALID_LOCALES[loc] then loc = nil end
  return loc or "zh", panel
end

--- 检查用户权限列表中是否有面板访问权。
local function has_panel_access(perms, panel)
  for _, p in ipairs(perms) do
    if p == "*" then return true end
    if p == panel .. "/*" then return true end
    if string.find(p, panel .. "/", 1, true) == 1 then return true end
  end
  return false
end

--- 302 重定向。
local function redirect_to(path)
  ngx.redirect(path, 302)
end

-- 主逻辑
local uri = ngx.var.uri
local locale, panel = extract_locale_and_panel(uri)
if not panel then return end

local home = "/" .. locale

-- 读取 access_token
local access_token = get_cookie("access_token")
if not access_token then
  -- 有 refresh_token 时放行，让前端 JS 触发续签
  if get_cookie("refresh_token") then
    return
  end
  return redirect_to(home)
end

-- 验证 JWT（过期时放行，让前端 JS 通过 API 触发 refresh）
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, access_token)
if not jwt_obj.verified then
  local reason = jwt_obj.reason or ""
  if string.find(reason, "expired") then
    -- token 过期：放行页面，前端 JS 会检测到并自动 refresh
    return
  end
  -- token 无效（篡改等）：重定向登录
  return redirect_to(home)
end

local payload = jwt_obj.payload

-- 用户未启用
if not payload.is_active then
  return redirect_to(home)
end

-- 权限检查
local perms = payload.permissions or {}
if not has_panel_access(perms, panel) then
  return redirect_to("/" .. locale .. "/portal/overview")
end
