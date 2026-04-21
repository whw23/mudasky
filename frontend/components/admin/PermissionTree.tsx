"use client"

/**
 * Miller Columns 分栏浏览权限选择器。
 * 从后端 permission_tree API 获取层级数据，支持分栏导航、级联勾选、搜索过滤。
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import api from "@/lib/api"

/** 权限树节点 */
interface TreeNode { description: string; children?: Record<string, TreeNode> }
/** 权限树数据（后端返回） */
type PermissionTree = Record<string, TreeNode>

export interface PermissionTreeProps {
  selectedCodes: Set<string>
  onSelectionChange: (codes: Set<string>) => void
  readonly?: boolean
}

/** 将下划线 key 转为连字符 URL 路径段 */
function keyToSlug(key: string): string { return key.replace(/_/g, "-") }

/** 收集节点下所有叶子路径 */
function collectLeaves(node: TreeNode, prefix: string): string[] {
  if (!node.children) return [prefix]
  const leaves: string[] = []
  for (const [key, child] of Object.entries(node.children)) {
    const path = prefix ? `${prefix}/${keyToSlug(key)}` : keyToSlug(key)
    leaves.push(...collectLeaves(child, path))
  }
  return leaves
}

/** 从整棵树收集所有叶子路径 */
export function collectAllLeaves(tree: PermissionTree): string[] {
  const leaves: string[] = []
  for (const [key, node] of Object.entries(tree))
    leaves.push(...collectLeaves(node, keyToSlug(key)))
  return leaves
}

/** 将通配符权限展开为叶子路径集合 */
export function expandWildcards(codes: Set<string>, tree: PermissionTree): Set<string> {
  const allLeaves = collectAllLeaves(tree)
  const result = new Set<string>()
  for (const code of codes) {
    if (code === "*") {
      for (const l of allLeaves) result.add(l)
    } else if (code.endsWith("/*")) {
      const prefix = code.slice(0, -1)
      for (const l of allLeaves) { if (l.startsWith(prefix)) result.add(l) }
    } else {
      result.add(code)
    }
  }
  return result
}

/** 将叶子集合压缩为通配符表示 */
export function collapseToWildcards(selected: Set<string>, tree: PermissionTree): Set<string> {
  const allLeaves = collectAllLeaves(tree)
  if (allLeaves.length > 0 && allLeaves.every((l) => selected.has(l)))
    return new Set(["*"])
  return new Set(selected)
}

/** 判断节点或其后代是否匹配搜索词 */
function nodeMatches(node: TreeNode, query: string): boolean {
  if (node.description.toLowerCase().includes(query)) return true
  if (!node.children) return false
  return Object.values(node.children).some((c) => nodeMatches(c, query))
}

/** 根据 activePath 定位节点，返回其 children */
function resolveChildren(tree: PermissionTree, path: string[]): Record<string, TreeNode> | null {
  if (path.length === 0) return tree
  let current: Record<string, TreeNode> | undefined = tree
  for (const seg of path) {
    const node: TreeNode | undefined = current?.[seg]
    if (!node?.children) return null
    current = node.children
  }
  return current ?? null
}

/** 根据 key 路径数组构建权限码前缀 */
function buildPrefix(path: string[]): string { return path.map(keyToSlug).join("/") }

/** 栏列信息 */
interface ColumnInfo { key: string; title: string; entries: [string, TreeNode][] }

/** 单栏行组件 */
function ColumnRow({ nodeKey, node, prefix, isActive, selected, onToggle, onNavigate, readonly, query }: {
  nodeKey: string; node: TreeNode; prefix: string; isActive: boolean
  selected: Set<string>; onToggle: (leaves: string[]) => void
  onNavigate: (key: string) => void; readonly: boolean; query: string
}) {
  const fullPath = prefix ? `${prefix}/${keyToSlug(nodeKey)}` : keyToSlug(nodeKey)
  const isLeaf = !node.children
  const leaves = useMemo(() => collectLeaves(node, fullPath), [node, fullPath])
  const count = useMemo(() => leaves.filter((l) => selected.has(l)).length, [leaves, selected])
  const allChecked = leaves.length > 0 && count === leaves.length
  const indeterminate = count > 0 && !allChecked

  if (query && !nodeMatches(node, query)) return null

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1.5 text-sm cursor-pointer transition-colors
        ${isActive ? "bg-primary/10" : "hover:bg-muted/40"}`}
      onClick={() => !isLeaf && onNavigate(nodeKey)}
    >
      {!readonly && (
        <Checkbox
          checked={allChecked} indeterminate={indeterminate}
          onCheckedChange={() => onToggle(leaves)}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      )}
      <span className="flex-1 truncate">{node.description}</span>
      {!isLeaf && (
        <>
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1">{count}/{leaves.length}</span>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </>
      )}
    </div>
  )
}

/** 面包屑导航 */
function Breadcrumb({ activePath, tree, t, onNavigate }: {
  activePath: string[]; tree: PermissionTree
  t: (key: string) => string; onNavigate: (path: string[]) => void
}) {
  if (activePath.length === 0) return null
  return (
    <div className="flex items-center gap-1 border-b px-3 py-1.5 text-xs text-muted-foreground overflow-x-auto">
      <button type="button" className="hover:text-primary shrink-0" onClick={() => onNavigate([])}>
        {t("panels")}
      </button>
      {activePath.map((seg, i) => {
        const parent = resolveChildren(tree, activePath.slice(0, i))
        const desc = parent?.[seg]?.description ?? seg
        return (
          <span key={seg + i} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="size-3" />
            <button type="button" className="hover:text-primary"
              onClick={() => onNavigate(activePath.slice(0, i + 1))}>{desc}</button>
          </span>
        )
      })}
    </div>
  )
}

/** 构建栏列数据 */
function buildColumns(tree: PermissionTree, activePath: string[], panelsLabel: string): ColumnInfo[] {
  const cols: ColumnInfo[] = [{ key: "root", title: panelsLabel, entries: Object.entries(tree) }]
  for (let i = 0; i < activePath.length; i++) {
    const sub = activePath.slice(0, i + 1)
    const children = resolveChildren(tree, sub)
    if (!children) break
    const parent = resolveChildren(tree, sub.slice(0, -1))
    cols.push({ key: sub.join("/"), title: parent?.[activePath[i]]?.description ?? "", entries: Object.entries(children) })
  }
  return cols
}

/** Miller Columns 分栏浏览权限选择器 */
export function PermissionTree({ selectedCodes, onSelectionChange, readonly = false }: PermissionTreeProps) {
  const t = useTranslations("AdminGroups")
  const [tree, setTree] = useState<PermissionTree | null>(null)
  const [activePath, setActivePath] = useState<string[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    api.get<{ permission_tree: PermissionTree }>("/admin/roles/meta")
      .then(({ data }) => setTree(data.permission_tree))
      .catch(() => setTree(null))
  }, [])

  const allLeaves = useMemo(() => (tree ? collectAllLeaves(tree) : []), [tree])
  const totalChecked = useMemo(() => allLeaves.filter((l) => selectedCodes.has(l)).length, [allLeaves, selectedCodes])

  const handleToggle = useCallback((leaves: string[]) => {
    if (readonly) return
    const allOn = leaves.every((l) => selectedCodes.has(l))
    const next = new Set(selectedCodes)
    for (const l of leaves) allOn ? next.delete(l) : next.add(l)
    onSelectionChange(next)
  }, [readonly, selectedCodes, onSelectionChange])

  const handleToggleAll = useCallback(() => {
    if (readonly) return
    const allOn = allLeaves.every((l) => selectedCodes.has(l))
    onSelectionChange(allOn ? new Set() : new Set(allLeaves))
  }, [readonly, allLeaves, selectedCodes, onSelectionChange])

  const query = search.trim().toLowerCase()
  if (!tree) return null

  const columns = buildColumns(tree, activePath, t("panels"))

  return (
    <div className="rounded-lg border">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <Input className="h-7 text-xs flex-1" placeholder={t("searchPermissions")}
          value={search} onChange={(e) => setSearch(e.target.value)} />
        {!readonly && (
          <button type="button" className="text-xs text-primary hover:underline whitespace-nowrap"
            onClick={handleToggleAll}>{t("toggleAll")}</button>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap">{totalChecked}/{allLeaves.length}</span>
      </div>

      <Breadcrumb activePath={activePath} tree={tree} t={t} onNavigate={setActivePath} />

      {/* 分栏区域 */}
      <div className="flex overflow-x-auto" style={{ maxHeight: 340 }}>
        {columns.map((col, ci) => {
          const isLast = ci === columns.length - 1
          const prefix = ci === 0 ? "" : buildPrefix(activePath.slice(0, ci))
          return (
            <div key={col.key}
              className={`shrink-0 overflow-y-auto border-r last:border-r-0
                ${isLast ? "min-w-[140px] flex-1" : "min-w-[140px] w-[140px]"}`}>
              <div className="sticky top-0 bg-muted/50 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                {col.title}
              </div>
              {col.entries.map(([key, node]) => (
                <ColumnRow key={key} nodeKey={key} node={node} prefix={prefix}
                  isActive={activePath[ci] === key} selected={selectedCodes} onToggle={handleToggle}
                  onNavigate={(k) => setActivePath([...activePath.slice(0, ci), k])}
                  readonly={readonly} query={query} />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
