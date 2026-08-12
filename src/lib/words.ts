import { getDb } from "./db"
import { initialCardFields, scheduleReview, type FsrsRating } from "./fsrs"
import type { CardDirection, CardRow, CardWithWord, DueCard, WordDetail, WordRow, WordWithCards } from "./types"

export async function syncCards(wordId: number, bidirectional: boolean) {
  const db = await getDb()
  const directions: CardDirection[] = bidirectional ? ["en_to_zh", "zh_to_en"] : ["en_to_zh"]
  for (const direction of directions) {
    const existing = await db.select<{ id: number }[]>(
      "SELECT id FROM cards WHERE word_id = $1 AND direction = $2",
      [wordId, direction]
    )
    if (existing.length > 0) continue
    const c = initialCardFields()
    await db.execute(
      `INSERT INTO cards (word_id, direction, due, stability, difficulty, scheduled_days, learning_steps, reps, lapses, state, last_review)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        wordId,
        direction,
        c.due,
        c.stability,
        c.difficulty,
        c.scheduled_days,
        c.learning_steps,
        c.reps,
        c.lapses,
        c.state,
        c.last_review,
      ]
    )
  }
  if (!bidirectional) {
    await db.execute("DELETE FROM cards WHERE word_id = $1 AND direction = 'zh_to_en'", [wordId])
  }
}

export async function saveWord(
  term: string,
  detail: WordDetail,
  note: string,
  bidirectional: boolean
): Promise<void> {
  const db = await getDb()
  const phonetic = detail.phonetic_us ?? detail.phonetic_uk ?? null

  await db.execute(
    `INSERT INTO words (term, phonetic, detail_json, note, bidirectional)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(term) DO UPDATE SET
       phonetic = excluded.phonetic,
       detail_json = excluded.detail_json,
       note = excluded.note,
       bidirectional = excluded.bidirectional`,
    [term, phonetic, JSON.stringify(detail), note || null, bidirectional ? 1 : 0]
  )

  const rows = await db.select<{ id: number }[]>("SELECT id FROM words WHERE term = $1", [term])
  await syncCards(rows[0].id, bidirectional)
}

export async function updateWord(
  id: number,
  term: string,
  detail: WordDetail,
  note: string,
  bidirectional: boolean
): Promise<void> {
  const db = await getDb()
  const phonetic = detail.phonetic_us ?? detail.phonetic_uk ?? null
  await db.execute(
    `UPDATE words SET term = $1, phonetic = $2, detail_json = $3, note = $4, bidirectional = $5 WHERE id = $6`,
    [term, phonetic, JSON.stringify(detail), note || null, bidirectional ? 1 : 0, id]
  )
  await syncCards(id, bidirectional)
}

export async function listWordsWithCards(query = ""): Promise<WordWithCards[]> {
  const db = await getDb()
  const like = `%${query.trim()}%`
  const rows = await db.select<
    (WordRow & { c_direction: CardDirection | null; c_due: string | null; c_state: number | null })[]
  >(
    `SELECT w.*, c.direction as c_direction, c.due as c_due, c.state as c_state
     FROM words w LEFT JOIN cards c ON c.word_id = w.id
     WHERE w.term LIKE $1 OR w.detail_json LIKE $1
     ORDER BY w.created_at DESC`,
    [like]
  )

  const byId = new Map<number, WordWithCards>()
  for (const r of rows) {
    let entry = byId.get(r.id)
    if (!entry) {
      entry = {
        id: r.id,
        term: r.term,
        phonetic: r.phonetic,
        detail_json: r.detail_json,
        note: r.note,
        bidirectional: r.bidirectional,
        created_at: r.created_at,
        cards: [],
      }
      byId.set(r.id, entry)
    }
    if (r.c_direction) {
      entry.cards.push({ direction: r.c_direction, due: r.c_due!, state: r.c_state! })
    }
  }
  return [...byId.values()]
}

export async function getDueCards(limit = 20): Promise<DueCard[]> {
  const db = await getDb()
  const rows = await db.select<(CardRow & { w_id: number; term: string; phonetic: string | null; detail_json: string; note: string | null; bidirectional: 0 | 1; created_at: string })[]>(
    `SELECT c.*, w.id as w_id, w.term, w.phonetic, w.detail_json, w.note, w.bidirectional, w.created_at
     FROM cards c JOIN words w ON w.id = c.word_id
     WHERE c.due <= $1
     ORDER BY c.due ASC
     LIMIT $2`,
    [new Date().toISOString(), limit]
  )
  return rows.map((r) => ({
    card: {
      id: r.id,
      word_id: r.word_id,
      direction: r.direction,
      due: r.due,
      stability: r.stability,
      difficulty: r.difficulty,
      scheduled_days: r.scheduled_days,
      learning_steps: r.learning_steps,
      reps: r.reps,
      lapses: r.lapses,
      state: r.state,
      last_review: r.last_review,
    },
    word: {
      id: r.w_id,
      term: r.term,
      phonetic: r.phonetic,
      detail_json: r.detail_json,
      note: r.note,
      bidirectional: r.bidirectional,
      created_at: r.created_at,
    },
  }))
}

export async function listAllCards(): Promise<CardWithWord[]> {
  const db = await getDb()
  const rows = await db.select<(CardRow & { term: string })[]>(
    `SELECT c.*, w.term as term
     FROM cards c JOIN words w ON w.id = c.word_id
     ORDER BY w.term ASC`
  )
  return rows.map((r) => ({
    card: {
      id: r.id,
      word_id: r.word_id,
      direction: r.direction,
      due: r.due,
      stability: r.stability,
      difficulty: r.difficulty,
      scheduled_days: r.scheduled_days,
      learning_steps: r.learning_steps,
      reps: r.reps,
      lapses: r.lapses,
      state: r.state,
      last_review: r.last_review,
    },
    term: r.term,
  }))
}

export async function countDueCards(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM cards WHERE due <= $1",
    [new Date().toISOString()]
  )
  return rows[0]?.count ?? 0
}

export async function countAllWords(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM words")
  return rows[0]?.count ?? 0
}

export async function reviewCard(card: CardRow, rating: FsrsRating): Promise<void> {
  const db = await getDb()
  const next = scheduleReview(card, rating)
  await db.execute(
    `UPDATE cards SET due = $1, stability = $2, difficulty = $3, scheduled_days = $4,
       learning_steps = $5, reps = $6, lapses = $7, state = $8, last_review = $9
     WHERE id = $10`,
    [
      next.due,
      next.stability,
      next.difficulty,
      next.scheduled_days,
      next.learning_steps,
      next.reps,
      next.lapses,
      next.state,
      next.last_review,
      card.id,
    ]
  )
}

export async function getAllTerms(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ term: string }[]>("SELECT term FROM words")
  return rows.map((r) => r.term)
}

export async function insertWordIfNew(term: string, detail: WordDetail): Promise<boolean> {
  const db = await getDb()
  const phonetic = detail.phonetic_us ?? detail.phonetic_uk ?? null
  const result = await db.execute(
    `INSERT INTO words (term, phonetic, detail_json, note, bidirectional)
     VALUES ($1, $2, $3, NULL, 0)
     ON CONFLICT(term) DO NOTHING`,
    [term, phonetic, JSON.stringify(detail)]
  )
  if (result.rowsAffected === 0) return false
  const rows = await db.select<{ id: number }[]>("SELECT id FROM words WHERE term = $1", [term])
  await syncCards(rows[0].id, false)
  return true
}

export async function deleteWords(ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ")
  await db.execute(`DELETE FROM cards WHERE word_id IN (${placeholders})`, ids)
  await db.execute(`DELETE FROM words WHERE id IN (${placeholders})`, ids)
}
