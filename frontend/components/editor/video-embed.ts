/**
 * 自定义视频嵌入 Node 扩展。
 * 支持 YouTube 和 Bilibili 视频链接解析与嵌入。
 */

import { Node, mergeAttributes } from "@tiptap/react"
import type { Editor } from "@tiptap/react"

/** 解析视频 URL 为可嵌入的 iframe 地址 */
export function parseVideoUrl(url: string): string | null {
  /* YouTube: youtube.com/watch?v=xxx */
  const ytWatch = url.match(
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
  )
  if (ytWatch) {
    return `https://www.youtube.com/embed/${ytWatch[1]}`
  }

  /* YouTube: youtu.be/xxx */
  const ytShort = url.match(/(?:youtu\.be\/)([\w-]+)/)
  if (ytShort) {
    return `https://www.youtube.com/embed/${ytShort[1]}`
  }

  /* Bilibili: bilibili.com/video/BVxxx */
  const bili = url.match(/bilibili\.com\/video\/(BV[\w]+)/)
  if (bili) {
    return `https://player.bilibili.com/player.html?bvid=${bili[1]}`
  }

  return null
}

/** 视频嵌入 Node 扩展 */
export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
      videoUrl: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-video-url]" }]
  },

  renderHTML({ HTMLAttributes }) {
    const { src, videoUrl, ...rest } = HTMLAttributes

    return [
      "div",
      mergeAttributes(rest, {
        "data-video-url": videoUrl,
        class: "video-embed",
        style:
          "position:relative;padding-bottom:56.25%;height:0;overflow:hidden",
      }),
      [
        "iframe",
        {
          src,
          frameborder: "0",
          allowfullscreen: "true",
          style:
            "position:absolute;top:0;left:0;width:100%;height:100%",
        },
      ],
    ]
  },
})

/** 通过 prompt 输入视频链接并插入编辑器 */
export function insertVideo(
  editor: Editor,
  promptText: string,
): void {
  const url = window.prompt(promptText)
  if (!url) return

  const embedUrl = parseVideoUrl(url)
  if (!embedUrl) {
    return
  }

  editor
    .chain()
    .focus()
    .insertContent({
      type: "videoEmbed",
      attrs: { src: embedUrl, videoUrl: url },
    })
    .run()
}
