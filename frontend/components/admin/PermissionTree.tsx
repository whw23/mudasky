"use client"

/**
 * 三栏权限选择器组件。
 * 第一栏：面板（admin/portal）；第二栏：页面；第三栏：API 路由。
 * 支持级联勾选、搜索过滤、只读模式。
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PANEL_CONFIG, type PanelConfig, type PageConfig } from "@/lib/permission-config"
import { fetchOpenApiSpec, parseRoutes, filterRoutesByPrefix, type ApiRoute } from "@/lib/openapi"

/** 将 API 路由转为权限码（去掉开头的 /） */
function routeToCode(route: ApiRoute): string {
  return route.path.startsWith("/") ? route.path.slice(1) : route.path
}

/** HTTP 方法徽章样式 */
function methodClass(method: string): string {
  return method === "GET" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
}

export interface PermissionTreeProps {
  /** 已选中的权限码集合（如 "admin/users/list"） */
  selectedCodes: Set<string>
  /** 选中变更回调 */
  onSelectionChange: (codes: Set<string>) => void
  /** 只读模式 */
  readonly?: boolean
}

/** 列头标签 */
function ColHeader({ label, tag, extra }: { label: string; tag: string; extra?: React.ReactNode }) {
  return (
    <div className="px-2 py-1.5 border-b flex items-center gap-1.5 shrink-0">
      <span className="text-xs font-medium text-muted-foreground flex-1">{label}</span>
      <span className="text-[10px] bg-muted px-1 rounded">{tag}</span>
      {extra}
    </div>
  )
}

/** 行容器，含 active 指示器 */
function SelRow({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-2 cursor-pointer text-sm transition-colors ${
        active
          ? "border-l-2 border-l-foreground bg-muted/50"
          : "border-l-2 border-l-transparent hover:bg-muted/40"
      }`}
    >
      {children}
    </div>
  )
}

/** 三栏权限选择器 */
export function PermissionTree({ selectedCodes, onSelectionChange, readonly = false }: PermissionTreeProps) {
  const t = useTranslations("AdminGroups")
  const tAdmin = useTranslations("Admin")
  const tUser = useTranslations("User")

  const [allRoutes, setAllRoutes] = useState<ApiRoute[]>([])
  const [activePanel, setActivePanel] = useState("admin")
  const [activePage, setActivePage] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetchOpenApiSpec().then((s) => setAllRoutes(parseRoutes(s))).catch(() => setAllRoutes([]))
  }, [])

  useEffect(() => {
    const panel = PANEL_CONFIG.find((p) => p.key === activePanel)
    if (panel?.pages.length) setActivePage(panel.pages[0].key)
  }, [activePanel])

  const currentPanel = useMemo(() => PANEL_CONFIG.find((p) => p.key === activePanel), [activePanel])
  const currentPage = useMemo(() => currentPanel?.pages.find((p) => p.key === activePage), [currentPanel, activePage])

  /** 当前页面所有路由 */
  const currentRoutes = useMemo(
    () => (currentPage ? filterRoutesByPrefix(allRoutes, currentPage.apiPrefix) : []),
    [allRoutes, currentPage],
  )

  /** 搜索过滤后路由 */
  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return currentRoutes
    const q = search.toLowerCase()
    return currentRoutes.filter((r) => r.summary.toLowerCase().includes(q) || r.path.toLowerCase().includes(q))
  }, [currentRoutes, search])

  /** 计算路由集合中已选数 */
  const countChecked = useCallback(
    (routes: ApiRoute[]) => routes.filter((r) => selectedCodes.has(routeToCode(r))).length,
    [selectedCodes],
  )

  /** 切换指定路由集合的选中状态 */
  const toggleRoutes = useCallback(
    (routes: ApiRoute[]) => {
      if (readonly) return
      const codes = routes.map(routeToCode)
      const allOn = codes.length > 0 && codes.every((c) => selectedCodes.has(c))
      const next = new Set(selectedCodes)
      for (const c of codes) allOn ? next.delete(c) : next.add(c)
      onSelectionChange(next)
    },
    [readonly, selectedCodes, onSelectionChange],
  )

  /** 页面标签翻译 */
  const pageLabel = useCallback(
    (panelKey: string, pageKey: string): string => {
      try { return panelKey === "admin" ? tAdmin(pageKey) : tUser(pageKey) } catch { return pageKey }
    },
    [tAdmin, tUser],
  )

  const totalChecked = countChecked(allRoutes)

  return (
    <div className="rounded-lg border">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 border-b px-3 py-2">
        <Input className="h-7 text-xs flex-1" placeholder={t("searchPermissions")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-xs text-muted-foreground whitespace-nowrap">{totalChecked}/{allRoutes.length}</span>
      </div>

      {/* 三栏 */}
      <div className="flex" style={{ height: 280 }}>
        {/* 第一栏：面板 */}
        <div className="w-[22%] border-r overflow-y-auto bg-muted/30 flex flex-col">
          <ColHeader label={t("panel")} tag={t("auto")} />
          {PANEL_CONFIG.map((panel) => {
            const panelRoutes = panel.pages.flatMap((pg) => filterRoutesByPrefix(allRoutes, pg.apiPrefix))
            const checked = countChecked(panelRoutes)
            const total = panelRoutes.length
            const allOn = total > 0 && checked === total
            return (
              <SelRow key={panel.key} active={panel.key === activePanel} onClick={() => setActivePanel(panel.key)}>
                {!readonly && (
                  <Checkbox checked={allOn} indeterminate={checked > 0 && !allOn}
                    onCheckedChange={(e) => { (e as React.MouseEvent)?.stopPropagation?.(); toggleRoutes(panelRoutes) }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className="flex-1 truncate">{panel.key === "admin" ? t("admin") : t("portal")}</span>
                {total > 0 && <span className="text-[10px] text-muted-foreground">{checked}/{total}</span>}
              </SelRow>
            )
          })}
        </div>

        {/* 第二栏：页面 */}
        <div className="w-[30%] border-r overflow-y-auto flex flex-col">
          <ColHeader label={t("pages")} tag={t("auto")} />
          {currentPanel?.pages.map((page) => {
            const pgRoutes = filterRoutesByPrefix(allRoutes, page.apiPrefix)
            const checked = countChecked(pgRoutes)
            const total = pgRoutes.length
            const allOn = total > 0 && checked === total
            return (
              <SelRow key={page.key} active={page.key === activePage} onClick={() => setActivePage(page.key)}>
                {!readonly && (
                  <Checkbox checked={allOn} indeterminate={checked > 0 && !allOn}
                    onCheckedChange={(e) => { (e as React.MouseEvent)?.stopPropagation?.(); toggleRoutes(pgRoutes) }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className="flex-1 truncate">{pageLabel(activePanel, page.key)}</span>
                {total > 0 && <span className="text-[10px] bg-muted rounded px-1">{checked}</span>}
              </SelRow>
            )
          })}
        </div>

        {/* 第三栏：API 路由 */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <ColHeader label="API" tag="OpenAPI" extra={
            !readonly && (
              <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1.5 py-0"
                onClick={() => { const codes = currentRoutes.map(routeToCode); const next = new Set(selectedCodes); codes.forEach((c) => next.add(c)); onSelectionChange(next) }}
              >{t("selectAll")}</Button>
            )
          } />
          {search && filteredRoutes.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">{t("noSearchResults")}</div>
          )}
          {!search && currentRoutes.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">{t("noApis")}</div>
          )}
          {filteredRoutes.map((route) => {
            const code = routeToCode(route)
            return (
              <div key={`${route.method}:${route.path}`} onClick={() => !readonly && toggleRoutes([route])}
                className={`flex items-center gap-2 px-2 py-1.5 text-xs transition-colors hover:bg-muted/40 ${readonly ? "" : "cursor-pointer"}`}
              >
                {!readonly && (
                  <Checkbox checked={selectedCodes.has(code)}
                    onCheckedChange={() => toggleRoutes([route])} onClick={(e) => e.stopPropagation()}
                  />
                )}
                <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${methodClass(route.method)}`}>{route.method}</span>
                <span className="flex-1 font-mono truncate text-[11px]">{route.path}</span>
                <span className="text-muted-foreground truncate max-w-[100px]">{route.summary}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
