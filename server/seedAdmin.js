import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { supabase } from './supabaseClient.js'

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'changeme'
  const passwordHash = await bcrypt.hash(password, 12)

  const { data, error } = await supabase
    .from('admins')
    .upsert({ username: username.toLowerCase(), password_hash: passwordHash }, { onConflict: 'username' })
    .select('username')
  if (error) throw error
  console.log('Admin upserted:', data?.[0]?.username)

  const { data: admins } = await supabase.from('admins').select('username, created_at')
  console.log('All admins:', admins?.map((a) => a.username))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
