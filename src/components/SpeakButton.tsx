import type { ComponentProps } from "react"
import { Volume2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { isSpeechSupported, speak } from "@/lib/tts"

interface SpeakButtonProps {
  text: string
  lang?: string
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

export function SpeakButton({ text, lang = "en-US", size = "icon-sm", className }: SpeakButtonProps) {
  if (!text.trim() || !isSpeechSupported()) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, lang)
      }}
      aria-label={`朗读: ${text}`}
    >
      <Volume2Icon />
    </Button>
  )
}
