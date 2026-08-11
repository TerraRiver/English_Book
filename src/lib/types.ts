export interface WordSense {
  pos: string
  translation: string
  definition_en?: string
}

export interface WordVariant {
  label: string
  form: string
}

export interface WordExample {
  en: string
  zh: string
}

export interface WordDetail {
  phonetic_uk?: string
  phonetic_us?: string
  senses: WordSense[]
  variants: WordVariant[]
  examples: WordExample[]
  usage_notes?: string
}

export interface WordRow {
  id: number
  term: string
  phonetic: string | null
  detail_json: string
  note: string | null
  bidirectional: 0 | 1
  created_at: string
}

export type CardDirection = "en_to_zh" | "zh_to_en"

// Mirrors ts-fsrs's Card shape, persisted as its own row so a bidirectional
// word can carry two independent memory states (one per direction).
export interface CardRow {
  id: number
  word_id: number
  direction: CardDirection
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

export interface DueCard {
  card: CardRow
  word: WordRow
}
