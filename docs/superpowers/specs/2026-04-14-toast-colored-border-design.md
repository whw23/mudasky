# Toast 彩色左边框样式设计

## 背景

当前项目使用 sonner 作为 toast 组件（通过 shadcn/ui 封装），所有类型的 toast（成功、错误、警告、信息）都是白底黑字 + 灰色图标，视觉上无法区分类型，显得简陋。

## 目标

通过轻量调整，为 toast 添加彩色左边框和彩色图标，使不同类型的 toast 在视觉上一眼可辨，同时保持当前 sonner 的基本形态。

## 设计方案

### 视觉规则

| 类型 | 左边框颜色 | 图标颜色 | 用途 |
|------|-----------|---------|------|
| error | 红色 (`destructive`) | 红色 | API 错误、操作失败 |
| success | 绿色 (`#22c55e`) | 绿色 | 操作成功（保存、删除等） |
| warning | 琥珀色 (`#f59e0b`) | 琥珀色 | 非致命警告（即将过期等） |
| info | 蓝色 (`#3b82f6`) | 蓝色 | 提示信息 |
| loading | 不加边框 | 当前灰色 | 加载中状态，保持中性 |

### 样式细节

- 左边框：`border-left: 3px solid <color>`
- 图标颜色通过 CSS 的 `color` 属性设置（lucide 图标继承 `currentColor`）
- 背景保持白色，文字保持当前颜色
- 阴影、圆角、字体大小不变
- 动画、位置、持续时间不变

### 改动范围

仅修改 `frontend/components/ui/sonner.tsx`：
- 在 `toastOptions.classNames` 中为 `error`、`success`、`warning`、`info` 分别指定 CSS class
- 通过 Tailwind 的 `border-l-3` + 颜色 class 实现左边框
- 图标颜色通过 `[&>svg]:text-<color>` 选择器设置

### 不改动的部分

- toast 的位置、动画、持续时间
- toast 的调用方式（`toast.error(...)` 等）
- 表单内联错误样式
- 其他组件代码
