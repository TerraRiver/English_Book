import { getDb } from "./db"

export interface LlmSettings {
  baseUrl: string
  apiKey: string
  model: string
}

const DEFAULT_SETTINGS: LlmSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-v4-flash",
}

export async function getLlmSettings(): Promise<LlmSettings> {
  const db = await getDb()
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM settings WHERE key IN ('llm_base_url', 'llm_api_key', 'llm_model')"
  )
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  return {
    baseUrl: map.llm_base_url ?? DEFAULT_SETTINGS.baseUrl,
    apiKey: map.llm_api_key ?? DEFAULT_SETTINGS.apiKey,
    model: map.llm_model ?? DEFAULT_SETTINGS.model,
  }
}

export async function saveLlmSettings(settings: LlmSettings) {
  const db = await getDb()
  const entries: [string, string][] = [
    ["llm_base_url", settings.baseUrl],
    ["llm_api_key", settings.apiKey],
    ["llm_model", settings.model],
  ]
  for (const [key, value] of entries) {
    await db.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    )
  }
}

export const DEFAULT_REVIEW_POOL_SIZE = 5

export async function getReviewPoolSize(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM settings WHERE key = 'review_pool_size'"
  )
  const parsed = rows[0] ? Number(rows[0].value) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REVIEW_POOL_SIZE
}

export async function saveReviewPoolSize(size: number): Promise<void> {
  const db = await getDb()
  await db.execute(
    "INSERT INTO settings (key, value) VALUES ('review_pool_size', $1) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(size)]
  )
}
