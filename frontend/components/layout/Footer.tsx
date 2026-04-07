/**
 * 官网底部
 * 三栏布局：公司简介、联系方式、二维码
 * 底部 ICP 备案信息
 */

import { Phone, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-3">
        {/* 公司简介 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">慕大国际教育</h3>
          <p className="text-sm leading-relaxed">
            慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。
            慕尼黑大学语言中心是官方德语培训基地考点。
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="#"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="text-xs">微</span>
            </a>
            <a
              href="#"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition-colors hover:bg-primary hover:text-white"
            >
              <span className="text-xs">博</span>
            </a>
          </div>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">联系我们</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              苏州市吴中区苏州大学城林泉街377号公共学院5号楼7楼
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              189-1268-6656
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              haoanmuaxeng@163.com
            </li>
          </ul>
        </div>

        {/* 二维码 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">申请留学</h3>
          <div className="flex h-28 w-28 items-center justify-center rounded bg-gray-800 text-xs text-gray-500">
            二维码占位
          </div>
          <p className="mt-2 text-xs text-gray-500">官方客服微信</p>
        </div>
      </div>

      {/* ICP 备案 */}
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-600">
        苏ICP备2022046719号-1 | © {new Date().getFullYear()} 慕大国际教育
      </div>
    </footer>
  )
}
