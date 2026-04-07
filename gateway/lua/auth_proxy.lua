--- 登录/注册代理模块。
-- 用 content_by_lua 接管请求，调后端获取响应，
-- 解析用户信息，生成 JWT，设置 Cookie 后返回。

local http = require("resty.http")
local cjson = require("cjson.safe")
local jwt = require("resty.jwt")
local config = require("init")

-- 读取请求体
ngx.req.read_body()
local body = ngx.req.get_body_data()

-- 调后端
local httpc = http.new()
local res, err = httpc:request_uri("http://api:8000" .. ngx.var.uri, {
  method = "POST",
  body = body,
  headers = {
    ["Content-Type"] = "application/json",
    ["X-Requested-With"] = "XMLHttpRequest",
  },
})

if not res then
  ngx.status = 502
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"GATEWAY_ERROR","message":"' .. (err or "unknown") .. '"}')
  return
end

-- 非 200 直接透传
if res.status ~= 200 then
  ngx.status = res.status
  ngx.header["Content-Type"] = "application/json"
  ngx.say(res.body)
  return
end

-- 解析响应
local data = cjson.decode(res.body)
if not data or not data.user then
  ngx.status = 200
  ngx.header["Content-Type"] = "application/json"
  ngx.say(res.body)
  return
end

-- 2FA 流程：step 不为空且不为 null 时不设 Cookie
if data.step and data.step ~= cjson.null then
  ngx.status = 200
  ngx.header["Content-Type"] = "application/json"
  ngx.say(res.body)
  return
end

-- 生成 JWT
local user = data.user
local jwt_secret = config.get_jwt_secret()
local now = ngx.time()

local access_expire = config.get_access_expire_seconds()
local access_jwt = jwt:sign(jwt_secret, {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    group_ids = user.group_ids or {},
    is_active = user.is_active,
    type = "access",
    iat = now,
    exp = now + access_expire,
  },
})

local refresh_expire = config.get_refresh_expire_seconds()
local refresh_jwt = jwt:sign(jwt_secret, {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    type = "refresh",
    iat = now,
    exp = now + refresh_expire,
  },
})

-- 读取 X-Keep-Login
local keep_login = ngx.req.get_headers()["X-Keep-Login"]
local keep = (keep_login ~= "false")

-- 设置 Cookie
local cookies = {}

table.insert(cookies, "access_token=" .. access_jwt
  .. "; Path=/; HttpOnly; SameSite=Strict"
  .. "; Max-Age=" .. access_expire)

local refresh_cookie = "refresh_token=" .. refresh_jwt
  .. "; Path=/api/auth/refresh; HttpOnly; SameSite=Strict"
if keep then
  refresh_cookie = refresh_cookie .. "; Max-Age=" .. refresh_expire
end
table.insert(cookies, refresh_cookie)

ngx.header["Set-Cookie"] = cookies
ngx.header["Content-Type"] = "application/json"
ngx.status = 200
ngx.say(res.body)
