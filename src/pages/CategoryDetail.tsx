import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteWord, fetchCategories, fetchWords } from '../api/glossaryApi'
import type { Category, GlossaryWord } from '../types'

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(null)
  const [words, setWords] = useState<GlossaryWord[]>([])
  const [loading, setLoading] = useState(true)

  const loadWords = async () => {
    if (!id) return
    const w = await fetchWords(id)
    setWords(w)
  }

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      try {
        const cats = await fetchCategories()
        const cat = cats.find((c) => c.id === id)
        if (!cat) { navigate('/category'); return }
        setCategory(cat)
        await loadWords()
      } finally { setLoading(false) }
    })()
  }, [id])

  const handleDelete = async (w: GlossaryWord) => {
    if (!id || !confirm(`Delete "${w.term}"?`)) return
    await deleteWord(id, w.id)
    await loadWords()
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <button className="btn-back" onClick={() => navigate('/category')}>← Categories</button>
          <h1 className="admin-topbar__title">{category?.name ?? '…'}</h1>
          <p className="admin-topbar__sub">{words.length} {words.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/category/${id}/create`)}>+ Add Entry</button>
      </div>

      <div className="admin-content">
        {loading ? (
          <div className="admin-empty"><div className="home-spinner" /></div>
        ) : words.length === 0 ? (
          <div className="admin-empty">
            <p className="muted">No entries yet.</p>
            <button className="btn btn-primary" onClick={() => navigate(`/category/${id}/create`)}>+ Add first entry</button>
          </div>
        ) : (
          <ul className="admin-term-list">
            {words.map((w) => (
              <li key={w.id} className="admin-term-item">
                <button
                  className="admin-term-item__main"
                  onClick={() => navigate(`/category/${id}/${w.id}`)}
                >
                  <span className="admin-term-item__term">{w.term}</span>
                  {w.bahagiNgPananalita && (
                    <span className="admin-term-item__badge">{w.bahagiNgPananalita}</span>
                  )}
                  <span className="admin-term-item__arrow">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </span>
                </button>
                <button className="admin-cat-item__delete" title="Delete"
                  onClick={() => void handleDelete(w)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
