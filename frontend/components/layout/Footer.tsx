/**
 * 官网底部
 * 三栏布局：公司简介、联系方式、二维码占位
 * 底部 ICP 备案信息
 */

export function Footer() {
  return (
    <footer className="bg-gray-800 text-gray-300">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 md:grid-cols-3">
        {/* 公司简介 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">慕大国际教育</h3>
          <p className="text-sm leading-relaxed">
            专注国际教育，专注出国服务。我们致力于为学生提供全方位的留学咨询、
            院校申请、签证办理等一站式服务。
          </p>
        </div>

        {/* 联系方式 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">联系方式</h3>
          <ul className="space-y-2 text-sm">
            <li>电话：400-888-8888</li>
            <li>邮箱：info@mudasky.com</li>
            <li>地址：北京市朝阳区</li>
          </ul>
        </div>

        {/* 二维码占位 */}
        <div>
          <h3 className="mb-4 text-lg font-bold text-white">关注我们</h3>
          <div className="flex size-32 items-center justify-center rounded bg-gray-700 text-sm text-gray-400">
            二维码占位
          </div>
        </div>
      </div>

      {/* ICP 备案 */}
      <div className="border-t border-gray-700 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} 慕大国际教育 版权所有 |
        京ICP备XXXXXXXX号-1
      </div>
    </footer>
  )
}
