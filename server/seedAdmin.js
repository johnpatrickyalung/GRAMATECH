import 'dotenv/config'

if (process.env.MONGODB_TLS_RELAXED === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { getMongoConnectOptions } from './mongoConnect.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gramatech'

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
})
const Admin = mongoose.model('Admin', adminSchema)

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoConnectOptions(MONGODB_URI))
  console.log('Connected to MongoDB')

  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'changeme'
  const passwordHash = await bcrypt.hash(password, 12)

  await Admin.findOneAndUpdate(
    { username: username.toLowerCase() },
    { username: username.toLowerCase(), passwordHash },
    { upsert: true, new: true },
  )
  console.log(`Admin upserted: ${username}`)

  const admins = await Admin.find().select('username createdAt')
  console.log('All admins:', admins.map((a) => a.username))

  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
