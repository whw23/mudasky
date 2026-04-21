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

--- 从 URI 中提取 module 名（面板下的第一级子路由）。
-- /zh/admin/users → "users"
-- /zh/admin/users/detail → "users"
-- /zh/portal/profile → "profile"
local function extract_module(uri, locale, panel)
  local pattern = "^/" .. locale .. "/" .. panel .. "/([^/]+)"
  local module = string.match(uri, pattern)
  if not module then
    -- 无 locale 的情况
    pattern = "^/" .. panel .. "/([^/]+)"
    module = string.match(uri, pattern)
  end
  return module
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

-- 面板级权限检查
local perms = payload.permissions or {}
if not has_panel_access(perms, panel) then
  return redirect_to(home)
end

-- module 级权限检查
local module = extract_module(uri, locale, panel)
if module then
  local required_perm = panel .. "/" .. module
  if not has_permission(perms, required_perm) then
    -- 无权限访问该 module，尝试重定向到默认页
    local default_path
    if panel == "admin" then
      default_path = "/" .. locale .. "/admin/dashboard"
    elseif panel == "portal" then
      default_path = "/" .. locale .. "/portal/profile"
    end

    if default_path then
      -- 检查用户是否有默认页权限
      local default_module = (panel == "admin") and "dashboard" or "profile"
      local default_perm = panel .. "/" .. default_module
      if has_permission(perms, default_perm) then
        return redirect_to(default_path)
      end
    end

    -- 默认页也无权限，重定向首页
    return redirect_to(home)
  end
end
