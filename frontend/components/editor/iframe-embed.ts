/**
 * 自定义 iframe 嵌入 Node 扩展。
 * 保存原始 iframe HTML，居中显示。
 * 编辑器内通过 NodeView + DOMPurify 渲染，公开页面通过 SafeHtml 渲染。
 */

import { Node } from "@tiptap/react"
import type { Editor } from "@tiptap/react"
import DOMPurify from "dompurify"

const PURIFY_CONFIG = {
  ADD_TAGS: ["iframe"] as string[],
  ADD_ATTR: [
    "allow", "allowfullscreen", "frameborder", "scrolling",
    "sandbox", "referrerpolicy", "loading", "tabindex",
    "style", "width", "height", "src",
  ],
}

/** iframe 嵌入 Node 扩展 */
export const IframeEmbed = Node.create({
  name: "iframeEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      rawHtml: {
        default: "",
        renderHTML() { return {} },
        parseHTML(el: HTMLElement) { return el.querySelector("iframe")?.outerHTML ?? "" },
      },
    }
  },

  parseHTML() {
    return [{ tag: "div.iframe-embed" }]
  },

  renderHTML({ node }) {
    const sanitized = typeof document !== "undefined"
      ? DOMPurify.sanitize(node.attrs.rawHtml || "", PURIFY_CONFIG)
      : node.attrs.rawHtml || ""

    const wrapper = document.createElement("div")
    wrapper.className = "iframe-embed"
    wrapper.style.cssText = "margin:1rem auto;text-align:center"
    wrapper.innerHTML = sanitized
    return { dom: wrapper }
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div")
      dom.className = "iframe-embed"
      dom.style.cssText = "margin:1rem auto;text-align:center"
      dom.contentEditable = "false"
      dom.innerHTML = DOMPurify.sanitize(node.attrs.rawHtml || "", PURIFY_CONFIG)

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== "iframeEmbed") return false
          dom.innerHTML = DOMPurify.sanitize(updatedNode.attrs.rawHtml || "", PURIFY_CONFIG)
          return true
        },
      }
    }
  },
})

/** 通过 prompt 输入 iframe HTML 或 URL 并插入 */
export function insertIframe(editor: Editor): void {
  const input = window.prompt(
    "请粘贴 iframe 代码或输入 URL\n\niframe 生成器：https://iframegenerator.top/",
  )
  if (!input) return

  const trimmed = input.trim()
  let rawHtml: string

  if (trimmed.startsWith("<iframe") || trimmed.startsWith("<IFRAME")) {
    rawHtml = trimmed
  } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    rawHtml = `<iframe src="${trimmed}" width="100%" height="450" frameborder="0" allowfullscreen></iframe>`
  } else {
    return
  }

  editor
    .chain()
    .focus()
    .insertContent({ type: "iframeEmbed", attrs: { rawHtml } })
    .run()
}
