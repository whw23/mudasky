/**
 * 自定义视频嵌入 Node 扩展。
 * 支持 YouTube 和 Bilibili 视频链接解析与嵌入，拖拽调整尺寸，默认居中。
 */

import { Node, mergeAttributes, ResizableNodeView } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

/** 解析视频 URL 为可嵌入的 iframe 地址 */
export function parseVideoUrl(url: string): string | null {
  const ytWatch = url.match(/(?:youtube\.com\/watch\?v=)([\w-]+)/)
  if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`

  const ytShort = url.match(/(?:youtu\.be\/)([\w-]+)/)
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`

  const bili = url.match(/bilibili\.com\/video\/(BV[\w]+)/)
  if (bili) return `https://player.bilibili.com/player.html?bvid=${bili[1]}`

  return null
}

/** 视频嵌入 Node 扩展 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      videoUrl: { default: null },
      width: { default: 640 },
      height: { default: 360 },
    }
  },

  parseHTML() {
    return [{
      tag: "div[data-video-url]",
      getAttrs(el) {
        const dom = el as HTMLElement
        const iframe = dom.querySelector("iframe")
        return {
          videoUrl: dom.getAttribute("data-video-url"),
          src: iframe?.getAttribute("src") ?? null,
          width: parseInt(iframe?.getAttribute("width") ?? "640", 10),
          height: parseInt(iframe?.getAttribute("height") ?? "360", 10),
        }
      },
    }]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, videoUrl, width, height, style, ...rest } = HTMLAttributes
    const w = width || 640
    const h = height || 360
    const align = style?.match(/text-align:\s*(\w+)/)?.[1]
    const margin = align === "left" ? "margin:0 auto 0 0"
      : align === "right" ? "margin:0 0 0 auto"
      : "margin:0 auto"

    return [
      "div",
      mergeAttributes(rest, {
        "data-video-url": videoUrl,
        class: "video-embed",
        style: `max-width:${w}px;${margin}`,
      }),
      [
        "div",
        { style: `position:relative;padding-bottom:${(h / w * 100).toFixed(2)}%;height:0;overflow:hidden` },
        [
          "iframe",
          {
            src,
            width: String(w),
            height: String(h),
            frameborder: "0",
            allowfullscreen: "true",
            style: "position:absolute;top:0;left:0;width:100%;height:100%",
          },
        ],
      ],
    ]
  },

  addNodeView() {
    return ({ node, getPos, editor: nodeEditor }) => {
      const container = document.createElement("div")
      container.className = "video-embed"

      const w = node.attrs.width || 640
      const h = node.attrs.height || 360

      container.style.cssText = `width:${w}px;max-width:100%`

      const ratio = document.createElement("div")
      ratio.style.cssText = `position:relative;padding-bottom:${(h / w * 100).toFixed(2)}%;height:0;overflow:hidden`

      const iframe = document.createElement("iframe")
      iframe.src = node.attrs.src || ""
      iframe.setAttribute("frameborder", "0")
      iframe.setAttribute("allowfullscreen", "true")
      iframe.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%"

      ratio.appendChild(iframe)
      container.appendChild(ratio)

      const nodeView = new ResizableNodeView({
        element: container,
        editor: nodeEditor,
        node,
        getPos,
        onResize: (newW, newH) => {
          container.style.width = `${newW}px`
          ratio.style.paddingBottom = `${(newH / newW * 100).toFixed(2)}%`
        },
        onCommit: (newW, newH) => {
          const pos = getPos()
          if (pos === undefined) return
          nodeEditor.chain().setNodeSelection(pos).updateAttributes("videoEmbed", {
            width: newW, height: newH,
          }).run()
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false
          iframe.src = updatedNode.attrs.src || ""
          applyAlignClass(nodeView.dom as HTMLElement, updatedNode.attrs.textAlign)
          return true
        },
        options: {
          directions: ["bottom-right", "bottom-left"],
          min: { width: 200, height: 112 },
          preserveAspectRatio: true,
        },
      })

      applyAlignClass(nodeView.dom as HTMLElement, node.attrs.textAlign)

      return nodeView
    }
  },
})

/** 设置对齐 CSS class */
function applyAlignClass(el: HTMLElement, align?: string): void {
  el.classList.remove("align-left", "align-right")
  if (align === "left") el.classList.add("align-left")
  else if (align === "right") el.classList.add("align-right")
}

/** 通过 prompt 输入视频链接并插入编辑器 */
export function insertVideo(editor: Editor, promptText: string): void {
  const url = window.prompt(promptText)
  if (!url) return

  const embedUrl = parseVideoUrl(url)
  if (!embedUrl) return

  editor
    .chain()
    .focus()
    .insertContent({
      type: "videoEmbed",
      attrs: { src: embedUrl, videoUrl: url },
    })
    .run()
}
