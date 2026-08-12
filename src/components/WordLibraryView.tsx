import { useCallback, useEffect, useState } from "react"
import { DownloadIcon, PencilIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WordDetailFields } from "@/components/WordDetailFields"
import { ImportWordlistDialog } from "@/components/ImportWordlistDialog"
import { DIRECTION_LABEL, STATE_LABEL } from "@/lib/fsrs"
import { deleteWords, listWordsWithCards, updateWord } from "@/lib/words"
import type { WordDetail, WordWithCards } from "@/lib/types"

export function WordLibraryView() {
  const [query, setQuery] = useState("")
  const [words, setWords] = useState<WordWithCards[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<WordWithCards | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const reload = useCallback((q: string) => {
    listWordsWithCards(q).then(setWords)
  }, [])

  useEffect(() => {
    reload(query)
  }, [query, reload])

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`确定删除选中的 ${selected.size} 个词条吗？此操作不可撤销。`)) return
    await deleteWords([...selected])
    setSelected(new Set())
    reload(query)
  }

  async function handleDeleteOne(id: number) {
    if (!confirm("确定删除这个词条吗？此操作不可撤销。")) return
    await deleteWords([id])
    reload(query)
  }

  if (words === null) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Input
          className="h-11 flex-1 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索单词或释义..."
        />
        <Button variant="outline" className="h-11" onClick={() => setImportOpen(true)}>
          <DownloadIcon />
          导入词库
        </Button>
      </div>

      <div className="flex h-8 items-center justify-between">
        {selected.size > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">已选 {selected.size} 项</p>
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected}>
              删除所选
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">共 {words.length} 个词条</p>
        )}
      </div>

      {words.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {query ? "没有匹配的词条" : "词库还是空的，去「添加」查一个词吧"}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {words.map((word) => {
            const detail: WordDetail = JSON.parse(word.detail_json)
            return (
              <Card key={word.id} size="sm">
                <CardContent className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selected.has(word.id)}
                    onCheckedChange={() => toggleSelect(word.id)}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif text-lg">{word.term}</span>
                      {word.phonetic && (
                        <span className="text-xs text-muted-foreground">{word.phonetic}</span>
                      )}
                    </div>
                    {detail.senses[0] && (
                      <p className="truncate text-sm text-muted-foreground">
                        {detail.senses[0].pos} {detail.senses[0].translation}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {word.cards.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">
                          {DIRECTION_LABEL[c.direction]} · {STATE_LABEL[c.state]}
                        </Badge>
                      ))}
                      {word.note && (
                        <Badge variant="secondary" className="text-xs font-normal">
                          📝 有备注
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(word)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteOne(word.id)}>
                      <TrashIcon />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {editing && (
        <EditWordDialog
          word={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload(query)
          }}
        />
      )}

      <ImportWordlistDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => reload(query)}
      />
    </div>
  )
}

function EditWordDialog({
  word,
  onClose,
  onSaved,
}: {
  word: WordWithCards
  onClose: () => void
  onSaved: () => void
}) {
  const [term, setTerm] = useState(word.term)
  const [detail, setDetail] = useState<WordDetail>(JSON.parse(word.detail_json))
  const [note, setNote] = useState(word.note ?? "")
  const [bidirectional, setBidirectional] = useState(word.bidirectional === 1)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateWord(word.id, term.trim(), detail, note.trim(), bidirectional)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Input
              className="h-9 font-serif text-lg"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </DialogTitle>
        </DialogHeader>
        <WordDetailFields
          detail={detail}
          onChange={setDetail}
          note={note}
          onNoteChange={setNote}
          bidirectional={bidirectional}
          onBidirectionalChange={setBidirectional}
        />
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !term.trim()}>
            {saving ? "保存中..." : "保存修改"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
