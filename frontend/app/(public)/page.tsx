import { Banner } from "@/components/layout/Banner"
import {
  GraduationCap,
  Globe,
  FileCheck,
  Users,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

/** 服务项目数据 */
const services = [
  {
    icon: GraduationCap,
    title: "出国留学",
    desc: "德国、日本、新加坡等多国留学项目，提供全方位留学咨询服务",
    href: "/study-abroad",
  },
  {
    icon: Globe,
    title: "院校选择",
    desc: "精选海外知名院校，根据学生条件匹配最适合的院校和专业",
    href: "/universities",
  },
  {
    icon: FileCheck,
    title: "签证办理",
    desc: "专业签证顾问团队，高通过率签证申请服务",
    href: "/visa",
  },
  {
    icon: Users,
    title: "成功案例",
    desc: "数百位学子成功留学，覆盖多国知名院校",
    href: "/cases",
  },
]

/** 统计数据 */
const stats = [
  { value: "15+", label: "年办学经验" },
  { value: "500+", label: "成功案例" },
  { value: "50+", label: "合作院校" },
  { value: "98%", label: "签证通过率" },
]

/** 官网首页 */
export default function HomePage() {
  return (
    <>
      {/* Hero Banner */}
      <Banner
        title="慕大国际教育"
        subtitle="专注国际教育 专注出国服务"
        large
      />

      {/* 数据统计 */}
      <section className="border-b bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 关于我们 */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            About Us
          </h2>
          <h3 className="mt-2 text-3xl font-bold">关于我们</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <p className="mx-auto mt-8 max-w-3xl text-center leading-relaxed text-muted-foreground">
          慕大国际从事小语种留学项目运营已15年，为慕尼黑大学语言中心江苏省唯一指定招生考点。
          慕尼黑大学语言中心是官方德语培训基地考点。我们致力于为学生提供全方位的留学咨询、
          院校申请、签证办理等一站式服务。
        </p>
      </section>

      {/* 精选服务 */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Our Services
            </h2>
            <h3 className="mt-2 text-3xl font-bold">精选服务</h3>
            <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group rounded-lg border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <service.icon className="h-10 w-10 text-gray-400 transition-colors group-hover:text-primary" />
                <h4 className="mt-4 text-lg font-bold transition-colors group-hover:text-primary">
                  {service.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {service.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  了解更多 <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 热门留学国家 */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Popular Destinations
          </h2>
          <h3 className="mt-2 text-3xl font-bold">热门留学国家</h3>
          <div className="mx-auto mt-3 h-0.5 w-12 bg-primary" />
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {["德国", "日本", "新加坡"].map((country) => (
            <div
              key={country}
              className="group relative overflow-hidden rounded-lg cursor-pointer"
              style={{
                backgroundImage:
                  'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              }}
            >
              <div className="flex h-48 items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <div className="text-center text-white">
                  <h4 className="text-2xl font-bold">{country}</h4>
                  <p className="mt-2 text-sm text-white/70 transition-colors group-hover:text-white">
                    查看 {country} 留学项目 →
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 最新资讯 */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Latest News
              </h2>
              <h3 className="mt-2 text-3xl font-bold">最新资讯</h3>
            </div>
            <Link
              href="/news"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              查看全部 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="group rounded-lg border bg-white p-6 transition-all duration-200 hover:border-primary hover:shadow-sm"
              >
                <div className="text-xs text-muted-foreground">
                  2026-04-07
                </div>
                <h4 className="mt-2 font-bold transition-colors group-hover:text-primary">
                  文章标题占位 {i}
                </h4>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  这里是文章摘要的占位内容，后续从 API 获取真实数据填充。
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h3 className="text-3xl font-bold">开启你的留学之旅</h3>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            15年专注国际教育，为你提供最专业的留学咨询服务
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-lg border-2 border-primary bg-white px-8 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            立即咨询
          </Link>
        </div>
      </section>
    </>
  )
}
