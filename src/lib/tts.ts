import { invoke } from "@tauri-apps/api/core"

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

async function speakWithPiper(text: string) {
  const buffer = await invoke<ArrayBuffer>("speak_piper", { text })
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

  if (lang.startsWith("en")) {
    try {
      await speakWithPiper(trimmed)
      return
    } catch (e) {
      console.error("piper tts failed, falling back to browser speech", e)
    }
  }

  speakWithBrowser(trimmed, lang)
}
