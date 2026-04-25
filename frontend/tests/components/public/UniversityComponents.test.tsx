/**
 * UniversityDetail + UniversityList + CaseGrid 组件测试。
 * 验证院校详情渲染、院校列表加载/空状态、案例卡片网格。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params?.count !== undefined) return `${key}: ${params.count}`
    return key
  },
}))

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

vi.mock("@/components/admin/EditableOverlay", () => ({
  EditableOverlay: ({ children }: any) => <>{children}</>,
}))

vi.mock("@/components/public/UniversitySearch", () => ({
  UniversitySearch: () => <div data-testid="university-search" />,
}))

vi.mock("@/components/common/Pagination", () => ({
  Pagination: ({ page, totalPages }: any) => (
    <div data-testid="pagination">Page {page} of {totalPages}</div>
  ),
}))

vi.mock("@/components/public/ImageGallery", () => ({
  ImageGallery: () => <div data-testid="image-gallery" />,
}))

vi.mock("@/components/public/UniversityMap", () => ({
  UniversityMap: () => <div data-testid="university-map" />,
}))

vi.mock("@/components/common/SafeHtml", () => ({
  SafeHtml: ({ html, className }: any) => (
    <div className={className} data-testid="safe-html">{html}</div>
  ),
}))

const mockGet = vi.fn()
vi.mock("@/lib/api", () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}))

import { UniversityDetail } from "@/components/public/UniversityDetail"
import { UniversityList } from "@/components/public/UniversityList"
import { CaseGrid } from "@/components/public/CaseGrid"

/* ─── UniversityDetail ─── */

const mockUniData = {
  id: "u1",
  name: "清华大学",
  name_en: "Tsinghua University",
  country: "中国",
  province: "北京",
  city: "北京",
  website: "https://www.tsinghua.edu.cn",
  description: "<p>世界一流大学</p>",
  logo_image_id: "logo-1",
  image_ids: ["img-1"],
  disciplines: [
    { id: "d1", name: "计算机科学", category_name: "工学" },
    { id: "d2", name: "电子工程", category_name: "工学" },
  ],
  admission_requirements: "<p>高考成绩优异</p>",
  scholarship_info: null,
  qs_rankings: [
    { year: 2024, ranking: 25 },
    { year: 2023, ranking: 30 },
  ],
  latitude: 40.0,
  longitude: 116.3,
  related_cases: [
    { id: "c1", student_name: "张三", program: "计算机硕士", year: 2024, avatar_image_id: null },
  ],
}

describe("UniversityDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染院校名称和英文名", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText("清华大学")).toBeInTheDocument()
      expect(screen.getByText("Tsinghua University")).toBeInTheDocument()
    })
  })

  it("渲染地理位置信息", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText(/北京.*中国/)).toBeInTheDocument()
    })
  })

  it("渲染 QS 排名", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText(/QS 2024 #25/)).toBeInTheDocument()
    })
  })

  it("渲染学科分类", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText("工学")).toBeInTheDocument()
      expect(screen.getByText("计算机科学")).toBeInTheDocument()
      expect(screen.getByText("电子工程")).toBeInTheDocument()
    })
  })

  it("加载中显示骨架屏", () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    const { container } = render(<UniversityDetail universityId="u1" />)

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument()
  })

  it("院校不存在时显示错误提示", async () => {
    mockGet.mockResolvedValue({ data: null })

    render(<UniversityDetail universityId="invalid" />)

    await waitFor(() => {
      expect(screen.getByText("院校不存在")).toBeInTheDocument()
    })
  })

  it("渲染相关案例链接", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText("张三")).toBeInTheDocument()
      expect(screen.getByText(/计算机硕士/)).toBeInTheDocument()
    })
  })

  it("渲染官方网站链接", async () => {
    mockGet.mockResolvedValue({ data: mockUniData })

    render(<UniversityDetail universityId="u1" />)

    await waitFor(() => {
      expect(screen.getByText("website")).toBeInTheDocument()
    })
  })
})

/* ─── UniversityList ─── */

describe("UniversityList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("加载中显示加载状态", () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    render(<UniversityList />)

    expect(screen.getByText("loading")).toBeInTheDocument()
  })

  it("无结果时显示空状态", async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes("countries")) return Promise.resolve({ data: [] })
      return Promise.resolve({ data: { items: [], total: 0, total_pages: 1 } })
    })

    render(<UniversityList />)

    await waitFor(() => {
      expect(screen.getByText("noResults")).toBeInTheDocument()
    })
  })

  it("渲染院校卡片", async () => {
    const unis = [
      {
        id: "u1",
        name: "北京大学",
        name_en: "Peking University",
        country: "中国",
        city: "北京",
        logo_image_id: null,
        disciplines: [],
        qs_rankings: null,
        description: null,
      },
    ]
    mockGet.mockImplementation((url: string) => {
      if (url.includes("countries")) return Promise.resolve({ data: ["中国"] })
      return Promise.resolve({ data: { items: unis, total: 1, total_pages: 1 } })
    })

    render(<UniversityList />)

    await waitFor(() => {
      expect(screen.getByText("北京大学")).toBeInTheDocument()
      expect(screen.getByText("Peking University")).toBeInTheDocument()
    })
  })

  it("渲染搜索筛选栏", async () => {
    mockGet.mockResolvedValue({ data: { items: [], total: 0, total_pages: 1 } })

    render(<UniversityList />)

    expect(screen.getByTestId("university-search")).toBeInTheDocument()
  })
})

/* ─── CaseGrid ─── */

const mockCases = [
  {
    id: "c1",
    student_name: "李明",
    university: "哈佛大学",
    program: "MBA",
    year: 2024,
    testimonial: "非常好的体验",
    avatar_image_id: null,
  },
  {
    id: "c2",
    student_name: "王芳",
    university: "牛津大学",
    program: "法学硕士",
    year: 2023,
    testimonial: null,
    avatar_image_id: "avatar-1",
  },
]

describe("CaseGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("渲染案例卡片列表", async () => {
    mockGet.mockResolvedValue({ data: { items: mockCases } })

    render(<CaseGrid />)

    await waitFor(() => {
      expect(screen.getByText("李明")).toBeInTheDocument()
      expect(screen.getByText("哈佛大学")).toBeInTheDocument()
      expect(screen.getByText("王芳")).toBeInTheDocument()
      expect(screen.getByText("牛津大学")).toBeInTheDocument()
    })
  })

  it("渲染学生感言", async () => {
    mockGet.mockResolvedValue({ data: { items: mockCases } })

    render(<CaseGrid />)

    await waitFor(() => {
      expect(screen.getByText("非常好的体验")).toBeInTheDocument()
    })
  })

  it("无案例时显示空状态", async () => {
    mockGet.mockResolvedValue({ data: { items: [] } })

    render(<CaseGrid />)

    await waitFor(() => {
      expect(screen.getByText("noContent")).toBeInTheDocument()
    })
  })

  it("API 失败时显示空状态", async () => {
    mockGet.mockRejectedValue(new Error("fail"))

    render(<CaseGrid />)

    await waitFor(() => {
      expect(screen.getByText("noContent")).toBeInTheDocument()
    })
  })

  it("有头像时渲染头像图片", async () => {
    mockGet.mockResolvedValue({ data: { items: mockCases } })

    render(<CaseGrid />)

    await waitFor(() => {
      const img = screen.getByAltText("王芳")
      expect(img).toBeInTheDocument()
    })
  })

  it("editable 模式使用 admin API 路径", async () => {
    mockGet.mockResolvedValue({ data: { items: [] } })

    render(<CaseGrid editable />)

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        "/admin/web-settings/cases/list",
        expect.anything(),
      )
    })
  })

  it("非 editable 模式渲染案例链接", async () => {
    mockGet.mockResolvedValue({ data: { items: mockCases } })

    render(<CaseGrid />)

    await waitFor(() => {
      const link = screen.getByText("李明").closest("a")
      expect(link).toHaveAttribute("href", "/cases/c1")
    })
  })
})
