--- JWT Cookie 生成模块（骨架）。
-- 拦截登录/注册/续签响应，生成 JWT 并添加 Set-Cookie。
-- 在 header_filter_by_lua 阶段执行。

-- 只处理成功响应
if ngx.status ~= 200 then
  return
end

-- TODO: 完整实现需要在 body_filter_by_lua 中解析 JSON 响应体，
-- 用响应中的用户信息生成 access_token 和 refresh_token JWT，
-- 通过 ngx.header["Set-Cookie"] 添加 Cookie。
-- 读取请求头 X-Keep-Login 决定 refresh token 的 max-age。
--
-- 骨架阶段暂不实现 JWT 生成逻辑，后续迭代完善。
