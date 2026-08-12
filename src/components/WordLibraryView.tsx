import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PencilIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WordDetailFields } from "@/components/WordDetailFields"
import { ImportWordlistDialog } from "@/components/ImportWordlistDialog"
import { SpeakButton } from "@/components/SpeakButton"
import { DIRECTION_LABEL, STATE_LABEL } from "@/lib/fsrs"
import { deleteWords, listWordsWithCards, updateWord } from "@/lib/words"
import type { WordDetail, WordWithCards } from "@/lib/types"

const PAGE_SIZE = 10

export function WordLibraryView() {
  const [query, setQuery] = useState("")
  const [words, setWords] = useState<WordWithCards[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<WordWithCards | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [page, setPage] = useState(0)

  const reload = useCallback((q: string) => {
    listWordsWithCards(q).then(setWords)
  }, [])

  useEffect(() => {
    reload(query)
  }, [query, reload])

  useEffect(() => {
    setPage(0)
  }, [query])

  const totalPages = words ? Math.max(1, Math.ceil(words.length / PAGE_SIZE)) : 1

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  const pageWords = useMemo(
    () => (words ?? []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [words, page]
  )

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
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <Input
          className="h-10 flex-1 text-base"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索单词或释义..."
        />
        <Button variant="outline" className="h-10" onClick={() => setImportOpen(true)}>
          <DownloadIcon />
          导入词库
        </Button>
      </div>

      <div className="flex h-6 shrink-0 items-center justify-between text-sm text-muted-foreground">
        {selected.size > 0 ? (
          <>
            <span>已选 {selected.size} 项</span>
            <Button
              size="sm"
              variant="destructive"
              className="h-6 px-2 text-xs"
              onClick={handleDeleteSelected}
            >
              删除所选
            </Button>
          </>
        ) : (
          <span>共 {words.length} 个词条</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border">
        {words.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {query ? "没有匹配的词条" : "词库还是空的，去「添加」查一个词，或用「导入词库」批量收录"}
          </p>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {pageWords.map((word) => {
                  const detail: WordDetail = JSON.parse(word.detail_json)
                  return (
                    <tr
                      key={word.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                    >
                      <td className="w-10 py-2.5 pl-4 align-top">
                        <Checkbox
                          checked={selected.has(word.id)}
                          onCheckedChange={() => toggleSelect(word.id)}
                        />
                      </td>
                      <td className="min-w-0 py-2.5 pr-3 align-top">
                        <div className="flex items-baseline gap-1">
                          <span className="font-serif text-base">{word.term}</span>
                          {word.phonetic && (
                            <span className="text-xs text-muted-foreground">{word.phonetic}</span>
                          )}
                          <SpeakButton text={word.term} size="icon-xs" />
                        </div>
                        {detail.senses[0] && (
                          <p className="truncate text-xs text-muted-foreground">
                            {detail.senses[0].pos} {detail.senses[0].translation}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {word.cards.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[11px] font-normal">
                              {DIRECTION_LABEL[c.direction]} · {STATE_LABEL[c.state]}
                            </Badge>
                          ))}
                          {word.note && (
                            <Badge variant="secondary" className="text-[11px] font-normal">
                              📝 备注
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="w-16 py-2.5 pr-3 align-top">
                        <div className="flex justify-end gap-0.5">
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(word)}>
                            <PencilIcon />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteOne(word.id)}>
                            <TrashIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-center gap-3">
        {totalPages > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon />
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRightIcon />
            </Button>
          </>
        )}
      </div>

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
            <div className="flex items-center gap-1">
              <Input
                className="h-9 flex-1 font-serif text-lg"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
              <SpeakButton text={term} />
            </div>
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
