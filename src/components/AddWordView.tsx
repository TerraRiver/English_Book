import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WordDetailFields } from "@/components/WordDetailFields"
import { SpeakButton } from "@/components/SpeakButton"
import { lookupWord } from "@/lib/llm"
import { getLlmSettings } from "@/lib/settings"
import { getWordByTerm, listRecentWords, saveWord } from "@/lib/words"
import type { WordDetail, WordRow } from "@/lib/types"

function RecentWordRow({ word }: { word: WordRow }) {
  const detail: WordDetail = JSON.parse(word.detail_json)
  const firstSense = detail.senses[0]
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0">
      <span className="shrink-0 font-serif text-sm">{word.term}</span>
      {word.phonetic && <span className="shrink-0 text-xs text-muted-foreground">{word.phonetic}</span>}
      <SpeakButton text={word.term} size="icon-xs" className="shrink-0" />
      {firstSense && (
        <p className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">
          {firstSense.pos} {firstSense.translation}
        </p>
      )}
    </div>
  )
}

export function AddWordView() {
  const [term, setTerm] = useState("")
  const [cardTerm, setCardTerm] = useState("")
  const [detail, setDetail] = useState<WordDetail | null>(null)
  const [note, setNote] = useState("")
  const [bidirectional, setBidirectional] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [existing, setExisting] = useState(false)
  const [recent, setRecent] = useState<WordRow[] | null>(null)

  const reloadRecent = useCallback(() => {
    listRecentWords().then(setRecent)
  }, [])

  useEffect(() => {
    reloadRecent()
  }, [reloadRecent])

  async function handleLookup() {
    const trimmed = term.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setDetail(null)
    setNote("")
    setBidirectional(false)
    setSaved(false)
    setExisting(false)
    try {
      const found = await getWordByTerm(trimmed)
      if (found) {
        setCardTerm(found.term)
        setDetail(JSON.parse(found.detail_json))
        setNote(found.note ?? "")
        setBidirectional(found.bidirectional === 1)
        setExisting(true)
        return
      }
      const settings = await getLlmSettings()
      const result = await lookupWord(trimmed, settings)
      setCardTerm(trimmed)
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
      await saveWord(cardTerm, detail, note.trim(), bidirectional)
      setSaved(true)
      reloadRecent()
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
          onChange={(e) => setTerm(e.target.value.toLowerCase())}
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
              <div className="flex items-center gap-1">
                <CardTitle className="font-serif text-xl font-normal">{cardTerm}</CardTitle>
                <SpeakButton text={cardTerm} />
                {existing && !saved && (
                  <span className="text-xs text-muted-foreground">词库中已有，直接加载</span>
                )}
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving || saved}>
                {saved ? "已保存" : saving ? "保存中..." : existing ? "更新词库" : "保存到词库"}
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

      {!detail &&
        !loading &&
        (recent === null ? null : recent.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs font-medium text-muted-foreground">最近添加</p>
            <div className="overflow-hidden rounded-2xl border border-border">
              {recent.map((word) => (
                <RecentWordRow key={word.id} word={word} />
              ))}
            </div>
          </div>
        ) : (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            查一个词开始收录吧，比如「break the ice」
          </p>
        ))}
    </div>
  )
}
