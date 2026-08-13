export interface Toast {
  id: number
  message: string
}

type Listener = (toasts: Toast[]) => void

let nextId = 1
let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(toasts)
}

export function subscribeToast(listener: Listener): () => void {
  listeners.add(listener)
  listener(toasts)
  return () => listeners.delete(listener)
}

export function notify(message: string, durationMs = 4000) {
  // Avoid stacking duplicate messages if the same warning fires repeatedly.
  const existing = toasts.find((t) => t.message === message)
  if (existing) return

  const id = nextId++
  toasts = [...toasts, { id, message }]
  emit()

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, durationMs)
}
