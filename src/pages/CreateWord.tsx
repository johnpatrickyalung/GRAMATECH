import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createWord, fetchCategories } from '../api/glossaryApi'
import type { Category, WordFormFields } from '../types'

function emptyForm(): WordFormFields {
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

export default function CreateWord() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<WordFormFields>(emptyForm())
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetchCategories()
      .then((cats) => {
        const cat = cats.find((c) => c.id === id)
        if (!cat) navigate('/category', { replace: true })
        else setCategory(cat)
      })
      .catch(() => navigate('/category', { replace: true }))
  }, [id, navigate])

  const f = (key: keyof WordFormFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !form.term.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createWord(id, form, audioFile)
      navigate(`/category/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <button className="btn-back" onClick={() => navigate(`/category/${id}`)}>
            ← {category?.name ?? 'Back'}
          </button>
          <h1 className="admin-topbar__title">New Entry</h1>
          {category && <p className="admin-topbar__sub">Adding to: {category.name}</p>}
        </div>
      </div>

      <div className="admin-content">
        <form className="admin-form card" onSubmit={handleSubmit}>
          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="field-grid">
            <div className="field">
              <label>Term <span className="admin-required">*</span></label>
              <input className="input" autoFocus required maxLength={500}
                placeholder="Ilagay ang salita o termino"
                value={form.term} onChange={f('term')} />
            </div>
            <div className="field">
              <label>Bahagi ng Pananalita</label>
              <input className="input" maxLength={2000}
                value={form.bahagiNgPananalita} onChange={f('bahagiNgPananalita')} />
            </div>
            <div className="field field--wide">
              <label>Definition</label>
              <textarea className="input textarea" rows={3} maxLength={8000}
                placeholder="Kahulugan ng termino"
                value={form.definition} onChange={f('definition')} />
            </div>
            <div className="field field--wide">
              <label>Audio File</label>
              <input key={audioKey} className="input input-file" type="file"
                accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac"
                onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
              {audioFile
                ? <span className="file-picked">✓ {audioFile.name}</span>
                : <span className="muted file-hint">mp3, m4a, wav, ogg, webm</span>}
            </div>
            <div className="field field--wide">
              <label>Paraan ng Pagbigkas</label>
              <textarea className="input textarea" rows={2} maxLength={4000}
                value={form.paraanNgPagbigkas} onChange={f('paraanNgPagbigkas')} />
            </div>
            <div className="field field--wide">
              <label>Kahulugang Pang-gramatika</label>
              <textarea className="input textarea" rows={3} maxLength={8000}
                value={form.kahulugangPangGramatika} onChange={f('kahulugangPangGramatika')} />
            </div>
            <div className="field">
              <label>Salin sa Iloko</label>
              <textarea className="input textarea" rows={2} maxLength={4000}
                value={form.salinSaIloko} onChange={f('salinSaIloko')} />
            </div>
            <div className="field">
              <label>Salin sa Kapampangan</label>
              <textarea className="input textarea" rows={2} maxLength={4000}
                value={form.salinSaKapampangan} onChange={f('salinSaKapampangan')} />
            </div>
            <div className="field field--wide">
              <label>Halimbawa sa Pangungusap (Filipino, Iloko, Kapampangan)</label>
              <textarea className="input textarea" rows={5} maxLength={16000}
                placeholder="Pwedeng maglagay ng halimbawa sa tatlong wika…"
                value={form.halimbawaPangungusap} onChange={f('halimbawaPangungusap')} />
            </div>
          </div>

          <div className="admin-form__actions">
            <button type="button" className="btn" onClick={() => navigate(`/category/${id}`)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
