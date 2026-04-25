/**
 * 卡片组件测试（GuideCard, TimelineCard, CityCard, ProgramCard, ChecklistCard）。
 * 验证各种卡片类型的渲染和数据展示。
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("@/lib/icon-utils", () => ({
  resolveIcon: (name: any, fallback: any) => {
    /* 无 icon name 时返回 null（与真实行为一致） */
    if (!name) return fallback ?? null
    const MockIcon = ({ className }: any) => <svg data-testid="mock-icon" className={className} />
    return MockIcon
  },
}))

import { GuideCard } from "@/components/blocks/cards/GuideCard"
import { TimelineCard } from "@/components/blocks/cards/TimelineCard"
import { CityCard } from "@/components/blocks/cards/CityCard"
import { ProgramCard } from "@/components/blocks/cards/ProgramCard"
import { ChecklistCard } from "@/components/blocks/cards/ChecklistCard"

describe("GuideCard", () => {
  it("渲染标题和描述", () => {
    render(
      <GuideCard
        card={{ title: { zh: "签证指南" }, desc: { zh: "签证申请详细流程" }, icon: "FileText" }}
        locale="zh"
      />,
    )

    expect(screen.getByText("签证指南")).toBeInTheDocument()
    expect(screen.getByText("签证申请详细流程")).toBeInTheDocument()
  })

  it("描述为空时不渲染描述段落", () => {
    const { container } = render(
      <GuideCard card={{ title: { zh: "仅标题" } }} locale="zh" />,
    )

    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs.length).toBe(0)
  })

  it("渲染纯字符串标题", () => {
    render(<GuideCard card={{ title: "纯文本标题" }} locale="zh" />)

    expect(screen.getByText("纯文本标题")).toBeInTheDocument()
  })
})

describe("TimelineCard", () => {
  it("渲染标题、时间和描述", () => {
    render(
      <TimelineCard
        card={{
          title: { zh: "准备材料" },
          time: { zh: "1-3月" },
          desc: { zh: "收集所需文件" },
        }}
        locale="zh"
      />,
    )

    expect(screen.getByText("准备材料")).toBeInTheDocument()
    expect(screen.getByText("1-3月")).toBeInTheDocument()
    expect(screen.getByText("收集所需文件")).toBeInTheDocument()
  })

  it("描述为空时不渲染描述段落", () => {
    const { container } = render(
      <TimelineCard
        card={{ title: { zh: "仅标题" }, time: { zh: "4月" } }}
        locale="zh"
      />,
    )

    const paragraphs = container.querySelectorAll("p")
    expect(paragraphs.length).toBe(0)
  })
})

describe("CityCard", () => {
  it("渲染城市和国家", () => {
    render(
      <CityCard
        card={{
          city: { zh: "伦敦" },
          country: { zh: "英国" },
          desc: { zh: "世界金融中心" },
        }}
        locale="zh"
      />,
    )

    expect(screen.getByText("伦敦")).toBeInTheDocument()
    expect(screen.getByText("英国")).toBeInTheDocument()
    expect(screen.getByText("世界金融中心")).toBeInTheDocument()
  })

  it("有图片 ID 时渲染图片", () => {
    render(
      <CityCard
        card={{ city: { zh: "巴黎" }, image_id: "img-paris" }}
        locale="zh"
      />,
    )

    const img = screen.getByAltText("巴黎")
    expect(img).toHaveAttribute("src", "/api/public/images/detail?id=img-paris")
  })

  it("无图片 ID 时不渲染图片", () => {
    render(<CityCard card={{ city: { zh: "东京" } }} locale="zh" />)

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("国家为空时不渲染国家标签", () => {
    render(<CityCard card={{ city: { zh: "柏林" }, country: {} }} locale="zh" />)

    /* 应只有城市名，无国家段落 */
    expect(screen.getByText("柏林")).toBeInTheDocument()
  })
})

describe("ProgramCard", () => {
  it("渲染项目名称、国家和描述", () => {
    render(
      <ProgramCard
        card={{
          name: { zh: "计算机科学" },
          country: { zh: "美国" },
          desc: { zh: "STEM 热门专业" },
        }}
        locale="zh"
      />,
    )

    expect(screen.getByText("计算机科学")).toBeInTheDocument()
    expect(screen.getByText("美国")).toBeInTheDocument()
    expect(screen.getByText("STEM 热门专业")).toBeInTheDocument()
  })

  it("渲染特色列表", () => {
    render(
      <ProgramCard
        card={{
          name: { zh: "MBA" },
          features: [{ zh: "全球认可" }, { zh: "实习机会" }],
        }}
        locale="zh"
      />,
    )

    expect(screen.getByText("全球认可")).toBeInTheDocument()
    expect(screen.getByText("实习机会")).toBeInTheDocument()
  })

  it("无特色列表时不渲染列表", () => {
    const { container } = render(
      <ProgramCard card={{ name: { zh: "金融学" } }} locale="zh" />,
    )

    expect(container.querySelector("ul")).toBeNull()
  })

  it("国家为空时不渲染国家标签", () => {
    const { container } = render(
      <ProgramCard card={{ name: { zh: "物理学" }, country: {} }} locale="zh" />,
    )

    /* 无国家标签 span */
    const badge = container.querySelector(".rounded-full")
    expect(badge).toBeNull()
  })
})

describe("ChecklistCard", () => {
  it("渲染标签和清单项", () => {
    render(
      <ChecklistCard
        card={{
          label: { zh: "申请材料" },
          items: [{ zh: "护照" }, { zh: "成绩单" }],
          icon: "ClipboardCheck",
        }}
        locale="zh"
      />,
    )

    expect(screen.getByText("申请材料")).toBeInTheDocument()
    expect(screen.getByText("护照")).toBeInTheDocument()
    expect(screen.getByText("成绩单")).toBeInTheDocument()
  })

  it("无清单项时不渲染列表", () => {
    const { container } = render(
      <ChecklistCard card={{ label: { zh: "空清单" }, items: [] }} locale="zh" />,
    )

    expect(container.querySelector("ul")).toBeNull()
  })

  it("items 非数组时不渲染列表", () => {
    const { container } = render(
      <ChecklistCard card={{ label: { zh: "测试" } }} locale="zh" />,
    )

    expect(container.querySelector("ul")).toBeNull()
  })

  it("无 icon 时不渲染图标容器", () => {
    const { container } = render(
      <ChecklistCard card={{ label: { zh: "无图标" }, items: [] }} locale="zh" />,
    )

    /* resolveIcon 返回 null 时不渲染图标 div */
    const iconContainer = container.querySelector(".rounded-full")
    expect(iconContainer).toBeNull()
  })
})
