import { useCallback, useEffect, useState } from 'react'
import { fetchCategories, fetchWords } from '../api/glossaryApi'
import { WordEntryBody } from '../components/WordEntryBody'
import type { Category, GlossaryWord } from '../types'
import '../App.css'

const CATEGORY_ICONS = ['📚','🗂️','📖','🔤','🧩','💬','📝','🔍','🌐','🏷️','📌','💡','🎓','🧠','📜','✏️','🔑','📋','🗃️','⚡']

function getCategoryIcon(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return CATEGORY_ICONS[hash % CATEGORY_ICONS.length]
}

type View = 'categories' | 'term-list' | 'word-detail'

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [selectedWord, setSelectedWord] = useState<GlossaryWord | null>(null)
  const [words, setWords] = useState<GlossaryWord[]>([])
  const [wordsLoading, setWordsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('categories')

  const refreshCategories = useCallback(async () => {
    const list = await fetchCategories()
    setCategories(list)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try { await refreshCategories() }
      catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [refreshCategories])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCategories().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshCategories])

  useEffect(() => {
    if (!selectedCategory) { setWords([]); return }
    let cancelled = false
    ;(async () => {
      setWordsLoading(true)
      try {
        const w = await fetchWords(selectedCategory.id)
        if (!cancelled) setWords(w)
      } catch { if (!cancelled) setWords([]) }
      finally { if (!cancelled) setWordsLoading(false) }
    })()
    return () => { cancelled = true }
  }, [selectedCategory])

  const q = search.trim().toLowerCase()
  const filteredCategories = q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories
  const filteredWords = q
    ? words.filter((w) => w.term.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q))
    : words

  const openCategory = (cat: Category) => {
    setSelectedCategory(cat)
    setSearch('')
    setView('term-list')
  }

  const openWord = (w: GlossaryWord) => {
    setSelectedWord(w)
    setView('word-detail')
  }

  const goToCategories = () => { setSelectedCategory(null); setSelectedWord(null); setSearch(''); setView('categories') }
  const goToTermList = () => { setSelectedWord(null); setView('term-list') }

  if (error) {
    return (
      <div className="home-page">
        <div className="home-empty">
          <p><strong>Could not load the glossary.</strong></p>
          <p className="muted">{error}</p>
          <p className="muted">Make sure the API server is running: <code>npm run dev:full</code></p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">

      {/* ── Search hero ── */}
      <div className="home-hero">
        <h1 className="home-hero__title">
          {view === 'word-detail' && selectedWord
            ? selectedWord.term
            : view === 'term-list' && selectedCategory
            ? selectedCategory.name
            : <><span>GRAMA</span>TECH</>}
        </h1>
        {view !== 'word-detail' && (
          <div className="home-search-wrap">
            <span className="home-search-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="home-search"
              type="search"
              placeholder={view === 'term-list' ? `Search in ${selectedCategory?.name}…` : 'Search categories…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search"
            />
            <button className="home-search-clear" onClick={() => setSearch('')} aria-label="Clear search">×</button>
          </div>
        )}
      </div>

      {/* ── Breadcrumb ── */}
      {view !== 'categories' && (
        <div className="home-breadcrumb">
          <button className="btn-back" onClick={goToCategories}>← All Categories</button>
          {selectedCategory && (
            <>
              <span className="home-breadcrumb__sep">/</span>
              {view === 'word-detail'
                ? <button className="btn-back" onClick={goToTermList}>{selectedCategory.name}</button>
                : <span className="home-breadcrumb__current">{selectedCategory.name}</span>}
            </>
          )}
          {view === 'word-detail' && selectedWord && (
            <>
              <span className="home-breadcrumb__sep">/</span>
              <span className="home-breadcrumb__current">{selectedWord.term}</span>
            </>
          )}
        </div>
      )}

      {/* ── View: Category grid ── */}
      {view === 'categories' && (
        <div className="home-content">
          {loading ? (
            <div className="home-empty"><div className="home-spinner" /><p className="muted">Loading…</p></div>
          ) : filteredCategories.length === 0 ? (
            <div className="home-empty">
              <p className="muted">{q ? `No categories match "${search}"` : 'No categories yet.'}</p>
            </div>
          ) : (
            <ul className="category-grid" aria-label="Categories">
              {filteredCategories.map((c) => (
                <li key={c.id}>
                  <button className="category-card" onClick={() => openCategory(c)}>
                    <span className="category-card__icon" aria-hidden="true">{getCategoryIcon(c.id)}</span>
                    <span className="category-card__name">{c.name}</span>
                    <span className="category-card__arrow" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── View: Term list ── */}
      {view === 'term-list' && (
        <div className="home-content">
          {wordsLoading ? (
            <div className="home-empty"><div className="home-spinner" /><p className="muted">Loading entries…</p></div>
          ) : filteredWords.length === 0 ? (
            <div className="home-empty">
              <p className="muted">{q ? `No entries match "${search}"` : 'No entries in this category yet.'}</p>
            </div>
          ) : (
            <ul className="admin-term-list">
              {filteredWords.map((w) => (
                <li key={w.id} className="admin-term-item">
                  <button className="admin-term-item__main" onClick={() => openWord(w)}>
                    <span className="admin-term-item__term">{w.term}</span>
                    {w.bahagiNgPananalita && (
                      <span className="admin-term-item__badge">{w.bahagiNgPananalita}</span>
                    )}
                    <span className="admin-term-item__arrow">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── View: Word detail ── */}
      {view === 'word-detail' && selectedWord && (
        <div className="home-content">
          <div className="card word-detail-card">
            <WordEntryBody w={selectedWord} />
          </div>
        </div>
      )}

    </div>
  )
}
