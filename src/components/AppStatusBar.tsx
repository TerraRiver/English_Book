import { useEffect, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { cn } from "@/lib/utils"
import { subscribeTtsStatus } from "@/lib/ttsStatus"

export function AppStatusBar() {
  const [version, setVersion] = useState("")
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {})
  }, [])

  useEffect(() => subscribeTtsStatus(setSpeaking), [])

  return (
    <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
      <span className="flex size-4 shrink-0 items-center justify-center">
        <span
          className={cn(
            "size-1.5 rounded-full transition-colors",
            speaking ? "bg-primary animate-pulse" : "bg-border"
          )}
          title={speaking ? "正在合成语音" : "语音合成空闲"}
        />
      </span>
      {version && <span className="tabular-nums">v{version}</span>}
    </div>
  )
}
