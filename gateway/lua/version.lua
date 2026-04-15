--- 版本聚合接口。
-- 并发查询各容器版本，统一返回。

local cjson = require("cjson")

local gateway_version = os.getenv("BUILD_VERSION") or "dev"

-- 并发请求 API 和 Frontend 的版本接口
local api_res, frontend_res = ngx.location.capture_multi({
  { "/internal/api/version", { method = ngx.HTTP_GET } },
  { "/internal/frontend/version", { method = ngx.HTTP_GET } },
})

-- 解析 API 和 DB 版本
local api_version = "unknown"
local db_version = "unknown"
if api_res and api_res.status == 200 then
  local ok, data = pcall(cjson.decode, api_res.body)
  if ok then
    api_version = data.version or "unknown"
    db_version = data.db_version or "unknown"
  end
end

-- 解析 Frontend 版本
local frontend_version = "unknown"
if frontend_res and frontend_res.status == 200 then
  local ok, data = pcall(cjson.decode, frontend_res.body)
  if ok and data.version then
    frontend_version = data.version
  end
end

ngx.header["Content-Type"] = "application/json"
ngx.say(cjson.encode({
  gateway = gateway_version,
  api = api_version,
  frontend = frontend_version,
  db = db_version,
}))
