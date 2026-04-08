--- IP 级别限流模块。
-- 使用 lua_shared_dict 实现滑动窗口计数器。
-- 针对敏感接口（短信、登录、注册）做 IP 维度限流。

local _M = {}

local shared = ngx.shared.rate_limit

--- 限流规则配置。
-- key_prefix: 限流键前缀
-- window: 时间窗口（秒）
-- max_requests: 窗口内最大请求数
_M.rules = {
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
  local rules = _M.rules[route_key]
  if not rules then
    return false
  end

  for _, rule in ipairs(rules) do
    local key = rule.key_prefix .. ":" .. ip
    local count = shared:get(key)

    if not count then
      -- 首次请求，初始化计数器
      shared:set(key, 1, rule.window)
    else
      if count >= rule.max_requests then
        return true
      end
      shared:incr(key, 1)
    end
  end

  return false
end

return _M
