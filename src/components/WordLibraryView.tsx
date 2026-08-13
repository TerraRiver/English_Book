import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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

// Row/header heights are pixel-exact matches for the `h-11`/`h-9` classes
// used below. Pagination is sized to whatever whole number of rows fits the
// measured container, so the table never needs to scroll internally.
const ROW_HEIGHT = 44
const HEADER_HEIGHT = 36

export function WordLibraryView() {
  const [query, setQuery] = useState("")
  const [words, setWords] = useState<WordWithCards[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<WordWithCards | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const tableWrapRef = useRef<HTMLDivElement>(null)

  const reload = useCallback((q: string) => {
    listWordsWithCards(q).then(setWords)
  }, [])

  useEffect(() => {
    reload(query)
  }, [query, reload])

  useEffect(() => {
    setPage(0)
  }, [query])

  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const compute = () => {
      const rows = Math.floor((el.clientHeight - HEADER_HEIGHT) / ROW_HEIGHT)
      setPageSize(Math.max(1, rows))
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const totalPages = words ? Math.max(1, Math.ceil(words.length / pageSize)) : 1

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages - 1))
  }, [totalPages])

  const pageWords = useMemo(
    () => (words ?? []).slice(page * pageSize, page * pageSize + pageSize),
    [words, page, pageSize]
  )

  const allPageSelected = pageWords.length > 0 && pageWords.every((w) => selected.has(w.id))

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageWords.forEach((w) => next.delete(w.id))
      } else {
        pageWords.forEach((w) => next.add(w.id))
      }
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

      <div
        ref={tableWrapRef}
        className="flex min-h-0 flex-1 flex-col overflow-x-auto overflow-y-hidden rounded-2xl border border-border"
      >
        {words.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {query ? "没有匹配的词条" : "词库还是空的，去「添加」查一个词，或用「导入词库」批量收录"}
          </p>
        ) : (
          <table className="w-full min-w-[554px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[180px]" />
              <col className="w-[190px]" />
              <col />
              <col className="w-[72px]" />
            </colgroup>
            <thead>
              <tr className="h-9 border-b border-border text-xs text-muted-foreground">
                <th className="overflow-hidden pl-4 text-left font-normal whitespace-nowrap">
                  <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectPage} />
                </th>
                <th className="overflow-hidden pr-3 text-left font-normal whitespace-nowrap">词条</th>
                <th className="overflow-hidden pr-3 text-left font-normal whitespace-nowrap">释义</th>
                <th className="overflow-hidden pr-3 text-left font-normal whitespace-nowrap">状态</th>
                <th className="overflow-hidden pr-4 text-right font-normal whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {pageWords.map((word) => {
                const detail: WordDetail = JSON.parse(word.detail_json)
                const firstSense = detail.senses[0]
                return (
                  <tr
                    key={word.id}
                    className="h-11 border-b border-border transition-colors last:border-0 hover:bg-foreground/[0.03]"
                  >
                    <td className="overflow-hidden pl-4 align-middle">
                      <Checkbox
                        checked={selected.has(word.id)}
                        onCheckedChange={() => toggleSelect(word.id)}
                      />
                    </td>
                    <td className="overflow-hidden pr-3 align-middle">
                      <div className="flex items-baseline gap-1.5">
                        <span className="min-w-0 truncate font-serif text-base">{word.term}</span>
                        {word.phonetic && (
                          <span className="shrink-0 text-xs text-muted-foreground">{word.phonetic}</span>
                        )}
                        <SpeakButton text={word.term} size="icon-xs" className="shrink-0" />
                      </div>
                    </td>
                    <td className="overflow-hidden pr-3 align-middle text-muted-foreground">
                      {firstSense ? (
                        <p className="truncate">
                          <span className="text-foreground/60">{firstSense.pos}</span>{" "}
                          {firstSense.translation}
                        </p>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="overflow-hidden pr-3 align-middle">
                      <div className="flex items-center gap-1 overflow-hidden">
                        {word.cards.map((c, i) => (
                          <Badge key={i} variant="outline" className="shrink-0 text-[11px] font-normal">
                            {DIRECTION_LABEL[c.direction]} · {STATE_LABEL[c.state]}
                          </Badge>
                        ))}
                        {word.note && (
                          <Badge variant="secondary" className="shrink-0 text-[11px] font-normal">
                            备注
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="overflow-hidden pr-4 align-middle">
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
