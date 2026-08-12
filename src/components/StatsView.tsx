import { useEffect, useMemo, useState } from "react"
import { listAllCards } from "@/lib/words"
import { State } from "@/lib/fsrs"
import type { CardWithWord } from "@/lib/types"

const REVIEWED_STATES = [State.Learning, State.Relearning, State.Review] as const

const WIDTH = 640
const HEIGHT = 300
const MARGIN = { top: 8, right: 12, bottom: 32, left: 60 }
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

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function StatsView() {
  const [cards, setCards] = useState<CardWithWord[] | null>(null)

  useEffect(() => {
    listAllCards().then(setCards)
  }, [])

  const { plotted, newCount, learningCount, reviewCount, yMin, yMax } = useMemo(() => {
    if (!cards) {
      return { plotted: [] as CardWithWord[], newCount: 0, learningCount: 0, reviewCount: 0, yMin: 1, yMax: 1 }
    }
    const plotted = cards.filter((c) => (REVIEWED_STATES as readonly number[]).includes(c.card.state))
    const newCount = cards.length - plotted.length
    const learningCount = plotted.filter(
      (c) => c.card.state === State.Learning || c.card.state === State.Relearning
    ).length
    const reviewCount = plotted.filter((c) => c.card.state === State.Review).length
    const stabilities = plotted.map((c) => Math.max(c.card.stability, 1 / 1440))
    const yMin = stabilities.length ? Math.min(...stabilities, 1 / 144) : 1 / 144
    const yMax = stabilities.length ? Math.max(...stabilities, 1) : 1
    return { plotted, newCount, learningCount, reviewCount, yMin, yMax }
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

  if (cards === null) {
    return <p className="text-sm text-muted-foreground">加载中...</p>
  }

  if (cards.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        词库还是空的，先去「添加」收几个词吧。
      </p>
    )
  }

  const visibleYTicks = Y_TICKS.filter((t) => t.days >= yMin * 0.9 && t.days <= yMax * 1.1)

  // Group cards that would render within a few pixels of each other into one
  // bubble sized by count, instead of stacking identical opaque dots — FSRS
  // gives many freshly-added cards the exact same initial difficulty/stability.
  const GRID = 8
  const clusterMap = new Map<string, { x: number; y: number; count: number }>()
  for (const c of plotted) {
    const x = xScale(c.card.difficulty)
    const y = yScale(c.card.stability)
    const key = `${Math.round(x / GRID)}_${Math.round(y / GRID)}`
    const existing = clusterMap.get(key)
    if (existing) {
      existing.count += 1
    } else {
      clusterMap.set(key, { x, y, count: 1 })
    }
  }
  const clusters = [...clusterMap.values()]

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex shrink-0 flex-wrap gap-10">
        <StatItem label="总卡片" value={cards.length} />
        <StatItem label="新卡片" value={newCount} />
        <StatItem label="学习中" value={learningCount} />
        <StatItem label="复习中" value={reviewCount} />
      </div>

      {plotted.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有复习记录，先去「复习」上几张卡片吧。</p>
      ) : (
        <div className="relative min-h-56 w-full flex-1">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
          >
            {visibleYTicks.map((t) => (
              <line
                key={t.label}
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={yScale(t.days)}
                y2={yScale(t.days)}
                stroke="var(--border)"
                strokeWidth={1}
              />
            ))}

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
          </svg>

          {/* Dots and axis labels render as real HTML, not SVG shapes — the
             SVG stretches non-uniformly to fill the box (preserveAspectRatio
             "none"), which would otherwise squash circles into ellipses and
             shrink text along with it. */}
          <div className="pointer-events-none absolute inset-0">
            {clusters.map((cluster) => {
              const d = (cluster.count > 1 ? Math.min(12, 4 + Math.sqrt(cluster.count) * 2) : 4) * 2
              return (
                <span
                  key={`${cluster.x}_${cluster.y}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${(cluster.x / WIDTH) * 100}%`,
                    top: `${(cluster.y / HEIGHT) * 100}%`,
                    width: d,
                    height: d,
                    backgroundColor: "var(--primary)",
                    border: "2px solid var(--background)",
                  }}
                />
              )
            })}

            {visibleYTicks.map((t) => (
              <span
                key={t.label}
                className="absolute -translate-x-full -translate-y-1/2 text-nowrap text-[11px] text-muted-foreground"
                style={{ top: `${(yScale(t.days) / HEIGHT) * 100}%`, left: `calc(${(MARGIN.left / WIDTH) * 100}% - 10px)` }}
              >
                {t.label}
              </span>
            ))}

            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 -rotate-90 text-nowrap text-[11px] text-muted-foreground"
              style={{ top: `${((MARGIN.top + PLOT_H / 2) / HEIGHT) * 100}%`, left: 8 }}
            >
              稳定度
            </span>

            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
              <span
                key={d}
                className="absolute -translate-x-1/2 text-[11px] text-muted-foreground"
                style={{
                  left: `${(xScale(d) / WIDTH) * 100}%`,
                  top: `${((HEIGHT - MARGIN.bottom + 8) / HEIGHT) * 100}%`,
                }}
              >
                {d}
              </span>
            ))}

            <span
              className="absolute -translate-x-1/2 text-[11px] text-muted-foreground"
              style={{
                left: `${((MARGIN.left + PLOT_W / 2) / WIDTH) * 100}%`,
                top: `${((HEIGHT - 14) / HEIGHT) * 100}%`,
              }}
            >
              难度
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
