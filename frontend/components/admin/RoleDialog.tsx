"use client"

/**
 * 角色创建/编辑对话框组件。
 * 支持表单填写和基于 code 层级的树形权限勾选。
 * 树形复选框支持级联：勾选叶子自动选中祖先，全选子节点保存为通配符。
 */

import { useEffect, useState, useCallback, useMemo } from "react"
import { useTranslations, useMessages } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import api from "@/lib/api"
import type { Permission, Role } from "@/types"

interface RoleDialogProps {
  role: Role | null
  open: boolean
  onClose: () => void
  onSave: () => void
}

/** 权限树节点 */
interface TreeNode {
  /** 节点键，如 "admin"、"admin.user" */
  key: string
  /** 显示标签 */
  label: string
  /** 对应的权限 ID（仅叶子节点） */
  permissionId?: string
  /** 子节点 */
  children: TreeNode[]
}

/**
 * 从权限列表构建树形结构。
 * 每个权限 code 按 `.` 分割，构建层级树。
 */
function buildTree(
  permissions: Permission[],
  tp: (key: string) => string,
): TreeNode[] {
  const root: TreeNode[] = []
  /** 按 key 缓存已创建的中间节点 */
  const nodeMap = new Map<string, TreeNode>()

  /** 获取或创建指定路径上的节点 */
  function ensureNode(parts: string[], depth: number): TreeNode {
    const key = parts.slice(0, depth + 1).join(".")
    let node = nodeMap.get(key)
    if (!node) {
      node = { key, label: tp(key), children: [] }
      nodeMap.set(key, node)
      if (depth === 0) {
        root.push(node)
      } else {
        const parent = ensureNode(parts, depth - 1)
        parent.children.push(node)
      }
    }
    return node
  }

  for (const perm of permissions) {
    /* 跳过通配符权限（如 admin.user.*），只保留具体叶子权限 */
    if (perm.code.endsWith(".*") || perm.code === "*") continue
    const parts = perm.code.split(".")
    const leaf = ensureNode(parts, parts.length - 1)
    leaf.permissionId = perm.id
  }

  return root
}

/** 收集节点下所有叶子权限 ID */
function collectLeafIds(node: TreeNode): string[] {
  if (node.children.length === 0 && node.permissionId) {
    return [node.permissionId]
  }
  return node.children.flatMap(collectLeafIds)
}

/**
 * 将选中的权限 ID 集合转换为保存用的权限码列表。
 * 如果某个分组下所有叶子都选中，保存为通配符 `xxx.*`。
 */
function toPermissionCodes(
  tree: TreeNode[],
  selectedIds: Set<string>,
  permissions: Permission[],
): string[] {
  const result: string[] = []
  const idToCode = new Map(permissions.map((p) => [p.id, p.code]))

  function walk(node: TreeNode): boolean {
    if (node.children.length === 0) {
      /* 叶子节点 */
      if (node.permissionId && selectedIds.has(node.permissionId)) {
        return true
      }
      return false
    }
    /* 分支节点：检查所有子节点 */
    const childResults = node.children.map(walk)
    const allChecked = childResults.every(Boolean)
    const someChecked = childResults.some(Boolean)

    if (allChecked) {
      /* 所有子叶子选中 → 用通配符 */
      result.push(`${node.key}.*`)
      return true
    }
    /* 部分选中 → 各子节点已把具体码推入 result */
    return someChecked
  }

  for (const root of tree) {
    if (root.children.length === 0 && root.permissionId) {
      /* 顶层叶子 */
      if (selectedIds.has(root.permissionId)) {
        result.push(idToCode.get(root.permissionId) || root.key)
      }
    } else {
      const childResults = root.children.map(walk)
      const allChecked = childResults.every(Boolean)
      if (allChecked && root.children.length > 0) {
        /* 移除已推入的子项，替换为根通配符 */
        const toRemove = new Set<string>()
        for (const child of root.children) {
          toRemove.add(`${child.key}.*`)
          for (const leaf of collectLeafIds(child)) {
            const code = idToCode.get(leaf)
            if (code) toRemove.add(code)
          }
        }
        const filtered = result.filter((c) => !toRemove.has(c))
        filtered.push(`${root.key}.*`)
        result.length = 0
        result.push(...filtered)
      }
    }
  }

  return result
}

/**
 * 从嵌套 messages 对象中按 dot-separated key 取值。
 * 叶子节点返回字符串，分支节点返回 _label。
 */
function resolvePermLabel(
  messages: Record<string, unknown>,
  key: string,
): string {
  const parts = key.split(".")
  let current: unknown = messages
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return key
    }
  }
  if (typeof current === "string") return current
  if (current && typeof current === "object" && "_label" in current) {
    return (current as Record<string, string>)._label
  }
  return key
}

/** 角色创建/编辑对话框 */
export function RoleDialog({
  role,
  open,
  onClose,
  onSave,
}: RoleDialogProps) {
  const t = useTranslations("AdminGroups")
  const messages = useMessages()
  const permMessages = (messages as Record<string, unknown>).Permissions as Record<string, unknown> ?? {}
  const isEdit = !!role

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  /** 获取所有权限列表 */
  const fetchPermissions = useCallback(async () => {
    try {
      const { data } = await api.get<Permission[]>("/permissions")
      setPermissions(data)
    } catch {
      /* 忽略 */
    }
  }, [])

  /** 权限翻译辅助函数 */
  const translatePerm = useCallback(
    (key: string): string => resolvePermLabel(permMessages, key),
    [permMessages],
  )

  /** 构建权限树 */
  const tree = useMemo(
    () => buildTree(permissions, translatePerm),
    [permissions, translatePerm],
  )

  /**
   * 将角色的通配符权限展开为叶子权限 ID 集合。
   * 如 `admin.*` → 所有以 `admin.` 开头的叶子权限 ID。
   */
  const expandWildcardPermissions = useCallback(
    (rolePerms: Permission[], allPerms: Permission[]): Set<string> => {
      const ids = new Set<string>()
      /* 过滤出叶子权限（非通配符） */
      const leafPerms = allPerms.filter(
        (p) => !p.code.endsWith(".*") && p.code !== "*",
      )

      for (const rp of rolePerms) {
        if (rp.code === "*") {
          /* 全部权限 */
          for (const lp of leafPerms) ids.add(lp.id)
        } else if (rp.code.endsWith(".*")) {
          /* 通配符：匹配前缀 */
          const prefix = rp.code.slice(0, -2) + "."
          for (const lp of leafPerms) {
            if (lp.code.startsWith(prefix)) ids.add(lp.id)
          }
        } else {
          /* 具体权限 */
          const match = leafPerms.find((lp) => lp.code === rp.code)
          if (match) ids.add(match.id)
        }
      }
      return ids
    },
    [],
  )

  /** 打开对话框时初始化表单 */
  useEffect(() => {
    if (!open) return
    fetchPermissions()
    if (role) {
      setName(role.name)
      setDescription(role.description)
    } else {
      setName("")
      setDescription("")
      setSelectedIds(new Set())
    }
  }, [open, role, fetchPermissions])

  /** 权限列表加载后，展开角色的通配符权限 */
  useEffect(() => {
    if (!open || !role || permissions.length === 0) return
    setSelectedIds(expandWildcardPermissions(role.permissions, permissions))
  }, [open, role, permissions, expandWildcardPermissions])

  /** 切换单个叶子权限 */
  const togglePermission = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  /** 切换某分支下所有叶子权限 */
  const toggleBranch = (node: TreeNode) => {
    const leafIds = collectLeafIds(node)
    const allChecked = leafIds.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of leafIds) {
        if (allChecked) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }

  /** 保存角色 */
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameRequired"))
      return
    }
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        permission_ids: [...selectedIds],
      }
      if (isEdit) {
        await api.patch(`/roles/${role.id}`, payload)
      } else {
        await api.post("/roles", payload)
      }
      toast.success(t(isEdit ? "updateSuccess" : "createSuccess"))
      onSave()
    } catch {
      toast.error(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(isEdit ? "editTitle" : "createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t(isEdit ? "editDesc" : "createDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 名称 */}
          <div className="space-y-1">
            <Label>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          {/* 描述 */}
          <div className="space-y-1">
            <Label>{t("description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          {/* 权限树 */}
          <div className="space-y-2">
            <Label>{t("permissions")}</Label>
            <PermissionTree
              tree={tree}
              selectedIds={selectedIds}
              onToggleLeaf={togglePermission}
              onToggleBranch={toggleBranch}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 树形权限选择器 */
function PermissionTree({
  tree,
  selectedIds,
  onToggleLeaf,
  onToggleBranch,
}: {
  tree: TreeNode[]
  selectedIds: Set<string>
  onToggleLeaf: (id: string) => void
  onToggleBranch: (node: TreeNode) => void
}) {
  return (
    <div className="space-y-3">
      {tree.map((node) => (
        <BranchNode
          key={node.key}
          node={node}
          selectedIds={selectedIds}
          onToggleLeaf={onToggleLeaf}
          onToggleBranch={onToggleBranch}
          depth={0}
        />
      ))}
    </div>
  )
}

/** 分支/叶子节点渲染 */
function BranchNode({
  node,
  selectedIds,
  onToggleLeaf,
  onToggleBranch,
  depth,
}: {
  node: TreeNode
  selectedIds: Set<string>
  onToggleLeaf: (id: string) => void
  onToggleBranch: (node: TreeNode) => void
  depth: number
}) {
  const isLeaf = node.children.length === 0 && !!node.permissionId

  if (isLeaf) {
    return (
      <label
        className="flex items-center gap-2 text-sm"
        style={{ marginLeft: depth * 24 }}
      >
        <Checkbox
          checked={selectedIds.has(node.permissionId!)}
          onCheckedChange={() => onToggleLeaf(node.permissionId!)}
        />
        <span>{node.label}</span>
      </label>
    )
  }

  /* 分支节点 */
  const leafIds = collectLeafIds(node)
  const checkedCount = leafIds.filter((id) => selectedIds.has(id)).length
  const allChecked = leafIds.length > 0 && checkedCount === leafIds.length
  const someChecked = checkedCount > 0 && !allChecked

  return (
    <div>
      <label
        className="flex items-center gap-2 font-medium"
        style={{ marginLeft: depth * 24 }}
      >
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked}
          onCheckedChange={() => onToggleBranch(node)}
        />
        {node.label}
      </label>
      <div className="mt-1 space-y-1">
        {node.children.map((child) => (
          <BranchNode
            key={child.key}
            node={child}
            selectedIds={selectedIds}
            onToggleLeaf={onToggleLeaf}
            onToggleBranch={onToggleBranch}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  )
}
