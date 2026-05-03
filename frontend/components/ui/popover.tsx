"use client"

/**
 * Popover 组件。
 * 基于 @base-ui/react/dialog，提供悬浮弹出层。
 */

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "@/lib/utils"

function Popover({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: DialogPrimitive.Popup.Props & {
  align?: "start" | "center" | "end"
  sideOffset?: number
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Popup
        data-slot="popover-content"
        className={cn(
          "z-50 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
