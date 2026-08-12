import Database from "@tauri-apps/plugin-sql"

let dbPromise: Promise<Database> | null = null

export function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:app.db").then(async (db) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS words (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          term TEXT NOT NULL UNIQUE,
          phonetic TEXT,
          detail_json TEXT NOT NULL,
          note TEXT,
          bidirectional INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
          direction TEXT NOT NULL CHECK (direction IN ('en_to_zh', 'zh_to_en')),
          due TEXT NOT NULL,
          stability REAL NOT NULL DEFAULT 0,
          difficulty REAL NOT NULL DEFAULT 0,
          scheduled_days REAL NOT NULL DEFAULT 0,
          learning_steps INTEGER NOT NULL DEFAULT 0,
          reps INTEGER NOT NULL DEFAULT 0,
          lapses INTEGER NOT NULL DEFAULT 0,
          state INTEGER NOT NULL DEFAULT 0,
          last_review TEXT,
          UNIQUE(word_id, direction)
        );
      `)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
      await db.execute(`
        CREATE TABLE IF NOT EXISTS review_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
          rating INTEGER NOT NULL,
          reviewed_at TEXT NOT NULL
        );
      `)
      return db
    })
  }
  return dbPromise
}
