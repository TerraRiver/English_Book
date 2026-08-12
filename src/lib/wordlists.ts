import manifest from "@/data/wordlists/manifest.json"

export interface WordlistMeta {
  id: string
  label: string
  count: number
}

export const WORDLISTS: WordlistMeta[] = manifest

const TERM_MODULES = import.meta.glob<{ default: string[] }>("../data/wordlists/!(manifest).json")

export async function loadWordlistTerms(id: string): Promise<string[]> {
  const loader = TERM_MODULES[`../data/wordlists/${id}.json`]
  if (!loader) throw new Error(`未知词库: ${id}`)
  const mod = await loader()
  return mod.default
}
