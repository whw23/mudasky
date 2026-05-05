"use client"

/**
 * 院校专业管理组件。
 * 在 UniversityEditDialog 中嵌入，支持添加/删除专业，关联学科小分类。
 */

import { useState, useEffect, useCallback } from "react"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Program {
  id?: string
  name: string
  discipline_id: string
}

interface DisciplineCategory {
  id: string
  name: string
}

interface Discipline {
  id: string
  name: string
  category_id: string
}

interface ProgramManagerProps {
  universityId: string
}

/** 院校专业管理 */
export function ProgramManager({ universityId }: ProgramManagerProps) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [categories, setCategories] = useState<DisciplineCategory[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchPrograms = useCallback(async () => {
    try {
      const { data } = await api.get(
        `/admin/web-settings/universities/list/detail/programs?university_id=${universityId}`,
      )
      setPrograms((data ?? []).map((p: any) => ({
        id: p.id, name: p.name, discipline_id: p.discipline_id,
      })))
    } catch {
      setPrograms([])
    }
  }, [universityId])

  useEffect(() => {
    Promise.all([
      fetchPrograms(),
      api.get("/admin/web-settings/disciplines/categories/list")
        .then(({ data }) => setCategories(data ?? []))
        .catch(() => setCategories([])),
      api.get("/admin/web-settings/disciplines/list")
        .then(({ data }) => setDisciplines(data ?? []))
        .catch(() => setDisciplines([])),
    ]).finally(() => setLoading(false))
  }, [fetchPrograms])

  function addProgram() {
    setPrograms([...programs, { name: "", discipline_id: "" }])
  }

  function removeProgram(index: number) {
    setPrograms(programs.filter((_, i) => i !== index))
  }

  function updateProgram(index: number, field: keyof Program, value: string) {
    const updated = [...programs]
    updated[index] = { ...updated[index], [field]: value }
    setPrograms(updated)
  }

  /** 获取学科的大分类名 */
  function getCategoryName(disciplineId: string): string {
    const disc = disciplines.find((d) => d.id === disciplineId)
    if (!disc) return ""
    const cat = categories.find((c) => c.id === disc.category_id)
    return cat?.name ?? ""
  }

  async function handleSave() {
    const valid = programs.filter((p) => p.name.trim() && p.discipline_id)
    if (valid.length !== programs.length) {
      toast.error("请填写完整所有专业的名称和学科")
      return
    }
    setSaving(true)
    try {
      await api.post("/admin/web-settings/universities/list/detail/programs", {
        university_id: universityId,
        programs: valid.map((p) => ({ name: p.name.trim(), discipline_id: p.discipline_id })),
      })
      toast.success("专业已保存")
      await fetchPrograms()
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-4 text-center text-sm text-muted-foreground">加载专业数据...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>开设专业</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addProgram}>
            <Plus className="mr-1 size-4" /> 添加
          </Button>
          {programs.length > 0 && (
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存专业"}
            </Button>
          )}
        </div>
      </div>

      {programs.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无专业，点击"添加"创建</p>
      ) : (
        <div className="space-y-2">
          {programs.map((prog, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={prog.name}
                onChange={(e) => updateProgram(idx, "name", e.target.value)}
                placeholder="专业名称"
                className="flex-1"
              />
              <Select
                value={prog.discipline_id}
                onValueChange={(v) => updateProgram(idx, "discipline_id", v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择学科" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => {
                    const cat = categories.find((c) => c.id === d.category_id)
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {cat ? `${cat.name} / ${d.name}` : d.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeProgram(idx)}
                className="size-8 p-0 shrink-0"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {programs.length > 0 && (
        <p className="text-xs text-muted-foreground">
          修改专业后请点击"保存专业"按钮，与院校基本信息分开保存。
        </p>
      )}
    </div>
  )
}
