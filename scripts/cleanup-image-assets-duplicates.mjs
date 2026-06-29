/**
 * Remove duplicate image_assets rows (same place_key / place_name).
 * Keeps the most complete row; tie-break by id (desc).
 *
 * Usage:
 *   node scripts/cleanup-image-assets-duplicates.mjs
 *   node scripts/cleanup-image-assets-duplicates.mjs --dry-run
 *
 * Requires .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Run supabase/migrations/20250622120000_image_assets_id_place_key.sql first on production DB.
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const COLS =
  'id, place_key, place_name, file_name, image_source, image_author, image_license, image_source_url, notes, is_active'

const dryRun = process.argv.includes('--dry-run')

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
    // .env optional if vars already exported
  }
}

function deriveImageAssetPlaceKey(placeName) {
  return String(placeName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function completenessScore(row) {
  const fields = [
    'file_name',
    'image_author',
    'image_source',
    'image_license',
    'image_source_url',
    'notes',
  ]
  let score = 0
  for (const key of fields) {
    if (String(row[key] ?? '').trim()) {
      score += 1
    }
  }
  return score
}

function groupKey(row) {
  return String(row.place_key ?? '').trim() || deriveImageAssetPlaceKey(row.place_name)
}

function pickKeeper(rows) {
  return [...rows].sort((a, b) => {
    const scoreDiff = completenessScore(b) - completenessScore(a)
    if (scoreDiff !== 0) {
      return scoreDiff
    }
    return String(b.id).localeCompare(String(a.id))
  })[0]
}

loadEnv()

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })
const { data, error } = await sb.from('image_assets').select(COLS)

if (error) {
  console.error('Query failed:', error.message)
  if (error.message.includes('place_key') || error.message.includes('id')) {
    console.error(
      'Hint: run supabase/migrations/20250622120000_image_assets_id_place_key.sql in Supabase SQL Editor first.',
    )
  }
  process.exit(1)
}

const rows = data ?? []
/** @type {Map<string, typeof rows>} */
const groups = new Map()

for (const row of rows) {
  const keyName = groupKey(row)
  if (!keyName) {
    console.warn('Skipping row without place_key/place_name:', row.id)
    continue
  }
  if (!groups.has(keyName)) {
    groups.set(keyName, [])
  }
  groups.get(keyName).push(row)
}

/** @type {string[]} */
const toDelete = []
const duplicateGroups = []

for (const [keyName, group] of groups.entries()) {
  if (group.length <= 1) {
    continue
  }
  const keeper = pickKeeper(group)
  const removed = group.filter((row) => row.id !== keeper.id)
  duplicateGroups.push({ keyName, keeper, removed })
  for (const row of removed) {
    toDelete.push(row.id)
  }
}

const gyeongbok = duplicateGroups.filter(
  (g) =>
    g.keyName === 'gyeongbokgung-palace' ||
    /gyeongbokgung/i.test(g.keeper.place_name ?? ''),
)

console.log(`Total rows: ${rows.length}`)
console.log(`Duplicate groups: ${duplicateGroups.length}`)
console.log(`Rows to delete: ${toDelete.length}`)

if (gyeongbok.length) {
  console.log('\nGyeongbokgung Palace duplicate cleanup:')
  for (const g of gyeongbok) {
    console.log(`  keep id=${g.keeper.id} place_key=${g.keyName} score=${completenessScore(g.keeper)}`)
    for (const row of g.removed) {
      console.log(`  delete id=${row.id} score=${completenessScore(row)}`)
    }
  }
}

if (duplicateGroups.length === 0) {
  console.log('\nNo duplicates found.')
  process.exit(0)
}

if (dryRun) {
  console.log('\nDry run — no rows deleted.')
  process.exit(0)
}

const { error: deleteError } = await sb.from('image_assets').delete().in('id', toDelete)
if (deleteError) {
  console.error('Delete failed:', deleteError.message)
  process.exit(1)
}

console.log(`\nDeleted ${toDelete.length} duplicate row(s).`)
