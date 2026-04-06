import type { Category, GlossaryWord, WordFormFields } from '../types'

const base = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

const TOKEN_KEY = 'gramatech_token'
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? '',
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get()
  const r = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!r.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : r.statusText)
  }
  return data as T
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') return new Date(v).getTime()
  return 0
}

export function parseCategory(raw: unknown): Category {
  const o = raw as Record<string, unknown>
  return {
    id: String(o.id),
    name: String(o.name ?? ''),
    sortOrder: Number(o.sortOrder ?? 0),
    createdAt: num(o.createdAt),
  }
}

export function parseWord(raw: unknown): GlossaryWord {
  const o = raw as Record<string, unknown>
  return {
    id: String(o.id),
    categoryId: String(o.categoryId ?? ''),
    term: String(o.term ?? ''),
    definition: String(o.definition ?? ''),
    audioUrl: String(o.audioUrl ?? ''),
    paraanNgPagbigkas: String(o.paraanNgPagbigkas ?? ''),
    bahagiNgPananalita: String(o.bahagiNgPananalita ?? ''),
    kahulugangPangGramatika: String(o.kahulugangPangGramatika ?? ''),
    salinSaIloko: String(o.salinSaIloko ?? ''),
    salinSaKapampangan: String(o.salinSaKapampangan ?? ''),
    halimbawaPangungusap: String(o.halimbawaPangungusap ?? ''),
    createdAt: num(o.createdAt),
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const data = await jsonFetch<unknown[]>('/api/categories')
  return Array.isArray(data) ? data.map(parseCategory) : []
}

export async function fetchWords(categoryId: string): Promise<GlossaryWord[]> {
  const data = await jsonFetch<unknown[]>(`/api/categories/${encodeURIComponent(categoryId)}/words`)
  return Array.isArray(data) ? data.map(parseWord) : []
}

export async function createCategory(name: string): Promise<Category> {
  const data = await jsonFetch<unknown>('/api/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  return parseCategory(data)
}

export async function deleteCategory(id: string): Promise<void> {
  await jsonFetch(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function createWord(
  categoryId: string,
  fields: WordFormFields,
  audioFile: File | null,
): Promise<GlossaryWord> {
  const fd = new FormData()
  fd.append('term', fields.term)
  fd.append('definition', fields.definition)
  fd.append('paraanNgPagbigkas', fields.paraanNgPagbigkas)
  fd.append('bahagiNgPananalita', fields.bahagiNgPananalita)
  fd.append('kahulugangPangGramatika', fields.kahulugangPangGramatika)
  fd.append('salinSaIloko', fields.salinSaIloko)
  fd.append('salinSaKapampangan', fields.salinSaKapampangan)
  fd.append('halimbawaPangungusap', fields.halimbawaPangungusap)
  if (audioFile) {
    fd.append('audio', audioFile)
  }

  const token = tokenStore.get()
  const r = await fetch(`${base}/api/categories/${encodeURIComponent(categoryId)}/words`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!r.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : r.statusText)
  }
  return parseWord(data)
}

export async function deleteWord(categoryId: string, wordId: string): Promise<void> {
  await jsonFetch(`/api/categories/${encodeURIComponent(categoryId)}/words/${encodeURIComponent(wordId)}`, { method: 'DELETE' })
}

export async function updateWord(
  categoryId: string,
  wordId: string,
  fields: WordFormFields,
  audioFile?: File | null,
  deleteAudio?: boolean,
): Promise<GlossaryWord> {
  const fd = new FormData()
  fd.append('term', fields.term)
  fd.append('definition', fields.definition)
  fd.append('paraanNgPagbigkas', fields.paraanNgPagbigkas)
  fd.append('bahagiNgPananalita', fields.bahagiNgPananalita)
  fd.append('kahulugangPangGramatika', fields.kahulugangPangGramatika)
  fd.append('salinSaIloko', fields.salinSaIloko)
  fd.append('salinSaKapampangan', fields.salinSaKapampangan)
  fd.append('halimbawaPangungusap', fields.halimbawaPangungusap)
  if (audioFile) fd.append('audio', audioFile)
  if (deleteAudio) fd.append('deleteAudio', 'true')

  const token = tokenStore.get()
  const r = await fetch(
    `${base}/api/categories/${encodeURIComponent(categoryId)}/words/${encodeURIComponent(wordId)}`,
    { method: 'PATCH', credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd },
  )
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown> & { error?: string }
  if (!r.ok) throw new Error(typeof data.error === 'string' ? data.error : r.statusText)
  return parseWord(data)
}

export type AuthUser = { username: string }

/** JWT login response: same token is also set as httpOnly cookie `admin_token` for the browser. */
export type LoginResponse = {
  ok: true
  user: AuthUser
  token: string
  tokenType: 'Bearer'
  expiresIn: string
}

export async function fetchMe(): Promise<{ user: AuthUser | null }> {
  try {
    const data = await jsonFetch<{ username?: string }>('/api/auth/me')
    return { user: data.username ? { username: data.username } : null }
  } catch {
    return { user: null }
  }
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const data = await jsonFetch<{ ok: boolean; username: string; token?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (data.token) tokenStore.set(data.token)
  return { ok: true, user: { username: data.username }, token: data.token ?? '', tokenType: 'Bearer', expiresIn: '' }
}

export async function logout(): Promise<void> {
  await jsonFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
  tokenStore.clear()
}
