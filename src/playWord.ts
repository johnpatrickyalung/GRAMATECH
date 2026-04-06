import type { GlossaryWord } from './types'
import { mediaUrl } from './mediaUrl'
import { speakGlossaryLine } from './speak'

/** Prefer uploaded audio; fall back to speech synthesis. */
export function playWordEntry(w: GlossaryWord): void {
  const url = mediaUrl(w.audioUrl)
  if (url) {
    const audio = new Audio(url)
    audio.play().catch(() => {
      speakGlossaryLine(w.term, w.definition)
    })
  } else {
    speakGlossaryLine(w.term, w.definition)
  }
}
