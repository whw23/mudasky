--- 登录/注册代理模块。
-- 用 content_by_lua 接管请求，调后端获取响应，
-- 解析用户信息，生成 JWT，设置 Cookie 后返回。

local http = require("resty.http")
local cjson = require("cjson.safe")
local jwt = require("resty.jwt")
local resty_sha256 = require("resty.sha256")
local str = require("resty.string")
local config = require("init")
local rate_limit = require("rate_limit")

-- IP 限流检查
local client_ip = ngx.var.remote_addr
if rate_limit.is_limited(client_ip, ngx.req.get_method(), ngx.var.uri) then
  ngx.status = 429
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOO_MANY_REQUESTS","message":"请求过于频繁，请稍后再试"}')
  return
end

-- 读取请求体
ngx.req.read_body()
local body = ngx.req.get_body_data()

-- 调后端
local httpc = http.new()
local res, err = httpc:request_uri(config.get_backend_url() .. ngx.var.uri, {
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
    permissions = user.permissions or {},
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

-- 保存 refresh_token 的哈希到后端
local sha256 = resty_sha256:new()
sha256:update(refresh_jwt)
local digest = sha256:final()
local token_hash = str.to_hex(digest)

local save_httpc = http.new()
save_httpc:request_uri(config.get_backend_url() .. "/api/auth/refresh-token-hash", {
  method = "POST",
  body = cjson.encode({
    user_id = user.id,
    token_hash = token_hash,
  }),
  headers = {
    ["Content-Type"] = "application/json",
    ["X-Requested-With"] = "XMLHttpRequest",
    ["X-Internal-Secret"] = config.get_internal_secret(),
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
