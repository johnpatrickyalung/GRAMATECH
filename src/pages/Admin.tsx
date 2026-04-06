import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createCategory,
  createWord,
  deleteCategory,
  deleteWord,
  fetchCategories,
  fetchMe,
  fetchWords,
  login,
  logout,
} from '../api/glossaryApi'
import { WordEntryBody } from '../components/WordEntryBody'
import { playWordEntry } from '../playWord'
import { speechSupported } from '../speak'
import type { Category, GlossaryWord, WordFormFields } from '../types'
import '../App.css'

function emptyWordForm(): WordFormFields {
  return {
    term: '',
    definition: '',
    paraanNgPagbigkas: '',
    bahagiNgPananalita: '',
    kahulugangPangGramatika: '',
    salinSaIloko: '',
    salinSaKapampangan: '',
    halimbawaPangungusap: '',
  }
}

export default function Admin() {
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState<{ username: string } | null>(null)
  const [loginUser, setLoginUser] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const [online, setOnline] = useState(() => navigator.onLine)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [words, setWords] = useState<GlossaryWord[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [wordForm, setWordForm] = useState<WordFormFields>(emptyWordForm)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioInputKey, setAudioInputKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { user: u } = await fetchMe()
        if (!cancelled) setUser(u)
      } catch {
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setAuthLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshCategories = useCallback(async () => {
    const list = await fetchCategories()
    setCategories(list)
    setSelectedId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev
      return list[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setCategories([])
      setSelectedId(null)
      setWords([])
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await refreshCategories()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, refreshCategories])

  useEffect(() => {
    if (!user || !selectedId) {
      setWords([])
      return
    }
    let cancelled = false
    ;(async () => {
      const w = await fetchWords(selectedId)
      if (!cancelled) setWords(w)
    })()
    return () => {
      cancelled = true
    }
  }, [user, selectedId, categories])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  )

  const setWordField = (key: keyof WordFormFields, value: string) => {
    setWordForm((f) => ({ ...f, [key]: value }))
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    try {
      const { user: u } = await login(loginUser.trim(), loginPass)
      setUser(u)
      setLoginPass('')
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault()
    const name = newCategory.trim()
    if (!name) return
    const cat = await createCategory(name)
    setNewCategory('')
    await refreshCategories()
    setSelectedId(cat.id)
  }

  const handleAddWord = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId) return
    const term = wordForm.term.trim()
    if (!term) return
    await createWord(selectedId, wordForm, audioFile)
    setWordForm(emptyWordForm())
    setAudioFile(null)
    setAudioInputKey((k) => k + 1)
    setWords(await fetchWords(selectedId))
  }

  const handleWordActivate = (w: GlossaryWord) => {
    playWordEntry(w)
  }

  const handleDeleteWord = async (id: string) => {
    await deleteWord(id)
    if (selectedId) setWords(await fetchWords(selectedId))
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id)
    await refreshCategories()
  }

  if (authLoading) {
    return (
      <div className="app">
        <div className="empty-main">
          <p className="muted">Checking session…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="brand">
            <h1 className="admin-title">Admin</h1>
            <p className="tagline">Sign in to manage categories and words</p>
          </div>
        </header>
        <main className="main admin-login-wrap">
          <form className="card admin-login" onSubmit={handleLogin}>
            <h2 className="card-title">Administrator login</h2>
            {loginError ? (
              <p className="login-error" role="alert">
                {loginError}
              </p>
            ) : null}
            <div className="field">
              <label htmlFor="adm-user">Username</label>
              <input
                id="adm-user"
                className="input"
                autoComplete="username"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="adm-pass">Password</label>
              <input
                id="adm-pass"
                type="password"
                className="input"
                autoComplete="current-password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Sign in
            </button>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="admin-title">Admin</h1>
          <p className="tagline">Signed in as {user.username}</p>
        </div>
        <div className="header-actions">
          <div className="status-pills" aria-live="polite">
            <span className={`pill ${online ? 'pill--ok' : 'pill--warn'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
            {speechSupported() ? (
              <span className="pill pill--ok">Voice</span>
            ) : (
              <span className="pill pill--warn">No speech</span>
            )}
          </div>
          <button type="button" className="btn" onClick={() => void handleLogout()}>
            Log out
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <form className="form-row" onSubmit={handleAddCategory}>
            <label className="sr-only" htmlFor="new-cat">
              New category name
            </label>
            <input
              id="new-cat"
              className="input"
              placeholder="New category…"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              maxLength={120}
            />
            <button type="submit" className="btn btn-primary">
              Add
            </button>
          </form>

          <nav className="category-list" aria-label="Categories">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : categories.length === 0 ? (
              <p className="muted">Add a category to begin.</p>
            ) : (
              <ul>
                {categories.map((c) => (
                  <li key={c.id}>
                    <div className="category-row">
                      <button
                        type="button"
                        className={`cat-btn ${c.id === selectedId ? 'cat-btn--active' : ''}`}
                        onClick={() => setSelectedId(c.id)}
                      >
                        {c.name}
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title={`Delete ${c.name}`}
                        aria-label={`Delete category ${c.name}`}
                        onClick={() => {
                          if (confirm(`Delete category “${c.name}” and all its words?`)) {
                            void handleDeleteCategory(c.id)
                          }
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        <main className="main main--admin-words">
          {!selectedCategory ? (
            <div className="empty-main">
              <p>Select or create a category to add entries.</p>
            </div>
          ) : (
            <>
              <div className="main-head">
                <h2>{selectedCategory.name}</h2>
                <p className="hint">
                  Add an entry with the fields below. Optional: upload an audio file (mp3, m4a, wav,
                  ogg, webm).
                </p>
              </div>

              <form className="word-form card word-form--extended" onSubmit={handleAddWord}>
                <h3 className="card-title">Bagong entry (sa ilalim ng kategoryang ito)</h3>
                <div className="field-grid field-grid--stack">
                  <div className="field">
                    <label htmlFor="wf-term">Term</label>
                    <input
                      id="wf-term"
                      className="input"
                      value={wordForm.term}
                      onChange={(e) => setWordField('term', e.target.value)}
                      maxLength={500}
                      required
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-def">Definition</label>
                    <textarea
                      id="wf-def"
                      className="input textarea"
                      value={wordForm.definition}
                      onChange={(e) => setWordField('definition', e.target.value)}
                      rows={3}
                      maxLength={8000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-audio">Audio (maaaring mag-upload ng audio)</label>
                    <input
                      key={audioInputKey}
                      id="wf-audio"
                      className="input input-file"
                      type="file"
                      accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac"
                      onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                    />
                    {audioFile ? (
                      <span className="file-picked">{audioFile.name}</span>
                    ) : (
                      <span className="muted file-hint">Walang napiling file</span>
                    )}
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-paraan">Paraan ng pagbigkas</label>
                    <textarea
                      id="wf-paraan"
                      className="input textarea"
                      value={wordForm.paraanNgPagbigkas}
                      onChange={(e) => setWordField('paraanNgPagbigkas', e.target.value)}
                      rows={2}
                      maxLength={4000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-bahagi">Bahagi ng pananalita</label>
                    <input
                      id="wf-bahagi"
                      className="input"
                      value={wordForm.bahagiNgPananalita}
                      onChange={(e) => setWordField('bahagiNgPananalita', e.target.value)}
                      maxLength={2000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-kahulugan">Kahulugang pang-gramatika</label>
                    <textarea
                      id="wf-kahulugan"
                      className="input textarea"
                      value={wordForm.kahulugangPangGramatika}
                      onChange={(e) => setWordField('kahulugangPangGramatika', e.target.value)}
                      rows={3}
                      maxLength={8000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-iloko">Salin sa Iloko</label>
                    <textarea
                      id="wf-iloko"
                      className="input textarea"
                      value={wordForm.salinSaIloko}
                      onChange={(e) => setWordField('salinSaIloko', e.target.value)}
                      rows={2}
                      maxLength={4000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-kap">Salin sa Kapampangan</label>
                    <textarea
                      id="wf-kap"
                      className="input textarea"
                      value={wordForm.salinSaKapampangan}
                      onChange={(e) => setWordField('salinSaKapampangan', e.target.value)}
                      rows={2}
                      maxLength={4000}
                    />
                  </div>
                  <div className="field field--wide">
                    <label htmlFor="wf-halimbawa">
                      Halimbawa sa pangungusap sa Filipino, Iloko at Kapampangan
                    </label>
                    <textarea
                      id="wf-halimbawa"
                      className="input textarea"
                      value={wordForm.halimbawaPangungusap}
                      onChange={(e) => setWordField('halimbawaPangungusap', e.target.value)}
                      rows={5}
                      maxLength={16000}
                      placeholder="Pwedeng maglagay ng halimbawa sa tatlong wika…"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">
                  I-save ang entry
                </button>
              </form>

              <section className="word-list" aria-label="Entries in this category">
                {words.length === 0 ? (
                  <p className="muted card pad">Walang entry pa. Magdagdag sa itaas.</p>
                ) : (
                  <ul className="word-ul">
                    {words.map((w) => (
                      <li key={w.id}>
                        <article className="word-card word-card--detail">
                          <div className="word-card__head">
                            <button
                              type="button"
                              className="word-hit word-hit--admin"
                              onClick={() => handleWordActivate(w)}
                            >
                              <span className="word-term">{w.term}</span>
                              <span className="word-tap-hint">I-tap para tumunog</span>
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger word-remove"
                              title="Remove entry"
                              aria-label={`Remove ${w.term}`}
                              onClick={() => handleDeleteWord(w.id)}
                            >
                              ×
                            </button>
                          </div>
                          <div className="word-card__body">
                            <WordEntryBody w={w} />
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
