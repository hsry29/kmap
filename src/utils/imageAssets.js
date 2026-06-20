import { getSupabase, isSyncEnabled } from './supabaseClient'
import { normalizeImageKey } from './placeImageKeys'

const DEBUG_PREFIX = '[KMap image_assets]'

/** Actual Supabase columns (no id / created_at). */
export const IMAGE_ASSET_SELECT_COLUMNS =
  'place_name, file_name, image_source, image_author, image_license, image_source_url, notes, is_active'

/** @typedef {{
 *   place_name: string
 *   file_name: string
 *   image_source: string
 *   image_author: string
 *   image_license: string
 *   image_source_url: string
 *   notes: string
 *   is_active: boolean
 * }} ImageAssetRow */

function normalizeRow(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  return {
    place_name: String(src.place_name ?? '').trim(),
    file_name: String(src.file_name ?? '').trim(),
    image_source: String(src.image_source ?? '').trim(),
    image_author: String(src.image_author ?? '').trim(),
    image_license: String(src.image_license ?? '').trim(),
    image_source_url: String(src.image_source_url ?? '').trim(),
    notes: String(src.notes ?? '').trim(),
    is_active: src.is_active !== false,
  }
}

function isValidRow(row) {
  return Boolean(row.place_name || row.file_name)
}

/** Stable React/admin key without id column. */
export function imageAssetRowKey(row) {
  const place = normalizeImageKey(row?.place_name)
  const file = normalizeImageKey(row?.file_name)
  if (place && file) {
    return `${place}::${file}`
  }
  return place || file || ''
}

function matchQuery(query, row) {
  const place = String(row.place_name ?? '').trim()
  const file = String(row.file_name ?? '').trim()
  if (place && file) {
    return query.eq('place_name', place).eq('file_name', file)
  }
  if (place) {
    return query.eq('place_name', place)
  }
  if (file) {
    return query.eq('file_name', file)
  }
  throw new Error('Cannot match image_assets row without place_name or file_name.')
}

/** @returns {Promise<ImageAssetRow[]>} */
export async function fetchImageAssets() {
  if (!isSyncEnabled) {
    console.debug(
      `${DEBUG_PREFIX} Skipped: Supabase env not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).`,
    )
    return []
  }
  const supabase = getSupabase()
  if (!supabase) {
    console.error(`${DEBUG_PREFIX} Failed to load metadata: Supabase client is null.`)
    return []
  }

  const { data, error } = await supabase
    .from('image_assets')
    .select(IMAGE_ASSET_SELECT_COLUMNS)
    .eq('is_active', true)
    .order('place_name', { ascending: true })

  if (error) {
    console.error(`${DEBUG_PREFIX} Failed to load metadata:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      query: `select ${IMAGE_ASSET_SELECT_COLUMNS} from image_assets where is_active = true`,
    })
    throw error
  }

  const rows = (data ?? []).map(normalizeRow).filter(isValidRow)
  console.debug(`${DEBUG_PREFIX} Loaded ${rows.length} active row(s).`, {
    placeNames: rows.slice(0, 5).map((row) => row.place_name),
    total: rows.length,
  })
  return rows
}

/** Admin list — includes inactive rows. */
export async function fetchAllImageAssets() {
  if (!isSyncEnabled) {
    return []
  }
  const supabase = getSupabase()
  if (!supabase) {
    return []
  }
  const { data, error } = await supabase
    .from('image_assets')
    .select(IMAGE_ASSET_SELECT_COLUMNS)
    .order('place_name', { ascending: true })
  if (error) {
    throw error
  }
  return (data ?? []).map(normalizeRow).filter(isValidRow)
}

/** @param {ImageAssetRow[]} rows */
export function buildImageAssetsIndex(rows) {
  /** @type {Map<string, ImageAssetRow>} */
  const byPlaceKey = new Map()
  /** @type {Map<string, ImageAssetRow>} */
  const byFileKey = new Map()

  for (const row of rows ?? []) {
    if (!row.is_active) {
      continue
    }
    const placeKey = normalizeImageKey(row.place_name)
    if (placeKey && !byPlaceKey.has(placeKey)) {
      byPlaceKey.set(placeKey, row)
    }
    const fileKey = normalizeImageKey(row.file_name)
    if (fileKey && !byFileKey.has(fileKey)) {
      byFileKey.set(fileKey, row)
    }
  }

  return { byPlaceKey, byFileKey, rows: rows ?? [] }
}

/**
 * Metadata lookup for Photo Credit.
 * Priority: place_name → file_name (storage file) → file_name (via linked place_name).
 */
export function resolvePlaceImageAsset(place, catalogState, resolvedFileName = '') {
  if (!catalogState) {
    return { asset: null, matchedBy: null }
  }

  const names = collectPlaceNameCandidates(place)

  for (const name of names) {
    const placeKey = normalizeImageKey(name)
    if (placeKey && catalogState.assetsByPlaceKey.has(placeKey)) {
      return { asset: catalogState.assetsByPlaceKey.get(placeKey) ?? null, matchedBy: 'place_name' }
    }
  }

  const storageFile = String(resolvedFileName ?? '').trim()
  if (storageFile) {
    const fileKey = normalizeImageKey(storageFile)
    if (fileKey && catalogState.assetsByFileKey.has(fileKey)) {
      return { asset: catalogState.assetsByFileKey.get(fileKey) ?? null, matchedBy: 'file_name' }
    }
  }

  for (const asset of catalogState.assets ?? []) {
    if (!asset.file_name) {
      continue
    }
    const linkedToPlace = names.some(
      (name) => normalizeImageKey(name) === normalizeImageKey(asset.place_name),
    )
    if (linkedToPlace) {
      return { asset, matchedBy: 'file_name' }
    }
  }

  for (const name of names) {
    const fileKey = normalizeImageKey(name)
    if (fileKey && catalogState.assetsByFileKey.has(fileKey)) {
      return { asset: catalogState.assetsByFileKey.get(fileKey) ?? null, matchedBy: 'file_name' }
    }
  }

  return { asset: null, matchedBy: null }
}

function collectPlaceNameCandidates(place) {
  const src = place && typeof place === 'object' ? place : {}
  const raw = [src.place_name, src.placeName, src.enName, src.name]
  const seen = new Set()
  /** @type {string[]} */
  const out = []
  for (const value of raw) {
    const text = String(value ?? '').trim()
    const key = normalizeImageKey(text)
    if (!text || !key || seen.has(key)) {
      continue
    }
    seen.add(key)
    out.push(text)
  }
  return out
}

/** @param {ImageAssetRow | null | undefined} asset */
export function hasImageCredit(asset) {
  if (!asset) {
    return false
  }
  return Boolean(
    asset.image_author ||
      asset.image_source ||
      asset.image_license ||
      asset.image_source_url,
  )
}

/** @param {ImageAssetRow | null | undefined} asset */
export function formatImageCredit(asset) {
  if (!asset || !hasImageCredit(asset)) {
    return null
  }
  return {
    author: asset.image_author,
    source: asset.image_source,
    authorLine: [asset.image_author, asset.image_source].filter(Boolean).join(' / '),
    license: asset.image_license,
    sourceUrl: asset.image_source_url,
  }
}

/** @param {Partial<ImageAssetRow>} payload */
export async function createImageAsset(payload) {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  const row = normalizeRow(payload)
  if (!isValidRow(row)) {
    throw new Error('place_name or file_name is required.')
  }
  const { data, error } = await supabase
    .from('image_assets')
    .insert({
      place_name: row.place_name,
      file_name: row.file_name,
      image_source: row.image_source,
      image_author: row.image_author,
      image_license: row.image_license,
      image_source_url: row.image_source_url,
      notes: row.notes,
      is_active: row.is_active,
    })
    .select(IMAGE_ASSET_SELECT_COLUMNS)
    .single()
  if (error) {
    throw error
  }
  return normalizeRow(data)
}

/** @param {ImageAssetRow} original @param {Partial<ImageAssetRow>} patch */
export async function updateImageAsset(original, patch) {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  const updates = {}
  if (patch.place_name !== undefined) updates.place_name = String(patch.place_name).trim()
  if (patch.file_name !== undefined) updates.file_name = String(patch.file_name).trim()
  if (patch.image_source !== undefined) updates.image_source = String(patch.image_source).trim()
  if (patch.image_author !== undefined) updates.image_author = String(patch.image_author).trim()
  if (patch.image_license !== undefined) updates.image_license = String(patch.image_license).trim()
  if (patch.image_source_url !== undefined) {
    updates.image_source_url = String(patch.image_source_url).trim()
  }
  if (patch.notes !== undefined) updates.notes = String(patch.notes).trim()
  if (patch.is_active !== undefined) updates.is_active = patch.is_active

  const { data, error } = await matchQuery(
    supabase.from('image_assets').update(updates),
    original,
  )
    .select(IMAGE_ASSET_SELECT_COLUMNS)
    .single()
  if (error) {
    throw error
  }
  return normalizeRow(data)
}

/** @param {ImageAssetRow} row */
export async function deleteImageAsset(row) {
  const supabase = getSupabase()
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  const { error } = await matchQuery(supabase.from('image_assets').delete(), row)
  if (error) {
    throw error
  }
}
