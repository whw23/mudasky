"use client"

/**
 * 院校专业管理组件。
 * 三级选择：大分类 → 小分类 → 专业名称。
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
  name: string
  discipline_id: string
  category_id: string
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
      setPrograms((data ?? []).map((p: any) => {
        const disc = disciplines.find((d) => d.id === p.discipline_id)
        return {
          name: p.name,
          discipline_id: p.discipline_id,
          category_id: disc?.category_id ?? "",
        }
      }))
    } catch {
      setPrograms([])
    }
  }, [universityId, disciplines])

  useEffect(() => {
    Promise.all([
      api.get("/admin/web-settings/disciplines/categories/list")
        .then(({ data }) => setCategories(data ?? []))
        .catch(() => setCategories([])),
      api.get("/admin/web-settings/disciplines/list")
        .then(({ data }) => setDisciplines(data ?? []))
        .catch(() => setDisciplines([])),
    ]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!loading && disciplines.length >= 0) fetchPrograms()
  }, [loading, fetchPrograms, disciplines])

  function addProgram() {
    setPrograms([...programs, { name: "", discipline_id: "", category_id: "" }])
  }

  function removeProgram(index: number) {
    setPrograms(programs.filter((_, i) => i !== index))
  }

  function updateCategory(index: number, categoryId: string) {
    const updated = [...programs]
    updated[index] = { ...updated[index], category_id: categoryId, discipline_id: "" }
    setPrograms(updated)
  }

  function updateDiscipline(index: number, disciplineId: string) {
    const updated = [...programs]
    updated[index] = { ...updated[index], discipline_id: disciplineId }
    setPrograms(updated)
  }

  function updateName(index: number, name: string) {
    const updated = [...programs]
    updated[index] = { ...updated[index], name }
    setPrograms(updated)
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
          {programs.map((prog, idx) => {
            const filteredDiscs = disciplines.filter((d) => d.category_id === prog.category_id)
            return (
              <div key={idx} className="flex items-center gap-2">
                <Select value={prog.category_id} onValueChange={(v) => updateCategory(idx, v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="大分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={prog.discipline_id}
                  onValueChange={(v) => updateDiscipline(idx, v)}
                  disabled={!prog.category_id}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="小分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDiscs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={prog.name}
                  onChange={(e) => updateName(idx, e.target.value)}
                  placeholder="专业名称"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProgram(idx)}
                  className="size-8 shrink-0 p-0"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            )
          })}
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
