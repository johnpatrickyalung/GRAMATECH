import 'dotenv/config'
import mongoose from 'mongoose'
import { getMongoConnectOptions } from './mongoConnect.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gramatech'

async function main() {
  await mongoose.connect(MONGODB_URI, getMongoConnectOptions(MONGODB_URI))
  const db = mongoose.connection.db
  const existing = (await db.listCollections().toArray()).map((c) => c.name)
  const needed = ['admins', 'categories', 'words', 'sessions']
  for (const col of needed) {
    if (!existing.includes(col)) {
      await db.createCollection(col)
      console.log(`Created collection: ${col}`)
    } else {
      console.log(`Already exists: ${col}`)
    }
  }
  await mongoose.disconnect()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
