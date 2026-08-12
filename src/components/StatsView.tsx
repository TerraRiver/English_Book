import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listAllCards } from "@/lib/words"
import { DIRECTION_LABEL, STATE_CHART_VAR, STATE_LABEL, State } from "@/lib/fsrs"
import type { CardWithWord } from "@/lib/types"

const PLOTTED_STATES = [State.Learning, State.Relearning, State.Review] as const

const WIDTH = 560
const HEIGHT = 340
const MARGIN = { top: 16, right: 20, bottom: 40, left: 44 }
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom

const X_MIN = 1
const X_MAX = 10
const Y_TICKS = [
  { days: 1 / 144, label: "10分钟" },
  { days: 1, label: "1天" },
  { days: 7, label: "1周" },
  { days: 30, label: "1月" },
  { days: 90, label: "3月" },
  { days: 365, label: "1年" },
]

function formatStability(days: number): string {
  if (days < 1) return `${Math.round(days * 24 * 60)} 分钟`
  if (days < 30) return `${days.toFixed(1)} 天`
  if (days < 365) return `${(days / 30).toFixed(1)} 个月`
  return `${(days / 365).toFixed(1)} 年`
}

function formatDue(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diffDays <= 0) return "已到期"
  if (diffDays === 1) return "明天"
  if (diffDays < 30) return `${diffDays} 天后`
  return d.toLocaleDateString("zh-CN")
}

export function StatsView() {
  const [cards, setCards] = useState<CardWithWord[] | null>(null)
  const [showTable, setShowTable] = useState(false)
  const [hidden, setHidden] = useState<Set<number>>(new Set())
  const [hovered, setHovered] = useState<CardWithWord | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    listAllCards().then(setCards)
  }, [])

  const { plotted, newCount, yMin, yMax } = useMemo(() => {
    if (!cards) return { plotted: [] as CardWithWord[], newCount: 0, yMin: 1, yMax: 1 }
    const plotted = cards.filter((c) => (PLOTTED_STATES as readonly number[]).includes(c.card.state))
    const newCount = cards.length - plotted.length
    const stabilities = plotted.map((c) => Math.max(c.card.stability, 1 / 1440))
    const yMin = stabilities.length ? Math.min(...stabilities, 1 / 144) : 1 / 144
    const yMax = stabilities.length ? Math.max(...stabilities, 1) : 1
    return { plotted, newCount, yMin, yMax }
  }, [cards])

  function xScale(difficulty: number) {
    const d = Math.min(Math.max(difficulty, X_MIN), X_MAX)
    return MARGIN.left + ((d - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
  }

  function yScale(days: number) {
    const d = Math.max(days, yMin)
    const logMin = Math.log10(yMin)
    const logMax = Math.log10(yMax)
    const t = logMax === logMin ? 0 : (Math.log10(d) - logMin) / (logMax - logMin)
    return MARGIN.top + PLOT_H - t * PLOT_H
  }

  function toggleState(s: number) {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
  }

  if (cards === null) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  const visible = plotted.filter((c) => !hidden.has(c.card.state))
  const visibleYTicks = Y_TICKS.filter((t) => t.days >= yMin * 0.9 && t.days <= yMax * 1.1)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-xl font-normal">记忆分布</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
            {showTable ? "图表视图" : "表格视图"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          共 {cards.length} 张卡片
          {newCount > 0 && ` · ${newCount} 张新卡片尚未开始复习`}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {plotted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            还没有复习记录，先去「复习」上几张卡片吧。
          </p>
        ) : showTable ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1.5 pr-2 font-normal">词</th>
                  <th className="py-1.5 pr-2 font-normal">方向</th>
                  <th className="py-1.5 pr-2 font-normal">状态</th>
                  <th className="py-1.5 pr-2 font-normal">难度</th>
                  <th className="py-1.5 pr-2 font-normal">稳定度</th>
                  <th className="py-1.5 font-normal">下次复习</th>
                </tr>
              </thead>
              <tbody>
                {plotted.map((c) => (
                  <tr key={c.card.id} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-2 font-serif">{c.term}</td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {DIRECTION_LABEL[c.card.direction]}
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">{STATE_LABEL[c.card.state]}</td>
                    <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">
                      {c.card.difficulty.toFixed(1)}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums text-muted-foreground">
                      {formatStability(c.card.stability)}
                    </td>
                    <td className="py-1.5 tabular-nums text-muted-foreground">
                      {formatDue(c.card.due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4">
              {PLOTTED_STATES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleState(s)}
                  className="flex items-center gap-1.5 text-sm"
                  style={{ opacity: hidden.has(s) ? 0.4 : 1 }}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: STATE_CHART_VAR[s] }}
                  />
                  <span className="text-foreground">{STATE_LABEL[s]}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full"
                onMouseLeave={() => setHovered(null)}
              >
                {visibleYTicks.map((t) => (
                  <g key={t.label}>
                    <line
                      x1={MARGIN.left}
                      x2={WIDTH - MARGIN.right}
                      y1={yScale(t.days)}
                      y2={yScale(t.days)}
                      stroke="var(--border)"
                      strokeWidth={1}
                    />
                    <text
                      x={MARGIN.left - 8}
                      y={yScale(t.days)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-muted-foreground"
                      fontSize={11}
                    >
                      {t.label}
                    </text>
                  </g>
                ))}

                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                  <text
                    key={d}
                    x={xScale(d)}
                    y={HEIGHT - MARGIN.bottom + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize={11}
                  >
                    {d}
                  </text>
                ))}
                <text
                  x={MARGIN.left + PLOT_W / 2}
                  y={HEIGHT - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={11}
                >
                  难度
                </text>

                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left}
                  y1={MARGIN.top}
                  y2={HEIGHT - MARGIN.bottom}
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <line
                  x1={MARGIN.left}
                  x2={WIDTH - MARGIN.right}
                  y1={HEIGHT - MARGIN.bottom}
                  y2={HEIGHT - MARGIN.bottom}
                  stroke="var(--border)"
                  strokeWidth={1}
                />

                {visible.map((c) => (
                  <g
                    key={c.card.id}
                    transform={`translate(${xScale(c.card.difficulty)}, ${yScale(c.card.stability)})`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
                      setTooltipPos({
                        x: (xScale(c.card.difficulty) / WIDTH) * rect.width,
                        y: (yScale(c.card.stability) / HEIGHT) * rect.height,
                      })
                      setHovered(c)
                    }}
                    className="cursor-pointer"
                  >
                    <circle r={12} fill="transparent" />
                    <circle
                      r={5}
                      fill={STATE_CHART_VAR[c.card.state]}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </svg>

              {hovered && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10"
                  style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                  <p className="font-serif text-sm">{hovered.term}</p>
                  <p className="text-muted-foreground">
                    {DIRECTION_LABEL[hovered.card.direction]} · {STATE_LABEL[hovered.card.state]}
                  </p>
                  <p className="mt-1">
                    难度 <span className="font-medium">{hovered.card.difficulty.toFixed(1)}</span>
                    {"  ·  "}
                    稳定度 <span className="font-medium">{formatStability(hovered.card.stability)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    已复习 {hovered.card.reps} 次 · 下次复习 {formatDue(hovered.card.due)}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
