--- JWT Cookie 生成模块。
-- 在 body_filter 阶段拦截登录/注册/续签的响应体，
-- 解析用户信息，生成 JWT 并设置 Set-Cookie。

local jwt = require("resty.jwt")
local cjson = require("cjson.safe")
local config = require("init")

-- 只处理 200 响应
if ngx.status ~= 200 then
  return
end

-- 收集响应体分块
local ctx = ngx.ctx
if not ctx.response_body then
  ctx.response_body = {}
end

local chunk = ngx.arg[1]
if chunk and chunk ~= "" then
  table.insert(ctx.response_body, chunk)
end

-- 如果不是最后一块，继续收集
if not ngx.arg[2] then
  ngx.arg[1] = nil
  return
end

-- 最后一块，拼接完整响应体
local body = table.concat(ctx.response_body)
ngx.arg[1] = body

-- 解析 JSON
local data = cjson.decode(body)
if not data or not data.user then
  return
end

-- 2FA 流程：step 不为空时不设 Cookie
if data.step then
  return
end

local user = data.user
local jwt_secret = config.get_jwt_secret()
local now = ngx.time()

-- 生成 access_token
local access_expire = config.get_access_expire_seconds()
local access_payload = {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    group_ids = user.group_ids or {},
    is_active = user.is_active,
    type = "access",
    iat = now,
    exp = now + access_expire,
  },
}
local access_jwt = jwt:sign(jwt_secret, access_payload)

-- 生成 refresh_token
local refresh_expire = config.get_refresh_expire_seconds()
local refresh_payload = {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    type = "refresh",
    iat = now,
    exp = now + refresh_expire,
  },
}
local refresh_jwt = jwt:sign(jwt_secret, refresh_payload)

-- 读取 X-Keep-Login 请求头
local keep_login = ngx.req.get_headers()["X-Keep-Login"]
local keep = (keep_login ~= "false")

-- 设置 Cookie
local cookies = {}

-- access_token Cookie
local access_cookie = "access_token=" .. access_jwt
  .. "; Path=/; HttpOnly; SameSite=Strict"
  .. "; Max-Age=" .. access_expire
table.insert(cookies, access_cookie)

-- refresh_token Cookie
local refresh_cookie = "refresh_token=" .. refresh_jwt
  .. "; Path=/api/auth/refresh; HttpOnly; SameSite=Strict"
if keep then
  refresh_cookie = refresh_cookie
    .. "; Max-Age=" .. refresh_expire
end
table.insert(cookies, refresh_cookie)

ngx.header["Set-Cookie"] = cookies
