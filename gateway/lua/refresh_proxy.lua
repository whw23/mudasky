--- Refresh token 代理模块。
-- 从 Cookie 读取 refresh_token，验签，算哈希，
-- 调后端续签，生成新 JWT，设置 Cookie。

local http = require("resty.http")
local cjson = require("cjson.safe")
local jwt = require("resty.jwt")
local config = require("init")
local resty_sha256 = require("resty.sha256")
local str = require("resty.string")

-- 从 Cookie 读取 refresh_token
local cookie_header = ngx.var.http_cookie
if not cookie_header then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_MISSING"}')
  return
end

local refresh_token
for pair in string.gmatch(cookie_header, "[^;]+") do
  local trimmed = string.gsub(pair, "^%s+", "")
  local k, v = string.match(trimmed, "^(.-)=(.+)$")
  if k == "refresh_token" then
    refresh_token = v
    break
  end
end

if not refresh_token then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_MISSING"}')
  return
end

-- 验签
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, refresh_token)
if not jwt_obj.verified then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  return
end

if jwt_obj.payload.type ~= "refresh" then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  return
end

-- 计算 SHA-256 哈希
local sha256 = resty_sha256:new()
sha256:update(refresh_token)
local digest = sha256:final()
local token_hash = str.to_hex(digest)

-- 调后端
local httpc = http.new()
local res, err = httpc:request_uri("http://api:8000/api/auth/refresh", {
  method = "POST",
  headers = {
    ["Content-Type"] = "application/json",
    ["X-Requested-With"] = "XMLHttpRequest",
    ["X-Refresh-Token-Hash"] = token_hash,
  },
})

if not res then
  ngx.status = 502
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"GATEWAY_ERROR"}')
  return
end

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

-- 生成新 JWT
local user = data.user
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
local new_refresh_jwt = jwt:sign(jwt_secret, {
  header = { typ = "JWT", alg = "HS256" },
  payload = {
    sub = user.id,
    type = "refresh",
    iat = now,
    exp = now + refresh_expire,
  },
})

-- 设置 Cookie
local keep_login = ngx.req.get_headers()["X-Keep-Login"]
local keep = (keep_login ~= "false")

local cookies = {}
table.insert(cookies, "access_token=" .. access_jwt
  .. "; Path=/; HttpOnly; SameSite=Strict"
  .. "; Max-Age=" .. access_expire)

local refresh_cookie = "refresh_token=" .. new_refresh_jwt
  .. "; Path=/api/auth/refresh; HttpOnly; SameSite=Strict"
if keep then
  refresh_cookie = refresh_cookie .. "; Max-Age=" .. refresh_expire
end
table.insert(cookies, refresh_cookie)

ngx.header["Set-Cookie"] = cookies
ngx.header["Content-Type"] = "application/json"
ngx.status = 200
ngx.say(res.body)
