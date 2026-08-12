import { lookupWordsBatch } from "./llm"
import type { LlmSettings } from "./settings"
import { getAllTerms, insertWordIfNew } from "./words"
import type { WordlistMeta } from "./wordlists"
import { loadWordlistTerms } from "./wordlists"

export type ImportStatus = "idle" | "running" | "cancelled" | "done"

export interface ImportState {
  status: ImportStatus
  listId: string | null
  listLabel: string | null
  total: number
  done: number
  failed: number
  currentTerm: string | null
  lastError: string | null
}

const BATCH_SIZE = 10
const CONCURRENCY = 50

let state: ImportState = {
  status: "idle",
  listId: null,
  listLabel: null,
  total: 0,
  done: 0,
  failed: 0,
  currentTerm: null,
  lastError: null,
}

const listeners = new Set<(s: ImportState) => void>()
let cancelFlag = false

function emit() {
  for (const fn of listeners) fn(state)
}

export function subscribeImportJob(fn: (s: ImportState) => void): () => void {
  listeners.add(fn)
  fn(state)
  return () => listeners.delete(fn)
}

export function getImportState(): ImportState {
  return state
}

export function cancelImport() {
  if (state.status === "running") cancelFlag = true
}

export async function startImport(list: WordlistMeta, count: number, settings: LlmSettings) {
  if (state.status === "running") {
    throw new Error("已有导入任务正在进行中")
  }

  const allTerms = await loadWordlistTerms(list.id)
  const existing = new Set(await getAllTerms())
  const candidates = allTerms.filter((t) => !existing.has(t)).slice(0, count)

  cancelFlag = false
  state = {
    status: "running",
    listId: list.id,
    listLabel: list.label,
    total: candidates.length,
    done: 0,
    failed: 0,
    currentTerm: null,
    lastError: null,
  }
  emit()

  const batches: string[][] = []
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    batches.push(candidates.slice(i, i + BATCH_SIZE))
  }

  let nextBatch = 0
  async function worker() {
    while (nextBatch < batches.length) {
      if (cancelFlag) return
      const batch = batches[nextBatch++]
      state = { ...state, currentTerm: batch[0] }
      emit()
      try {
        const results = await lookupWordsBatch(batch, settings)
        for (const term of batch) {
          if (cancelFlag) return
          const detail = results.get(term)
          if (!detail) {
            state = { ...state, failed: state.failed + 1 }
            emit()
            continue
          }
          try {
            await insertWordIfNew(term, detail)
            state = { ...state, done: state.done + 1 }
          } catch (e) {
            state = { ...state, failed: state.failed + 1, lastError: String(e) }
          }
          emit()
        }
      } catch (e) {
        state = { ...state, failed: state.failed + batch.length, lastError: String(e) }
        emit()
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, worker))

  state = { ...state, status: cancelFlag ? "cancelled" : "done", currentTerm: null }
  emit()
}
