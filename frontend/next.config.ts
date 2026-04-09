import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  /* 允许通过 frp 等反向代理访问开发服务器 */
  allowedDevOrigins: ["*"],

  /* Docker 挂载卷下 webpack 轮询监听文件变化（Windows/Mac） */
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
export default withNextIntl(nextConfig)
