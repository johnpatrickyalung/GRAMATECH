import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCategories, fetchWords } from '../api/glossaryApi'
import { WordEntryBody } from '../components/WordEntryBody'
import { playWordEntry } from '../playWord'
import { speechSupported } from '../speak'
import type { Category, GlossaryWord } from '../types'
import '../App.css'

export default function Home() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [words, setWords] = useState<GlossaryWord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshCategories = useCallback(async () => {
    const list = await fetchCategories()
    setCategories(list)
    setSelectedId((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev
      return list[0]?.id ?? null
    })
  }, [])

  const handleRefresh = useCallback(() => {
    void (async () => {
      setError(null)
      setLoading(true)
      try {
        await refreshCategories()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshCategories])

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
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshCategories().catch(() => {
          /* keep list */
        })
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshCategories])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        await refreshCategories()
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshCategories])

  useEffect(() => {
    if (!selectedId) {
      setWords([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const w = await fetchWords(selectedId)
        if (!cancelled) setWords(w)
      } catch {
        if (!cancelled) setWords([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, categories])

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  )

  if (error) {
    return (
      <div className="app">
        <div className="empty-main" style={{ padding: '2rem' }}>
          <p>
            <strong>Could not load the glossary.</strong>
          </p>
          <p className="muted">{error}</p>
          <p className="muted">
            Start MongoDB and the API (<code>npm run server</code>), then run{' '}
            <code>npm run dev:full</code> or open the app after the API is up.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1 className="home-title">Glossary</h1>
          <p className="tagline">
            Every category below comes from the catalog your admin manages. Select a category to
            browse entries.
          </p>
        </div>
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
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-tools">
            <button type="button" className="btn btn-ghost" onClick={handleRefresh} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh categories'}
            </button>
          </div>
          <nav className="category-list" aria-label="All categories from the server">
            {loading ? (
              <p className="muted">Loading…</p>
            ) : categories.length === 0 ? (
              <p className="muted">
                No categories published yet. An admin can create them in <strong>Admin</strong> — they
                will show up here for everyone.
              </p>
            ) : (
              <ul>
                {categories.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`cat-btn ${c.id === selectedId ? 'cat-btn--active' : ''}`}
                      onClick={() => setSelectedId(c.id)}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
        </aside>

        <main className="main">
          {!selectedCategory ? (
            <div className="empty-main">
              <p>Select a category or wait for content from the server.</p>
            </div>
          ) : (
            <>
              <div className="main-head">
                <h2>{selectedCategory.name}</h2>
                <p className="hint">
                  Tap the term to play uploaded audio, or use speech if no audio is set.
                </p>
              </div>

              <section className="word-list" aria-label="Words in this category">
                {words.length === 0 ? (
                  <p className="muted card pad">No entries in this category yet.</p>
                ) : (
                  <ul className="word-ul">
                    {words.map((w) => (
                      <li key={w.id}>
                        <article className="word-card word-card--readonly word-card--detail">
                          <button
                            type="button"
                            className="word-hit word-hit--home"
                            onClick={() => playWordEntry(w)}
                          >
                            <span className="word-term">{w.term}</span>
                            <span className="word-tap-hint">Tap → play audio / speech</span>
                          </button>
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
