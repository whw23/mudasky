--- Refresh token 处理模块。
-- 从 Cookie 读取 refresh_token JWT，验签，
-- 计算 SHA-256 哈希，注入 X-Refresh-Token-Hash 请求头。

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
  ngx.exit(401)
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
  ngx.exit(401)
  return
end

-- 验签
local jwt_secret = config.get_jwt_secret()
local jwt_obj = jwt:verify(jwt_secret, refresh_token)
if not jwt_obj.verified then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  ngx.exit(401)
  return
end

if jwt_obj.payload.type ~= "refresh" then
  ngx.status = 401
  ngx.header["Content-Type"] = "application/json"
  ngx.say('{"code":"TOKEN_INVALID"}')
  ngx.exit(401)
  return
end

-- 计算 SHA-256 哈希
local sha256 = resty_sha256:new()
sha256:update(refresh_token)
local digest = sha256:final()
local token_hash = str.to_hex(digest)

-- 注入请求头
ngx.req.set_header("X-Refresh-Token-Hash", token_hash)
