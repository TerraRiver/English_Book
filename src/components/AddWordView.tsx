import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { lookupWord } from "@/lib/llm"
import { getLlmSettings } from "@/lib/settings"
import { saveWord } from "@/lib/words"
import type { WordDetail } from "@/lib/types"

export function AddWordView() {
  const [term, setTerm] = useState("")
  const [detail, setDetail] = useState<WordDetail | null>(null)
  const [note, setNote] = useState("")
  const [bidirectional, setBidirectional] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleLookup() {
    const trimmed = term.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setDetail(null)
    setNote("")
    setBidirectional(false)
    setSaved(false)
    try {
      const settings = await getLlmSettings()
      const result = await lookupWord(trimmed, settings)
      setDetail(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!detail) return
    setSaving(true)
    try {
      await saveWord(term.trim(), detail, note.trim(), bidirectional)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function updateSense(i: number, patch: Partial<WordDetail["senses"][number]>) {
    setDetail((d) => d && { ...d, senses: d.senses.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) })
  }

  function updateVariant(i: number, patch: Partial<WordDetail["variants"][number]>) {
    setDetail((d) => d && { ...d, variants: d.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) })
  }

  function updateExample(i: number, patch: Partial<WordDetail["examples"][number]>) {
    setDetail((d) => d && { ...d, examples: d.examples.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          className="h-11 text-base"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="输入单词或短语，如 break the ice"
        />
        <Button size="lg" className="h-11" onClick={handleLookup} disabled={loading || !term.trim()}>
          {loading ? "查询中..." : "查词"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {detail && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="font-serif text-xl font-normal">{term.trim()}</CardTitle>
              <Button size="sm" onClick={handleSave} disabled={saving || saved}>
                {saved ? "已保存" : saving ? "保存中..." : "保存到词库"}
              </Button>
            </div>
            <div className="flex gap-3">
              <Input
                className="h-8 w-40 text-sm text-muted-foreground"
                value={detail.phonetic_uk ?? ""}
                onChange={(e) => setDetail({ ...detail, phonetic_uk: e.target.value })}
                placeholder="英式音标"
              />
              <Input
                className="h-8 w-40 text-sm text-muted-foreground"
                value={detail.phonetic_us ?? ""}
                onChange={(e) => setDetail({ ...detail, phonetic_us: e.target.value })}
                placeholder="美式音标"
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {detail.senses.map((sense, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <Input
                    className="h-8 w-16 shrink-0 text-center"
                    value={sense.pos}
                    onChange={(e) => updateSense(i, { pos: e.target.value })}
                  />
                  <Input
                    className="h-8"
                    value={sense.translation}
                    onChange={(e) => updateSense(i, { translation: e.target.value })}
                  />
                </div>
              ))}
            </div>

            {detail.variants.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  {detail.variants.map((v, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      <input
                        className="w-14 bg-transparent outline-none"
                        value={v.label}
                        onChange={(e) => updateVariant(i, { label: e.target.value })}
                      />
                      :
                      <input
                        className="w-20 bg-transparent outline-none"
                        value={v.form}
                        onChange={(e) => updateVariant(i, { form: e.target.value })}
                      />
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {detail.examples.length > 0 && (
              <>
                <Separator />
                <div className="flex flex-col gap-3">
                  {detail.examples.map((ex, i) => (
                    <div key={i} className="flex flex-col gap-1 text-sm">
                      <Textarea
                        className="min-h-8 resize-none"
                        value={ex.en}
                        onChange={(e) => updateExample(i, { en: e.target.value })}
                      />
                      <Textarea
                        className="min-h-8 resize-none text-muted-foreground"
                        value={ex.zh}
                        onChange={(e) => updateExample(i, { zh: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />
            <Textarea
              className="min-h-16 resize-none text-sm text-muted-foreground"
              value={detail.usage_notes ?? ""}
              onChange={(e) => setDetail({ ...detail, usage_notes: e.target.value })}
              placeholder="用法辨析（可编辑）"
            />

            <Separator />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note">个人备注</Label>
              <Textarea
                id="note"
                className="min-h-16 resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="助记方法、出处、上下文……（不会被 AI 修改）"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="bidirectional"
                checked={bidirectional}
                onCheckedChange={(v) => setBidirectional(v === true)}
              />
              <Label htmlFor="bidirectional" className="text-sm font-normal">
                同时练习中 → 英（反向回忆，难度更高）
              </Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
