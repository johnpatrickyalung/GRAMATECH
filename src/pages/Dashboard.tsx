import { useEffect, useState } from 'react'
import { fetchCategories, fetchWords } from '../api/glossaryApi'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()
  const [categoryCount, setCategoryCount] = useState<number | null>(null)
  const [wordCount, setWordCount] = useState<number | null>(null)

  useEffect(() => {
    fetchCategories().then(async (cats) => {
      setCategoryCount(cats.length)
      const counts = await Promise.all(cats.map((c) => fetchWords(c.id).then((w) => w.length)))
      setWordCount(counts.reduce((a, b) => a + b, 0))
    }).catch(() => {})
  }, [])

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-topbar__title">Welcome back, {user?.username} 👋</h1>
          <p className="admin-topbar__sub">Here's an overview of your glossary</p>
        </div>
      </div>
      <div className="admin-content">
        <div className="dash-stats">
          <div className="dash-stat-card">
            <span className="dash-stat-card__icon">🗂️</span>
            <div>
              <p className="dash-stat-card__value">{categoryCount ?? '—'}</p>
              <p className="dash-stat-card__label">Categories</p>
            </div>
          </div>
          <div className="dash-stat-card">
            <span className="dash-stat-card__icon">📝</span>
            <div>
              <p className="dash-stat-card__value">{wordCount ?? '—'}</p>
              <p className="dash-stat-card__label">Total Entries</p>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
