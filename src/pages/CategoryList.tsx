import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCategory, deleteCategory, fetchCategories } from '../api/glossaryApi'
import type { Category } from '../types'

export default function CategoryList() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setCategories(await fetchCategories()) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createCategory(name.trim())
      setName('')
      setShowForm(false)
      await load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}" and all its entries?`)) return
    await deleteCategory(cat.id)
    await load()
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-topbar__title">Categories</h1>
          <p className="admin-topbar__sub">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Category</button>
      </div>

      <div className="admin-content">
        {showForm && (
          <form className="admin-form card" onSubmit={handleCreate} style={{ maxWidth: 480, marginBottom: '1.5rem' }}>
            <h3 className="card-title">New Category</h3>
            <div className="field">
              <label htmlFor="cat-name">Category Name</label>
              <input id="cat-name" className="input" autoFocus required
                placeholder="e.g. Mga Salitang Panggramatika"
                value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </div>
            <div className="admin-form__actions">
              <button type="button" className="btn" onClick={() => { setShowForm(false); setName('') }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="admin-empty"><div className="home-spinner" /></div>
        ) : categories.length === 0 ? (
          <div className="admin-empty">
            <p className="muted">No categories yet.</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Create your first category</button>
          </div>
        ) : (
          <ul className="admin-cat-list">
            {categories.map((c) => (
              <li key={c.id} className="admin-cat-item">
                <button className="admin-cat-item__main" onClick={() => navigate(`/category/${c.id}`)}>
                  <span className="admin-cat-item__icon">🗂️</span>
                  <span className="admin-cat-item__name">{c.name}</span>
                  <span className="admin-cat-item__arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </span>
                </button>
                <button className="admin-cat-item__delete" title={`Delete ${c.name}`}
                  onClick={() => void handleDelete(c)}>
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
