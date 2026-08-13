import { invoke } from "@tauri-apps/api/core"
import { notify } from "@/lib/toast"
import { beginTts, endTts } from "@/lib/ttsStatus"

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

async function speakWithLocalTts(text: string) {
  const buffer = await invoke<ArrayBuffer>("speak_tts", { text })
  const blob = new Blob([buffer], { type: "audio/wav" })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.addEventListener("ended", () => URL.revokeObjectURL(url))
  await audio.play()
}

function speakWithBrowser(text: string, lang: string) {
  if (!isSpeechSupported()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}

export async function speak(text: string, lang = "en-US") {
  const trimmed = text.trim()
  if (!trimmed) return

  beginTts()
  try {
    if (lang.startsWith("en")) {
      try {
        await speakWithLocalTts(trimmed)
        return
      } catch (e) {
        console.error("local tts failed, falling back to browser speech", e)
        notify("本地发音引擎不可用，已切换为系统语音朗读")
      }
    }

    speakWithBrowser(trimmed, lang)
  } finally {
    endTts()
  }
}
