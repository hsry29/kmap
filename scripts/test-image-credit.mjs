/**
 * Verifies image_assets fetch + Photo Credit resolution against live Supabase.
 * Run: node scripts/test-image-credit.mjs
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const COLS =
  'place_name, file_name, image_source, image_author, image_license, image_source_url, notes, is_active'

function loadEnv() {
  try {
    const envText = readFileSync('.env', 'utf8')
    for (const line of envText.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) {
        process.env[m[1].trim()] = m[2].trim()
      }
    }
  } catch {
    /* ignore */
  }
}

function normalizeImageKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|gif)$/i, '')
    .replace(/[_\-\s]+/g, '')
}

function buildIndex(rows) {
  const byPlaceKey = new Map()
  const byFileKey = new Map()
  for (const row of rows) {
    if (row.is_active === false) continue
    const placeKey = normalizeImageKey(row.place_name)
    if (placeKey && !byPlaceKey.has(placeKey)) byPlaceKey.set(placeKey, row)
    const fileKey = normalizeImageKey(row.file_name)
    if (fileKey && !byFileKey.has(fileKey)) byFileKey.set(fileKey, row)
  }
  return { byPlaceKey, byFileKey, rows }
}

function resolvePlaceImageAsset(place, catalog, resolvedFileName = '') {
  const names = [place.place_name, place.enName, place.name].filter(Boolean)
  for (const name of names) {
    const key = normalizeImageKey(name)
    if (key && catalog.byPlaceKey.has(key)) {
      return { asset: catalog.byPlaceKey.get(key), matchedBy: 'place_name' }
    }
  }
  if (resolvedFileName) {
    const key = normalizeImageKey(resolvedFileName)
    if (key && catalog.byFileKey.has(key)) {
      return { asset: catalog.byFileKey.get(key), matchedBy: 'file_name' }
    }
  }
  for (const name of names) {
    const key = normalizeImageKey(name)
    if (key && catalog.byFileKey.has(key)) {
      return { asset: catalog.byFileKey.get(key), matchedBy: 'file_name' }
    }
  }
  return { asset: null, matchedBy: null }
}

function formatImageCredit(asset) {
  if (!asset) return null
  const has =
    asset.image_author || asset.image_source || asset.image_license || asset.image_source_url
  if (!has) return null
  return {
    authorLine: [asset.image_author, asset.image_source].filter(Boolean).join(' / '),
    license: asset.image_license,
    sourceUrl: asset.image_source_url,
  }
}

loadEnv()

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('FAIL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set in .env')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await sb
  .from('image_assets')
  .select(COLS)
  .eq('is_active', true)
  .order('place_name', { ascending: true })

if (error) {
  console.error('FAIL: image_assets query error', error)
  process.exit(1)
}

const rows = data ?? []
console.log(`OK: fetched ${rows.length} active row(s)`)
if (rows.length === 0) {
  console.warn('WARN: no rows — add test data in Supabase image_assets')
  process.exit(0)
}

console.log('Sample row:', JSON.stringify(rows[0], null, 2))

const catalog = buildIndex(rows)
console.log(`Index: ${catalog.byPlaceKey.size} place key(s), ${catalog.byFileKey.size} file key(s)`)

const testPlace = { enName: 'Gyeongbokgung Palace', place_name: 'Gyeongbokgung Palace' }
const { asset, matchedBy } = resolvePlaceImageAsset(testPlace, catalog, 'Gyeongbokgung_Palace.jpg')
const credit = formatImageCredit(asset)

console.log('\n--- Photo Credit test (Gyeongbokgung Palace) ---')
console.log('matchedBy:', matchedBy ?? '(none)')
if (!asset) {
  console.error('FAIL: no metadata matched for Gyeongbokgung Palace')
  process.exit(1)
}
if (!credit) {
  console.error('FAIL: metadata found but credit fields empty')
  process.exit(1)
}

console.log('Photo credit:')
console.log(' ', credit.authorLine)
console.log(' ', credit.license ? `(${credit.license.trim()})` : '')
console.log(' ', credit.sourceUrl ? `→ ${credit.sourceUrl}` : '')
console.log('\nPASS: Photo Credit would display on Place Detail Card')
