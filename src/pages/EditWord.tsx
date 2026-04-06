import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchCategories, fetchWords, updateWord } from '../api/glossaryApi'
import type { Category, GlossaryWord, WordFormFields } from '../types'
import { playWordEntry } from '../playWord'
import { mediaUrl } from '../mediaUrl'

function wordToForm(w: GlossaryWord): WordFormFields {
  return {
    term: w.term,
    definition: w.definition,
    paraanNgPagbigkas: w.paraanNgPagbigkas,
    bahagiNgPananalita: w.bahagiNgPananalita,
    kahulugangPangGramatika: w.kahulugangPangGramatika,
    salinSaIloko: w.salinSaIloko,
    salinSaKapampangan: w.salinSaKapampangan,
    halimbawaPangungusap: w.halimbawaPangungusap,
  }
}

export default function EditWord() {
  const { id, wordId } = useParams<{ id: string; wordId: string }>()
  const navigate = useNavigate()
  const [category, setCategory] = useState<Category | null>(null)
  const [word, setWord] = useState<GlossaryWord | null>(null)
  const [form, setForm] = useState<WordFormFields | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioKey, setAudioKey] = useState(0)
  const [deleteAudio, setDeleteAudio] = useState(false)
  const [replaceAudio, setReplaceAudio] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id || !wordId) return
    ;(async () => {
      try {
        const [cats, words] = await Promise.all([fetchCategories(), fetchWords(id)])
        const cat = cats.find((c) => c.id === id)
        const w = words.find((w) => w.id === wordId)
        if (!cat || !w) { navigate(`/category/${id}`, { replace: true }); return }
        setCategory(cat)
        setWord(w)
        setForm(wordToForm(w))
      } catch {
        navigate(`/category/${id}`, { replace: true })
      } finally {
        setLoading(false)
      }
    })()
  }, [id, wordId, navigate])

  const f = (key: keyof WordFormFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => prev ? ({ ...prev, [key]: e.target.value }) : prev)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !wordId || !form || !form.term.trim()) return
    setSaving(true)
    setError(null)
    try {
      await updateWord(id, wordId, form, audioFile, deleteAudio)
      navigate(`/category/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-empty" style={{ padding: '4rem' }}>
        <div className="home-spinner" />
      </div>
    )
  }

  if (!form || !word) return null

  return (
    <>
      <div className="admin-topbar">
        <div>
          <button className="btn-back" onClick={() => navigate(`/category/${id}`)}>
            ← {category?.name ?? 'Back'}
          </button>
          <h1 className="admin-topbar__title">Edit: {word.term}</h1>
          {category && <p className="admin-topbar__sub">{category.name}</p>}
        </div>
        {word.audioUrl && !deleteAudio && (
          <button className="btn" onClick={() => playWordEntry(word)}>▶ Play</button>
        )}
      </div>

      <div className="admin-content">
        <form className="admin-form card" onSubmit={handleSubmit}>
          {error && <p className="login-error" role="alert">{error}</p>}

          <div className="field-grid">
            <div className="field">
              <label>Term <span className="admin-required">*</span></label>
              <input className="input" required maxLength={500} autoFocus
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
                value={form.definition} onChange={f('definition')} />
            </div>
            <div className="field field--wide">
              <label>Audio File</label>
              {/* Has audio, not being replaced or deleted — show player + action buttons */}
              {word.audioUrl && !deleteAudio && !replaceAudio && (
                <>
                  <audio className="audio-preview" src={mediaUrl(word.audioUrl)} controls />
                  <div className="audio-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => { setReplaceAudio(true); setAudioKey((k) => k + 1) }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit audio
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-sm"
                      onClick={() => { setDeleteAudio(true); setAudioFile(null); setAudioKey((k) => k + 1) }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                      Delete audio
                    </button>
                  </div>
                </>
              )}

              {/* Replace mode — keep old audio preview, show picker for new file */}
              {word.audioUrl && replaceAudio && !deleteAudio && (
                <>
                  <audio className="audio-preview" src={mediaUrl(word.audioUrl)} controls />
                  <input key={audioKey} className="input input-file" type="file"
                    accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac"
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
                  {audioFile
                    ? <span className="file-picked">✓ {audioFile.name} (replaces existing)</span>
                    : <span className="muted file-hint">Choose a new file to replace the audio above</span>}
                  <button type="button" className="btn-link" style={{ marginTop: '0.35rem' }}
                    onClick={() => { setReplaceAudio(false); setAudioFile(null); setAudioKey((k) => k + 1) }}>
                    Cancel replace
                  </button>
                </>
              )}

              {/* Deleted or no audio — show file picker */}
              {(!word.audioUrl || deleteAudio) && (
                <>
                  {deleteAudio && (
                    <div className="audio-delete-notice">
                      <span>Audio will be removed on save.</span>
                      <button type="button" className="btn-link" onClick={() => { setDeleteAudio(false); setAudioFile(null); setAudioKey((k) => k + 1) }}>Undo</button>
                    </div>
                  )}
                  <input key={audioKey} className="input input-file" type="file"
                    accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.webm,.flac"
                    onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
                  {audioFile
                    ? <span className="file-picked">✓ {audioFile.name}</span>
                    : <span className="muted file-hint">mp3, m4a, aac, wav, ogg — max 20 MB</span>}
                </>
              )}
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
              {saving ? 'Saving…' : 'Update Entry'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
