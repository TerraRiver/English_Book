import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getLlmSettings } from "@/lib/settings"
import { getAllTerms } from "@/lib/words"
import { WORDLISTS, loadWordlistTerms, type WordlistMeta } from "@/lib/wordlists"
import { cancelImport, startImport, subscribeImportJob, type ImportState } from "@/lib/importJob"

const DEFAULT_COUNT = 200

export function ImportWordlistDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const [job, setJob] = useState<ImportState | null>(null)
  const [importedCounts, setImportedCounts] = useState<Record<string, number>>({})
  const [counts, setCounts] = useState<Record<string, string>>({})

  useEffect(() => subscribeImportJob(setJob), [])

  useEffect(() => {
    if (!open) return
    getAllTerms().then(async (existingList) => {
      const existing = new Set(existingList)
      const entries = await Promise.all(
        WORDLISTS.map(async (l) => {
          const terms = await loadWordlistTerms(l.id)
          return [l.id, terms.filter((t) => existing.has(t)).length] as const
        })
      )
      setImportedCounts(Object.fromEntries(entries))
    })
  }, [open])

  useEffect(() => {
    onImported()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.done, job?.status])

  const busy = job?.status === "running"

  async function handleStart(list: WordlistMeta, remaining: number, wantAll: boolean) {
    const settings = await getLlmSettings()
    if (!settings.apiKey) {
      alert("请先在设置中填写 API Key")
      return
    }
    const raw = counts[list.id]
    const count = wantAll
      ? remaining
      : Math.max(1, Math.min(remaining, Number(raw) || DEFAULT_COUNT))
    startImport(list, count, settings).catch((e) => alert(String(e)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导入内置词库</DialogTitle>
        </DialogHeader>

        {job && job.status !== "idle" && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{job.listLabel}</span>
              <span className="text-muted-foreground">
                {job.status === "running" && "导入中..."}
                {job.status === "done" && "已完成"}
                {job.status === "cancelled" && "已取消"}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{
                  width: `${job.total ? ((job.done + job.failed) / job.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {job.done + job.failed} / {job.total} · 成功 {job.done}
                {job.failed > 0 && ` · 失败 ${job.failed}`}
              </span>
              {busy && (
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={cancelImport}>
                  取消
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {WORDLISTS.map((list) => {
            const imported = importedCounts[list.id] ?? 0
            const remaining = list.count - imported
            return (
              <div
                key={list.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-serif text-base">{list.label}</span>
                  <span className="text-xs text-muted-foreground">
                    共 {list.count} 词{imported > 0 && ` · 已导入 ${imported}`}
                  </span>
                </div>
                {remaining <= 0 ? (
                  <span className="text-xs text-muted-foreground">已全部导入</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Input
                      className="h-8 w-16 text-sm"
                      placeholder={String(Math.min(remaining, DEFAULT_COUNT))}
                      value={counts[list.id] ?? ""}
                      onChange={(e) =>
                        setCounts((prev) => ({ ...prev, [list.id]: e.target.value }))
                      }
                      disabled={busy}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => handleStart(list, remaining, false)}
                    >
                      导入
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => handleStart(list, remaining, true)}
                    >
                      全部
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          数量留空默认导入 200 个（按词库原始顺序，已收录的词条会自动跳过）。释义由大模型重新生成，会消耗 API
          调用额度，导入任务在后台运行，可随时关闭此窗口或取消。
        </p>
      </DialogContent>
    </Dialog>
  )
}
