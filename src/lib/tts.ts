export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window
}

export function speak(text: string, lang = "en-US") {
  if (!text.trim() || !isSpeechSupported()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}
