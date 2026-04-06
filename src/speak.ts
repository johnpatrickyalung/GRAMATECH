/** Speaks text using the browser's built-in speech synthesis (works offline when voices are available). */
export function speakGlossaryLine(term: string, definition: string): void {
  const parts = [term.trim()]
  if (definition.trim()) {
    parts.push(definition.trim())
  }
  const text = parts.join('. ')
  if (!text) return

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return
  }

  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = document.documentElement.lang || navigator.language || 'en-US'
  utter.rate = 0.95
  window.speechSynthesis.speak(utter)
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}
