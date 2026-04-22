/**
 * 编辑器图片上传逻辑。
 * 处理图片选择、粘贴、拖拽上传并插入编辑器。
 */

import type { Editor } from "@tiptap/react"
import api from "@/lib/api"

/** 上传图片到服务器，返回图片 URL */
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const { data } = await api.post(
    "/admin/web-settings/images/upload",
    formData,
  )
  return data.url
}

/** 判断文件是否为图片类型 */
function isImageFile(file: File): boolean {
  return file.type.startsWith("image/")
}

/** 上传图片并插入编辑器 */
async function uploadAndInsert(editor: Editor, file: File): Promise<void> {
  try {
    const url = await uploadImage(file)
    editor.chain().focus().setImage({ src: url }).run()
  } catch (error) {
    console.error("图片上传失败:", error)
  }
}

/** 处理粘贴事件中的图片上传 */
export function handleImagePaste(
  editor: Editor,
  event: ClipboardEvent,
): boolean {
  const items = event.clipboardData?.items
  if (!items) return false

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile()
      if (file) {
        event.preventDefault()
        uploadAndInsert(editor, file)
        return true
      }
    }
  }
  return false
}

/** 处理拖拽事件中的图片上传 */
export function handleImageDrop(
  editor: Editor,
  event: DragEvent,
): boolean {
  const files = event.dataTransfer?.files
  if (!files?.length) return false

  for (const file of files) {
    if (isImageFile(file)) {
      event.preventDefault()
      uploadAndInsert(editor, file)
      return true
    }
  }
  return false
}

/** 弹出文件选择器上传图片 */
export function handleImageSelect(editor: Editor): void {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "image/*"

  input.onchange = () => {
    const file = input.files?.[0]
    if (file) {
      uploadAndInsert(editor, file)
    }
  }

  input.click()
}
