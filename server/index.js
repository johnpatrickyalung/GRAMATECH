import 'dotenv/config'

if (process.env.MONGODB_TLS_RELAXED === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  console.log('listening to TLS relaxed')
}

import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getMongoConnectOptions, isAtlasUri } from './mongoConnect.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Env guards ──────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env')
  process.exit(1)
}
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gramatech'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const PORT = parseInt(process.env.PORT || '3001', 10)

// ── Mongoose Schemas ─────────────────────────────────────────────────────────
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})
const Admin = mongoose.model('Admin', adminSchema)

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
})
const Category = mongoose.model('Category', categorySchema)

const wordSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  term: { type: String, required: true, trim: true },
  definition: { type: String, default: '' },
  audioUrl: { type: String, default: '' },
  paraanNgPagbigkas: { type: String, default: '' },
  bahagiNgPananalita: { type: String, default: '' },
  kahulugangPangGramatika: { type: String, default: '' },
  salinSaIloko: { type: String, default: '' },
  salinSaKapampangan: { type: String, default: '' },
  halimbawaPangungusap: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
})
const Word = mongoose.model('Word', wordSchema)

const sessionSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
})
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
const Session = mongoose.model('Session', sessionSchema)

// ── File Uploads ─────────────────────────────────────────────────────────────
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
    const session = await Session.findOne({ token })
    if (!session) return res.status(401).json({ error: 'Session expired' })

    req.adminId = payload.sub
    req.token = token
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────
function serializeWord(w) {
  return {
    id: w._id.toString(),
    categoryId: w.categoryId.toString(),
    term: w.term,
    definition: w.definition,
    audioUrl: w.audioUrl,
    paraanNgPagbigkas: w.paraanNgPagbigkas,
    bahagiNgPananalita: w.bahagiNgPananalita,
    kahulugangPangGramatika: w.kahulugangPangGramatika,
    salinSaIloko: w.salinSaIloko,
    salinSaKapampangan: w.salinSaKapampangan,
    halimbawaPangungusap: w.halimbawaPangungusap,
    createdAt: w.createdAt.getTime(),
  }
}

function serializeCategory(c) {
  return {
    id: c._id.toString(),
    name: c.name,
    createdAt: c.createdAt.getTime(),
  }
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  const state = mongoose.connection.readyState
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' }
  res.json({ ok: state === 1, db: states[state] ?? 'unknown' })
})

// ── Auth Routes ───────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const admin = await Admin.findOne({ username: username.toLowerCase().trim() })
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ sub: admin._id.toString(), role: 'admin' }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await Session.create({ adminId: admin._id, token, expiresAt })

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
  await Session.deleteOne({ token: req.token })
  res.clearCookie('token')
  res.json({ ok: true })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.adminId).select('username')
  if (!admin) return res.status(404).json({ error: 'Admin not found' })
  res.json({ username: admin.username })
})

// ── Category Routes ───────────────────────────────────────────────────────────
app.get('/api/categories', async (_req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: 1 })
    res.json(categories.map(serializeCategory))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/categories', requireAuth, async (req, res) => {
  try {
    const { name } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
    const cat = await Category.create({ name: name.trim() })
    res.status(201).json(serializeCategory(cat))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    const words = await Word.find({ categoryId: req.params.id })
    for (const w of words) {
      if (w.audioUrl) {
        const filePath = path.join(__dirname, '..', w.audioUrl)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      }
    }
    await Word.deleteMany({ categoryId: req.params.id })
    await Category.findByIdAndDelete(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// ── Word Routes ───────────────────────────────────────────────────────────────
app.get('/api/categories/:categoryId/words', async (req, res) => {
  try {
    const words = await Word.find({ categoryId: req.params.categoryId }).sort({ createdAt: 1 })
    res.json(words.map(serializeWord))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/categories/:categoryId/words', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const { term, definition, paraanNgPagbigkas, bahagiNgPananalita, kahulugangPangGramatika, salinSaIloko, salinSaKapampangan, halimbawaPangungusap } = req.body
    if (!term?.trim()) return res.status(400).json({ error: 'Term is required' })

    const audioUrl = req.file ? `/uploads/audio/${req.file.filename}` : ''

    const word = await Word.create({
      categoryId: req.params.categoryId,
      term: term.trim(),
      definition: definition || '',
      audioUrl,
      paraanNgPagbigkas: paraanNgPagbigkas || '',
      bahagiNgPananalita: bahagiNgPananalita || '',
      kahulugangPangGramatika: kahulugangPangGramatika || '',
      salinSaIloko: salinSaIloko || '',
      salinSaKapampangan: salinSaKapampangan || '',
      halimbawaPangungusap: halimbawaPangungusap || '',
    })
    res.status(201).json(serializeWord(word))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

app.delete('/api/categories/:categoryId/words/:id', requireAuth, async (req, res) => {
  try {
    const word = await Word.findByIdAndDelete(req.params.id)
    if (word?.audioUrl) {
      const filePath = path.join(__dirname, '..', word.audioUrl)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    res.json({ ok: true })
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

// ── MongoDB Connect ───────────────────────────────────────────────────────────
async function connectWithRetry(uri, opts, maxRetries = 5) {
  const atlas = isAtlasUri(uri)
  const max = atlas ? maxRetries : 1
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      await mongoose.connect(uri, opts)
      return
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (attempt < max) {
        const wait = attempt * 4000
        console.error(`[gramatech] MongoDB connect attempt ${attempt}/${max} failed (${msg.slice(0, 80)}…), waiting ${wait}ms…`)
        await new Promise((r) => setTimeout(r, wait))
      } else {
        throw err
      }
    }
  }
}

// ── Seed Admin ────────────────────────────────────────────────────────────────
async function seedAdmin() {
  const count = await Admin.countDocuments()
  if (count > 0) return
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'changeme'
  const passwordHash = await bcrypt.hash(password, 12)
  await Admin.create({ username: username.toLowerCase(), passwordHash })
  console.log(`[gramatech] Seeded admin user: ${username}`)
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = getMongoConnectOptions(MONGODB_URI)
  await connectWithRetry(MONGODB_URI, opts)
  console.log(`[gramatech] MongoDB connected (${isAtlasUri(MONGODB_URI) ? 'Atlas' : 'local'})`)
  await seedAdmin()
  app.listen(PORT, () => {
    console.log(`[gramatech] API http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
