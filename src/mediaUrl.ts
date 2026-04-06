const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

/** Resolve stored paths like `/uploads/audio/...` for `<audio src>` and `Audio()`. */
export function mediaUrl(path: string | undefined | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}
