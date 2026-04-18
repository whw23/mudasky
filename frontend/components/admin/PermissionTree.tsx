"use client"

/**
 * 递归树形权限选择器组件。
 * 从后端 permission_tree API 获取层级数据，支持展开/折叠、级联勾选、搜索过滤。
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ChevronRight, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import api from "@/lib/api"

/** 权限树节点 */
interface TreeNode {
  description: string
  children?: Record<string, TreeNode>
}

/** 权限树数据（后端返回） */
type PermissionTree = Record<string, TreeNode>

export interface PermissionTreeProps {
  /** 已选中的权限码集合（如 "admin/web-settings/articles/list"） */
  selectedCodes: Set<string>
  /** 选中变更回调 */
  onSelectionChange: (codes: Set<string>) => void
  /** 只读模式 */
  readonly?: boolean
}

/** 将下划线 key 转为连字符 URL 路径段 */
function keyToSlug(key: string): string {
  return key.replace(/_/g, "-")
}

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
  for (const [key, node] of Object.entries(tree)) {
    leaves.push(...collectLeaves(node, keyToSlug(key)))
  }
  return leaves
}

/** 判断节点或其后代是否匹配搜索词 */
function nodeMatches(node: TreeNode, query: string): boolean {
  if (node.description.toLowerCase().includes(query)) return true
  if (!node.children) return false
  return Object.values(node.children).some((child) => nodeMatches(child, query))
}

/** 递归树节点组件 */
function TreeNodeRow({
  nodeKey,
  node,
  path,
  level,
  selectedCodes,
  onToggle,
  readonly,
  expandedSet,
  onToggleExpand,
  searchQuery,
}: {
  nodeKey: string
  node: TreeNode
  path: string
  level: number
  selectedCodes: Set<string>
  onToggle: (leaves: string[], forceOn?: boolean) => void
  readonly: boolean
  expandedSet: Set<string>
  onToggleExpand: (path: string) => void
  searchQuery: string
}) {
  const isLeaf = !node.children
  const leaves = useMemo(() => collectLeaves(node, path), [node, path])
  const checkedCount = useMemo(() => leaves.filter((l) => selectedCodes.has(l)).length, [leaves, selectedCodes])
  const allChecked = leaves.length > 0 && checkedCount === leaves.length
  const indeterminate = checkedCount > 0 && !allChecked
  const isExpanded = expandedSet.has(path)

  /* 搜索过滤：不匹配则隐藏 */
  if (searchQuery && !nodeMatches(node, searchQuery)) return null

  return (
    <>
      <div
        className={`flex items-center gap-1.5 py-1.5 pr-2 text-sm transition-colors hover:bg-muted/40 ${
          readonly ? "" : "cursor-pointer"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (!isLeaf) onToggleExpand(path)
        }}
      >
        {/* 展开/折叠箭头 */}
        {isLeaf ? (
          <span className="w-4 shrink-0" />
        ) : (
          <button
            type="button"
            className="w-4 shrink-0 text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); onToggleExpand(path) }}
          >
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        )}

        {/* Checkbox */}
        {!readonly && (
          <Checkbox
            checked={allChecked}
            indeterminate={indeterminate}
            onCheckedChange={() => onToggle(leaves)}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {/* 描述 */}
        <span className="flex-1 truncate">{node.description}</span>

        {/* 叶子数统计（分支节点） */}
        {!isLeaf && (
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1">
            {checkedCount}/{leaves.length}
          </span>
        )}
      </div>

      {/* 递归子节点 */}
      {!isLeaf && isExpanded && Object.entries(node.children!).map(([childKey, child]) => (
        <TreeNodeRow
          key={childKey}
          nodeKey={childKey}
          node={child}
          path={`${path}/${keyToSlug(childKey)}`}
          level={level + 1}
          selectedCodes={selectedCodes}
          onToggle={onToggle}
          readonly={readonly}
          expandedSet={expandedSet}
          onToggleExpand={onToggleExpand}
          searchQuery={searchQuery}
        />
      ))}
    </>
  )
}

/** 递归树形权限选择器 */
export function PermissionTree({ selectedCodes, onSelectionChange, readonly = false }: PermissionTreeProps) {
  const t = useTranslations("AdminGroups")

  const [tree, setTree] = useState<PermissionTree | null>(null)
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  /* 加载权限树（仅一次） */
  useEffect(() => {
    api.get<{ permission_tree: PermissionTree }>("/admin/roles/meta")
      .then(({ data }) => {
        setTree(data.permission_tree)
        /* 默认展开第一层 */
        setExpandedSet(new Set(Object.keys(data.permission_tree).map(keyToSlug)))
      })
      .catch(() => setTree(null))
  }, [])

  const allLeaves = useMemo(() => (tree ? collectAllLeaves(tree) : []), [tree])
  const totalChecked = useMemo(() => allLeaves.filter((l) => selectedCodes.has(l)).length, [allLeaves, selectedCodes])

  /** 切换叶子集合的选中状态 */
  const handleToggle = useCallback(
    (leaves: string[]) => {
      if (readonly) return
      const allOn = leaves.length > 0 && leaves.every((l) => selectedCodes.has(l))
      const next = new Set(selectedCodes)
      for (const l of leaves) allOn ? next.delete(l) : next.add(l)
      onSelectionChange(next)
    },
    [readonly, selectedCodes, onSelectionChange],
  )

  /** 切换节点展开/折叠 */
  const handleToggleExpand = useCallback(
    (path: string) => {
      setExpandedSet((prev) => {
        const next = new Set(prev)
        next.has(path) ? next.delete(path) : next.add(path)
        return next
      })
    },
    [],
  )

  const searchQuery = search.trim().toLowerCase()

  if (!tree) return null

  return (
    <div className="rounded-lg border">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <Input
          className="h-7 text-xs flex-1"
          placeholder={t("searchPermissions")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {totalChecked}/{allLeaves.length}
        </span>
      </div>

      {/* 树形列表 */}
      <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
        {Object.entries(tree).map(([key, node]) => (
          <TreeNodeRow
            key={key}
            nodeKey={key}
            node={node}
            path={keyToSlug(key)}
            level={0}
            selectedCodes={selectedCodes}
            onToggle={handleToggle}
            readonly={readonly}
            expandedSet={expandedSet}
            onToggleExpand={handleToggleExpand}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </div>
  )
}
