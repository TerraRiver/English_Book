import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WordDetailFields } from "@/components/WordDetailFields"
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
          </CardHeader>
          <CardContent>
            <WordDetailFields
              detail={detail}
              onChange={setDetail}
              note={note}
              onNoteChange={setNote}
              bidirectional={bidirectional}
              onBidirectionalChange={setBidirectional}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
