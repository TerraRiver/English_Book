type Listener = (active: boolean) => void

let active = false
let pending = 0
const listeners = new Set<Listener>()

function emit() {
  for (const listener of listeners) listener(active)
}

export function subscribeTtsStatus(listener: Listener): () => void {
  listeners.add(listener)
  listener(active)
  return () => listeners.delete(listener)
}

export function beginTts() {
  pending += 1
  if (!active) {
    active = true
    emit()
  }
}

export function endTts() {
  pending = Math.max(0, pending - 1)
  if (pending === 0 && active) {
    active = false
    emit()
  }
}
