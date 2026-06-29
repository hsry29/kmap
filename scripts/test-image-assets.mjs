import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const COLS =
  'id, place_key, place_name, file_name, image_source, image_author, image_license, image_source_url, notes, is_active'

const envText = readFileSync('.env', 'utf8')
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) {
    process.env[m[1].trim()] = m[2].trim()
  }
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.log('No Supabase env configured')
  process.exit(0)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await sb
  .from('image_assets')
  .select(COLS)
  .eq('is_active', true)
  .limit(5)

if (error) {
  console.error('QUERY ERROR', error)
  process.exit(1)
}

console.log('OK rows:', data?.length ?? 0)
console.log(JSON.stringify(data, null, 2))
