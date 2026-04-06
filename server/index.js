import 'dotenv/config'
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { supabase } from './supabaseClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Env guards ────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env')
  process.exit(1)
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const PORT = parseInt(process.env.PORT || '3001', 10)

// ── File Uploads ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', 'uploads', 'audio')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) return cb(null, true)
    cb(new Error('Only audio files are allowed'))
  },
})

// ── Express App ───────────────────────────────────────────────────────────────
const app = express()
app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Auth Middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    let token = req.cookies?.token
    if (!token) {
      const auth = req.headers.authorization || ''
      if (auth.startsWith('Bearer ')) token = auth.slice(7)
    }
    if (!token) return res.status(401).json({ error: 'Not authenticated' })

    const payload = jwt.verify(token, JWT_SECRET)

    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (!session) return res.status(401).json({ error: 'Session expired' })

    req.adminId = payload.sub
    req.token = token
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Serializers ───────────────────────────────────────────────────────────────
function serializeWord(w) {
  return {
    id: w.id,
    categoryId: w.category_id,
    term: w.term,
    definition: w.definition ?? '',
    audioUrl: w.audio_url ?? '',
    paraanNgPagbigkas: w.paraan_ng_pagbigkas ?? '',
    bahagiNgPananalita: w.bahagi_ng_pananalita ?? '',
    kahulugangPangGramatika: w.kahulugang_pang_gramatika ?? '',
    salinSaIloko: w.salin_sa_iloko ?? '',
    salinSaKapampangan: w.salin_sa_kapampangan ?? '',
    halimbawaPangungusap: w.halimbawa_pangungusap ?? '',
    createdAt: new Date(w.created_at).getTime(),
  }
}

function serializeCategory(c) {
  return {
    id: c.id,
    name: c.name,
    createdAt: new Date(c.created_at).getTime(),
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const { error } = await supabase.from('categories').select('id').limit(1)
    res.json({ ok: !error, db: error ? 'error' : 'connected' })
  } catch {
    res.json({ ok: false, db: 'unreachable' })
  }
})

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const { data: admin } = await supabase
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle()

    if (!admin) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ sub: admin.id, role: 'admin' }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('sessions').insert({ admin_id: admin.id, token, expires_at: expiresAt })

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    res.json({ ok: true, username: admin.username })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await supabase.from('sessions').delete().eq('token', req.token)
  res.clearCookie('token')
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { data: admin } = await supabase
    .from('admins')
    .select('username')
    .eq('id', req.adminId)
    .maybeSingle()
  if (!admin) return res.status(404).json({ error: 'Admin not found' })
  res.json({ username: admin.username })
})

// ── Category Routes ───────────────────────────────────────────────────────────
app.get('/api/categories', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    res.json(data.map(serializeCategory))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (error) throw error
    res.status(201).json(serializeCategory(data))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    // Delete audio files for all words in this category
    const { data: words } = await supabase
      .from('words')
      .select('audio_url')
      .eq('category_id', req.params.id)
    for (const w of words ?? []) {
      if (w.audio_url) {
        const filePath = path.join(__dirname, '..', w.audio_url)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
    }
    // Words are deleted by cascade (FK on delete cascade)
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Word Routes ───────────────────────────────────────────────────────────────
app.get('/api/categories/:categoryId/words', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .order('created_at', { ascending: true })
    if (error) throw error
    res.json(data.map(serializeWord))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post(
  '/api/categories/:categoryId/words',
  requireAuth,
  upload.single('audio'),
  async (req, res) => {
    try {
      const {
        term,
        definition,
        paraanNgPagbigkas,
        bahagiNgPananalita,
        kahulugangPangGramatika,
        salinSaIloko,
        salinSaKapampangan,
        halimbawaPangungusap,
      } = req.body
      if (!term?.trim()) return res.status(400).json({ error: 'Term is required' })

      const audioUrl = req.file ? `/uploads/audio/${req.file.filename}` : ''

      const { data, error } = await supabase
        .from('words')
        .insert({
          category_id: req.params.categoryId,
          term: term.trim(),
          definition: definition || '',
          audio_url: audioUrl,
          paraan_ng_pagbigkas: paraanNgPagbigkas || '',
          bahagi_ng_pananalita: bahagiNgPananalita || '',
          kahulugang_pang_gramatika: kahulugangPangGramatika || '',
          salin_sa_iloko: salinSaIloko || '',
          salin_sa_kapampangan: salinSaKapampangan || '',
          halimbawa_pangungusap: halimbawaPangungusap || '',
        })
        .select()
        .single()
      if (error) throw error
      res.status(201).json(serializeWord(data))
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: 'Server error' })
    }
  },
)

app.delete('/api/categories/:categoryId/words/:id', requireAuth, async (req, res) => {
  try {
    const { data: word } = await supabase
      .from('words')
      .select('audio_url')
      .eq('id', req.params.id)
      .maybeSingle()
    if (word?.audio_url) {
      const filePath = path.join(__dirname, '..', word.audio_url)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    const { error } = await supabase.from('words').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.patch('/api/categories/:categoryId/words/:id', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const {
      term, definition, paraanNgPagbigkas, bahagiNgPananalita,
      kahulugangPangGramatika, salinSaIloko, salinSaKapampangan, halimbawaPangungusap,
      deleteAudio,
    } = req.body

    const updates = {}
    if (term !== undefined) updates.term = term.trim()
    if (definition !== undefined) updates.definition = definition
    if (paraanNgPagbigkas !== undefined) updates.paraan_ng_pagbigkas = paraanNgPagbigkas
    if (bahagiNgPananalita !== undefined) updates.bahagi_ng_pananalita = bahagiNgPananalita
    if (kahulugangPangGramatika !== undefined) updates.kahulugang_pang_gramatika = kahulugangPangGramatika
    if (salinSaIloko !== undefined) updates.salin_sa_iloko = salinSaIloko
    if (salinSaKapampangan !== undefined) updates.salin_sa_kapampangan = salinSaKapampangan
    if (halimbawaPangungusap !== undefined) updates.halimbawa_pangungusap = halimbawaPangungusap

    if (req.file) {
      // Replace audio: delete old file, save new
      const { data: existing } = await supabase.from('words').select('audio_url').eq('id', req.params.id).maybeSingle()
      if (existing?.audio_url) {
        const old = path.join(__dirname, '..', existing.audio_url)
        if (fs.existsSync(old)) fs.unlinkSync(old)
      }
      updates.audio_url = `/uploads/audio/${req.file.filename}`
    } else if (deleteAudio === 'true') {
      // Delete audio without replacement
      const { data: existing } = await supabase.from('words').select('audio_url').eq('id', req.params.id).maybeSingle()
      if (existing?.audio_url) {
        const old = path.join(__dirname, '..', existing.audio_url)
        if (fs.existsSync(old)) fs.unlinkSync(old)
      }
      updates.audio_url = null
    }

    const { data, error } = await supabase.from('words').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json(serializeWord(data))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Multer Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError || err?.message === 'Only audio files are allowed') {
    return res.status(400).json({ error: err.message })
  }
  next(err)
})

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  // Verify Supabase connection
  const { error } = await supabase.from('categories').select('id').limit(1)
  if (error) {
    console.error('[gramatech] Supabase connection failed:', error.message)
    process.exit(1)
  }
  console.log('[gramatech] Supabase connected')

  // Seed admin if none exist
  const { count } = await supabase
    .from('admins')
    .select('id', { count: 'exact', head: true })
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin'
    const password = process.env.ADMIN_PASSWORD || 'changeme'
    const passwordHash = await bcrypt.hash(password, 12)
    await supabase.from('admins').insert({ username: username.toLowerCase(), password_hash: passwordHash })
    console.log(`[gramatech] Seeded admin user: ${username}`)
  }

  const server = app.listen(PORT, () => {
    console.log(`[gramatech] API http://localhost:${PORT}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[gramatech] Port ${PORT} is already in use. Run: npx kill-port ${PORT}`)
    } else {
      console.error('[gramatech] Server error:', err)
    }
    process.exit(1)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
