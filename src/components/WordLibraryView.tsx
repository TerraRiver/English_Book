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
import { cn } from "@/lib/utils"
import { DIRECTION_LABEL, STATE_LABEL } from "@/lib/fsrs"
import { deleteWords, listWordsWithCards, updateWord } from "@/lib/words"
import type { WordDetail, WordWithCards } from "@/lib/types"

// Fixed rather than measured: chosen to comfortably fit the app's minimum
// window height (560px) with room to spare, so the list never needs to
// scroll or clip a row — no ResizeObserver, no pixel guesswork at runtime.
const PAGE_SIZE = 6

// Priority order term > definition > status: instead of squeezing definition
// and status into illegible slivers as the window narrows, they're dropped
// outright at container-width breakpoints (via CSS container queries on the
// table area, not the viewport — the sidebar's fixed width means viewport
// breakpoints wouldn't track the actual available space). Term and actions
// stay in the grid at every size.
const GRID_COLS_NARROW = "grid-cols-[1.75rem_1fr_4.25rem]"
const GRID_COLS_MED = "@[380px]:grid-cols-[1.75rem_minmax(130px,1fr)_minmax(100px,1.4fr)_4.25rem]"
const GRID_COLS_WIDE =
  "@[600px]:grid-cols-[1.75rem_minmax(130px,1fr)_minmax(100px,1.4fr)_minmax(70px,0.7fr)_4.25rem]"
const ROW_GRID_COLS = cn("grid items-center gap-3", GRID_COLS_NARROW, GRID_COLS_MED, GRID_COLS_WIDE)

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

  const allPageSelected = pageWords.length > 0 && pageWords.every((w) => selected.has(w.id))
  const anySelected = selected.size > 0

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
        {anySelected ? (
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

      <div className="@container flex min-h-0 flex-1 flex-col overflow-hidden">
        {words.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {query ? "没有匹配的词条" : "词库还是空的，去「添加」查一个词，或用「导入词库」批量收录"}
          </p>
        ) : (
          <>
            <div
              role="row"
              className={cn(ROW_GRID_COLS, "shrink-0 border-b border-border pb-2 text-xs text-muted-foreground")}
            >
              <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectPage} />
              <span>词条</span>
              <span className="hidden @[380px]:inline">释义</span>
              <span className="hidden @[600px]:inline">状态</span>
              <span className="text-right">操作</span>
            </div>
            <div role="rowgroup" className="flex flex-col">
              {pageWords.map((word) => (
                <WordRow
                  key={word.id}
                  word={word}
                  selected={selected.has(word.id)}
                  showControls={anySelected}
                  onToggleSelect={() => toggleSelect(word.id)}
                  onEdit={() => setEditing(word)}
                  onDelete={() => handleDeleteOne(word.id)}
                />
              ))}
            </div>
          </>
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

function WordRow({
  word,
  selected,
  showControls,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  word: WordWithCards
  selected: boolean
  showControls: boolean
  onToggleSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const detail: WordDetail = JSON.parse(word.detail_json)
  const firstSense = detail.senses[0]
  const revealClass = cn(
    "transition-opacity",
    showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
  )

  return (
    <div
      role="row"
      className={cn(ROW_GRID_COLS, "group border-b border-border/70 py-2.5 last:border-0")}
    >
      <div className={revealClass}>
        <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
      </div>

      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="min-w-0 truncate font-serif text-base">{word.term}</span>
        {word.phonetic && (
          <span className="hidden shrink-0 text-xs text-muted-foreground @[600px]:inline">
            {word.phonetic}
          </span>
        )}
        <SpeakButton text={word.term} size="icon-xs" className="hidden shrink-0 @[600px]:inline-flex" />
      </div>

      <div className="hidden min-w-0 text-sm text-muted-foreground @[380px]:block">
        {firstSense ? (
          <p className="truncate">
            <span className="text-foreground/60">{firstSense.pos}</span> {firstSense.translation}
          </p>
        ) : (
          <span>—</span>
        )}
      </div>

      <div className="hidden min-w-0 items-center gap-1 overflow-hidden @[600px]:flex">
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

      <div className={cn("flex justify-end gap-0.5", revealClass)}>
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <PencilIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onDelete}>
          <TrashIcon />
        </Button>
      </div>
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
