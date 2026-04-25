/**
 * 编辑器工具函数和配置测试。
 * 覆盖 toolbar-config、video-embed、image-upload、editor-extensions。
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

/* ─── toolbar-config ─── */

import { getRow1Groups, getRow2Groups } from "@/components/editor/toolbar-config"

/** 创建 mock 编辑器 */
function createMockEditor() {
  const run = vi.fn()
  const chainMethods: any = {
    focus: vi.fn(() => chainMethods),
    undo: vi.fn(() => chainMethods),
    redo: vi.fn(() => chainMethods),
    toggleBold: vi.fn(() => chainMethods),
    toggleItalic: vi.fn(() => chainMethods),
    toggleUnderline: vi.fn(() => chainMethods),
    toggleStrike: vi.fn(() => chainMethods),
    toggleHeading: vi.fn(() => chainMethods),
    setColor: vi.fn(() => chainMethods),
    toggleHighlight: vi.fn(() => chainMethods),
    toggleBulletList: vi.fn(() => chainMethods),
    toggleOrderedList: vi.fn(() => chainMethods),
    toggleTaskList: vi.fn(() => chainMethods),
    toggleBlockquote: vi.fn(() => chainMethods),
    toggleCodeBlock: vi.fn(() => chainMethods),
    setHorizontalRule: vi.fn(() => chainMethods),
    setTextAlign: vi.fn(() => chainMethods),
    toggleSuperscript: vi.fn(() => chainMethods),
    toggleSubscript: vi.fn(() => chainMethods),
    setLink: vi.fn(() => chainMethods),
    setImage: vi.fn(() => chainMethods),
    insertContent: vi.fn(() => chainMethods),
    insertTable: vi.fn(() => chainMethods),
    run,
  }

  return {
    chain: vi.fn(() => chainMethods),
    isActive: vi.fn(() => false),
    _chainMethods: chainMethods,
    _run: run,
  }
}

describe("toolbar-config", () => {
  describe("getRow1Groups", () => {
    it("返回 4 个按钮分组", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      expect(groups).toHaveLength(4)
    })

    it("第一组包含 undo 和 redo", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      const keys = groups[0].buttons.map((b) => b.key)
      expect(keys).toEqual(["undo", "redo"])
    })

    it("第二组包含 4 级标题", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      const keys = groups[1].buttons.map((b) => b.key)
      expect(keys).toEqual(["heading1", "heading2", "heading3", "heading4"])
    })

    it("第三组包含文本格式按钮", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      const keys = groups[2].buttons.map((b) => b.key)
      expect(keys).toEqual(["bold", "italic", "underline", "strikethrough"])
    })

    it("第四组包含颜色按钮", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      const btns = groups[3].buttons
      expect(btns[0].key).toBe("textColor")
      expect(btns[0].type).toBe("color")
      expect(btns[0].colorKind).toBe("textColor")
      expect(btns[1].key).toBe("highlight")
      expect(btns[1].type).toBe("color")
      expect(btns[1].colorKind).toBe("highlight")
    })

    it("undo action 调用 editor chain", () => {
      const editor = createMockEditor()
      const groups = getRow1Groups(editor)

      groups[0].buttons[0].action!()
      expect(editor.chain).toHaveBeenCalled()
      expect(editor._chainMethods.undo).toHaveBeenCalled()
      expect(editor._run).toHaveBeenCalled()
    })

    it("bold 按钮带 active 状态", () => {
      const editor = createMockEditor()
      editor.isActive.mockImplementation((name: string) => name === "bold")
      const groups = getRow1Groups(editor)

      const boldBtn = groups[2].buttons[0]
      expect(boldBtn.active).toBe(true)
    })
  })

  describe("getRow2Groups", () => {
    it("返回 5 个按钮分组", () => {
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      expect(groups).toHaveLength(5)
    })

    it("第一组包含列表按钮", () => {
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      const keys = groups[0].buttons.map((b) => b.key)
      expect(keys).toEqual(["bulletList", "orderedList", "taskList"])
    })

    it("insertImage 按钮调用 onImageSelect", () => {
      const onImageSelect = vi.fn()
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect,
        onVideoInsert: vi.fn(),
      })

      const insertImageBtn = groups[4].buttons.find(
        (b) => b.key === "insertImage",
      )
      insertImageBtn!.action!()
      expect(onImageSelect).toHaveBeenCalled()
    })

    it("insertVideo 按钮调用 onVideoInsert", () => {
      const onVideoInsert = vi.fn()
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert,
      })

      const insertVideoBtn = groups[4].buttons.find(
        (b) => b.key === "insertVideo",
      )
      insertVideoBtn!.action!()
      expect(onVideoInsert).toHaveBeenCalled()
    })

    it("insertTable 按钮插入 3x3 表格", () => {
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      const insertTableBtn = groups[4].buttons.find(
        (b) => b.key === "insertTable",
      )
      insertTableBtn!.action!()
      expect(editor._chainMethods.insertTable).toHaveBeenCalledWith({
        rows: 3,
        cols: 3,
        withHeaderRow: true,
      })
    })

    it("insertLink 按钮通过 prompt 插入链接", () => {
      const editor = createMockEditor()
      vi.spyOn(window, "prompt").mockReturnValue("https://example.com")

      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      const linkBtn = groups[4].buttons.find((b) => b.key === "insertLink")
      linkBtn!.action!()

      expect(editor._chainMethods.setLink).toHaveBeenCalledWith({
        href: "https://example.com",
      })

      vi.restoreAllMocks()
    })

    it("insertLink 取消 prompt 不执行操作", () => {
      const editor = createMockEditor()
      vi.spyOn(window, "prompt").mockReturnValue(null)

      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      const linkBtn = groups[4].buttons.find((b) => b.key === "insertLink")
      linkBtn!.action!()

      expect(editor._chainMethods.setLink).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it("对齐按钮包含四种对齐方式", () => {
      const editor = createMockEditor()
      const groups = getRow2Groups(editor, {
        onImageSelect: vi.fn(),
        onVideoInsert: vi.fn(),
      })

      const alignKeys = groups[2].buttons.map((b) => b.key)
      expect(alignKeys).toEqual([
        "alignLeft",
        "alignCenter",
        "alignRight",
        "alignJustify",
      ])
    })
  })
})

/* ─── video-embed ─── */

import { parseVideoUrl, insertVideo } from "@/components/editor/video-embed"

describe("video-embed", () => {
  describe("parseVideoUrl", () => {
    it("解析 YouTube watch 链接", () => {
      const result = parseVideoUrl(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      )
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ")
    })

    it("解析 YouTube 短链接", () => {
      const result = parseVideoUrl("https://youtu.be/dQw4w9WgXcQ")
      expect(result).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ")
    })

    it("解析 Bilibili 视频链接", () => {
      const result = parseVideoUrl(
        "https://www.bilibili.com/video/BV1GJ411x7h7",
      )
      expect(result).toBe(
        "https://player.bilibili.com/player.html?bvid=BV1GJ411x7h7",
      )
    })

    it("不支持的链接返回 null", () => {
      expect(parseVideoUrl("https://example.com/video")).toBeNull()
    })

    it("空字符串返回 null", () => {
      expect(parseVideoUrl("")).toBeNull()
    })

    it("纯文本返回 null", () => {
      expect(parseVideoUrl("not a url")).toBeNull()
    })
  })

  describe("insertVideo", () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it("输入有效 YouTube 链接时插入视频", () => {
      const editor = createMockEditor()
      vi.spyOn(window, "prompt").mockReturnValue(
        "https://www.youtube.com/watch?v=abc123",
      )

      insertVideo(editor as any, "请输入视频链接")

      expect(editor._chainMethods.insertContent).toHaveBeenCalledWith({
        type: "videoEmbed",
        attrs: {
          src: "https://www.youtube.com/embed/abc123",
          videoUrl: "https://www.youtube.com/watch?v=abc123",
        },
      })
    })

    it("取消 prompt 不执行操作", () => {
      const editor = createMockEditor()
      vi.spyOn(window, "prompt").mockReturnValue(null)

      insertVideo(editor as any, "请输入视频链接")

      expect(editor.chain).not.toHaveBeenCalled()
    })

    it("无效链接不插入", () => {
      const editor = createMockEditor()
      vi.spyOn(window, "prompt").mockReturnValue("https://invalid.com/video")

      insertVideo(editor as any, "请输入视频链接")

      expect(editor._chainMethods.insertContent).not.toHaveBeenCalled()
    })

    it("传递 prompt 文本", () => {
      const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null)

      insertVideo(createMockEditor() as any, "输入视频地址")

      expect(promptSpy).toHaveBeenCalledWith("输入视频地址")
    })
  })
})

/* ─── image-upload ─── */

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}))

import { uploadImage, handleImagePaste, handleImageDrop, handleImageSelect } from "@/components/editor/image-upload"
import api from "@/lib/api"

describe("image-upload", () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset()
  })

  describe("uploadImage", () => {
    it("上传文件并返回 URL", async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { url: "/images/test.webp" },
      })

      const file = new File(["test"], "test.png", { type: "image/png" })
      const url = await uploadImage(file)

      expect(url).toBe("/images/test.webp")
      expect(api.post).toHaveBeenCalledWith(
        "/admin/web-settings/images/upload",
        expect.any(FormData),
      )
    })

    it("上传失败时抛出错误", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("upload failed"))

      const file = new File(["test"], "test.png", { type: "image/png" })
      await expect(uploadImage(file)).rejects.toThrow("upload failed")
    })
  })

  describe("handleImagePaste", () => {
    it("粘贴图片时返回 true", () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { url: "/images/pasted.webp" },
      })

      const editor = createMockEditor()
      const file = new File(["img"], "image.png", { type: "image/png" })
      const event = {
        clipboardData: {
          items: [
            {
              type: "image/png",
              getAsFile: () => file,
            },
          ],
        },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent

      const result = handleImagePaste(editor as any, event)

      expect(result).toBe(true)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it("无图片内容时返回 false", () => {
      const editor = createMockEditor()
      const event = {
        clipboardData: {
          items: [{ type: "text/plain", getAsFile: () => null }],
        },
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent

      const result = handleImagePaste(editor as any, event)

      expect(result).toBe(false)
    })

    it("无 clipboardData 时返回 false", () => {
      const editor = createMockEditor()
      const event = {
        clipboardData: null,
        preventDefault: vi.fn(),
      } as unknown as ClipboardEvent

      const result = handleImagePaste(editor as any, event)

      expect(result).toBe(false)
    })
  })

  describe("handleImageDrop", () => {
    it("拖入图片时返回 true", () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { url: "/images/dropped.webp" },
      })

      const editor = createMockEditor()
      const file = new File(["img"], "photo.jpg", { type: "image/jpeg" })
      const event = {
        dataTransfer: { files: [file] },
        preventDefault: vi.fn(),
      } as unknown as DragEvent

      const result = handleImageDrop(editor as any, event)

      expect(result).toBe(true)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it("无文件时返回 false", () => {
      const editor = createMockEditor()
      const event = {
        dataTransfer: { files: [] },
        preventDefault: vi.fn(),
      } as unknown as DragEvent

      const result = handleImageDrop(editor as any, event)

      expect(result).toBe(false)
    })

    it("非图片文件返回 false", () => {
      const editor = createMockEditor()
      const file = new File(["txt"], "doc.txt", { type: "text/plain" })
      const event = {
        dataTransfer: { files: [file] },
        preventDefault: vi.fn(),
      } as unknown as DragEvent

      const result = handleImageDrop(editor as any, event)

      expect(result).toBe(false)
    })

    it("无 dataTransfer 时返回 false", () => {
      const editor = createMockEditor()
      const event = {
        dataTransfer: null,
        preventDefault: vi.fn(),
      } as unknown as DragEvent

      const result = handleImageDrop(editor as any, event)

      expect(result).toBe(false)
    })
  })

  describe("handleImageSelect", () => {
    it("创建文件输入并触发点击", () => {
      const editor = createMockEditor()
      const clickSpy = vi.fn()

      vi.spyOn(document, "createElement").mockReturnValue({
        type: "",
        accept: "",
        onchange: null,
        click: clickSpy,
        files: null,
      } as unknown as HTMLInputElement)

      handleImageSelect(editor as any)

      expect(clickSpy).toHaveBeenCalled()

      vi.restoreAllMocks()
    })
  })
})

/* ─── editor-extensions ─── */

/* 模拟所有 TipTap 扩展 */
vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => "StarterKit") },
}))
vi.mock("@tiptap/extension-image", () => ({
  default: { configure: vi.fn(() => "Image") },
}))
vi.mock("@tiptap/extension-link", () => ({
  default: { configure: vi.fn(() => "Link") },
}))
vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn((_opts: any) => "Placeholder") },
}))
vi.mock("@tiptap/extension-underline", () => ({
  default: "Underline",
}))
vi.mock("@tiptap/extension-color", () => ({
  default: "Color",
}))
vi.mock("@tiptap/extension-text-style", () => ({
  TextStyle: "TextStyle",
}))
vi.mock("@tiptap/extension-highlight", () => ({
  default: { configure: vi.fn(() => "Highlight") },
}))
vi.mock("@tiptap/extension-text-align", () => ({
  default: { configure: vi.fn(() => "TextAlign") },
}))
vi.mock("@tiptap/extension-table", () => ({
  Table: { configure: vi.fn(() => "Table") },
}))
vi.mock("@tiptap/extension-table-row", () => ({
  default: "TableRow",
}))
vi.mock("@tiptap/extension-table-cell", () => ({
  default: "TableCell",
}))
vi.mock("@tiptap/extension-table-header", () => ({
  default: "TableHeader",
}))
vi.mock("@tiptap/extension-task-list", () => ({
  default: "TaskList",
}))
vi.mock("@tiptap/extension-task-item", () => ({
  default: { configure: vi.fn(() => "TaskItem") },
}))
vi.mock("@tiptap/extension-superscript", () => ({
  default: "Superscript",
}))
vi.mock("@tiptap/extension-subscript", () => ({
  default: "Subscript",
}))
vi.mock("@tiptap/react", () => ({
  Node: {
    create: vi.fn(() => "VideoEmbed"),
  },
  mergeAttributes: vi.fn(),
}))

import { createEditorExtensions } from "@/components/editor/editor-extensions"

describe("editor-extensions", () => {
  it("返回扩展数组", () => {
    const extensions = createEditorExtensions()

    expect(Array.isArray(extensions)).toBe(true)
    expect(extensions.length).toBeGreaterThan(10)
  })

  it("包含核心扩展", () => {
    const extensions = createEditorExtensions()

    expect(extensions).toContain("StarterKit")
    expect(extensions).toContain("Image")
    expect(extensions).toContain("Link")
    expect(extensions).toContain("Underline")
    expect(extensions).toContain("Color")
  })

  it("包含表格相关扩展", () => {
    const extensions = createEditorExtensions()

    expect(extensions).toContain("Table")
    expect(extensions).toContain("TableRow")
    expect(extensions).toContain("TableCell")
    expect(extensions).toContain("TableHeader")
  })

  it("传入 placeholder 选项", () => {
    const extensions = createEditorExtensions({ placeholder: "请输入内容" })

    /* 验证扩展列表包含 Placeholder（由 mock 返回的字符串） */
    expect(extensions).toContain("Placeholder")
  })

  it("无 placeholder 时也包含 Placeholder 扩展", () => {
    const extensions = createEditorExtensions()

    expect(extensions).toContain("Placeholder")
  })
})
