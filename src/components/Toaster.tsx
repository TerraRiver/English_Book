import { useEffect, useState } from "react"
import { subscribeToast, type Toast } from "@/lib/toast"

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => subscribeToast(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground shadow-lg"
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
