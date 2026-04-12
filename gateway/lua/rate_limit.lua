--- IP 级别限流模块。
-- 使用 lua_shared_dict 实现滑动窗口计数器。
-- 针对敏感接口（短信、登录、注册）做 IP 维度限流。
-- 通过环境变量 RATE_LIMIT_MULTIPLIER 控制限流倍率（默认 1，开发环境可设大）。

local _M = {}

local shared = ngx.shared.rate_limit
local config = ngx.shared.config

--- 获取限流倍率。
local function get_multiplier()
  return config:get("rate_limit_multiplier") or 1
end

--- 限流规则配置（基准值，实际值 = 基准值 × 倍率）。
_M.base_rules = {
  -- 短信验证码：同一 IP 每分钟最多 5 次，每小时最多 20 次
  ["POST:/api/auth/sms-code"] = {
    { key_prefix = "sms_min", window = 60, max_requests = 5 },
    { key_prefix = "sms_hour", window = 3600, max_requests = 20 },
  },
  -- 登录：同一 IP 每分钟最多 10 次，每小时最多 60 次
  ["POST:/api/auth/login"] = {
    { key_prefix = "login_min", window = 60, max_requests = 10 },
    { key_prefix = "login_hour", window = 3600, max_requests = 60 },
  },
  -- 注册：同一 IP 每分钟最多 5 次，每小时最多 20 次
  ["POST:/api/auth/register"] = {
    { key_prefix = "reg_min", window = 60, max_requests = 5 },
    { key_prefix = "reg_hour", window = 3600, max_requests = 20 },
  },
}

--- 检查并递增计数器，超限返回 true。
-- @param ip string 客户端 IP
-- @param method string HTTP 方法
-- @param uri string 请求路径
-- @return boolean 是否超限
function _M.is_limited(ip, method, uri)
  local route_key = method .. ":" .. uri
  local rules = _M.base_rules[route_key]
  if not rules then
    return false
  end

  local multiplier = get_multiplier()

  for _, rule in ipairs(rules) do
    local key = rule.key_prefix .. ":" .. ip
    local count = shared:get(key)
    local limit = rule.max_requests * multiplier

    if not count then
      -- 首次请求，初始化计数器
      shared:set(key, 1, rule.window)
    else
      if count >= limit then
        return true
      end
      shared:incr(key, 1)
    end
  end

  return false
end

return _M
