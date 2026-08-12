import { createEmptyCard, fsrs, Rating, State, type Card } from "ts-fsrs"
import type { CardDirection, CardRow } from "./types"

const scheduler = fsrs({ request_retention: 0.9 })

export { Rating, State }
export type FsrsRating = Rating.Again | Rating.Hard | Rating.Good | Rating.Easy

function toFsrsCard(row: CardRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: 0,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

export interface NewCardFields {
  due: string
  stability: number
  difficulty: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}

export function initialCardFields(now = new Date()): NewCardFields {
  const card = createEmptyCard(now)
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: null,
  }
}

export function scheduleReview(
  row: CardRow,
  rating: FsrsRating,
  now = new Date()
): NewCardFields {
  const card = toFsrsCard(row)
  const result = scheduler.next(card, now, rating)
  const next = result.card
  return {
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    scheduled_days: next.scheduled_days,
    learning_steps: next.learning_steps,
    reps: next.reps,
    lapses: next.lapses,
    state: next.state,
    last_review: next.last_review ? next.last_review.toISOString() : null,
  }
}

export const DIRECTION_LABEL: Record<CardDirection, string> = {
  en_to_zh: "英 → 中",
  zh_to_en: "中 → 英",
}

export const STATE_LABEL: Record<number, string> = {
  [State.New]: "新卡片",
  [State.Learning]: "学习中",
  [State.Review]: "复习中",
  [State.Relearning]: "重新学习",
}

// Categorical chart color per non-New state — validated for scatter's
// all-pairs CVD check (see index.css --chart-1/2/3).
export const STATE_CHART_VAR: Record<number, string> = {
  [State.Learning]: "var(--chart-1)",
  [State.Relearning]: "var(--chart-2)",
  [State.Review]: "var(--chart-3)",
}
