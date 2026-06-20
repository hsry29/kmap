import { getSupabase, isSyncEnabled } from './supabaseClient'

import { KMAP_IMAGES_BUCKET } from './placeImageStorage'

export const PLACE_IMAGE_BUCKET = KMAP_IMAGES_BUCKET

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function extFromFile(file) {
  const name = String(file?.name ?? '').trim()
  const fromName = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName
  }
  const type = String(file?.type ?? '').toLowerCase()
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'jpg'
}

/** @returns {{ ok: true, publicUrl: string } | { ok: false, error: string }} */
export async function uploadPlaceImage(file) {
  if (!isSyncEnabled) {
    return {
      ok: false,
      error: 'Image upload needs Supabase (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).',
    }
  }
  const supabase = getSupabase()
  if (!supabase) {
    return { ok: false, error: 'Supabase client is not available.' }
  }
  if (!file || !(file instanceof Blob)) {
    return { ok: false, error: 'Choose an image file first.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Image must be 5 MB or smaller.' }
  }
  const mime = String(file.type ?? '').toLowerCase()
  if (mime && !ALLOWED_TYPES.has(mime)) {
    return { ok: false, error: 'Use JPG, PNG, WebP, or GIF.' }
  }

  const ext = extFromFile(file)
  const path = `places/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(PLACE_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: mime || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    upsert: false,
  })
  if (error) {
    const msg = String(error.message ?? error)
    if (/bucket/i.test(msg)) {
      return {
        ok: false,
        error: `Storage bucket "${PLACE_IMAGE_BUCKET}" not found. Run the storage section in supabase/schema.sql.`,
      }
    }
    return { ok: false, error: msg }
  }

  const { data } = supabase.storage.from(PLACE_IMAGE_BUCKET).getPublicUrl(path)
  const publicUrl = String(data?.publicUrl ?? '').trim()
  if (!publicUrl) {
    return { ok: false, error: 'Upload succeeded but public URL is missing.' }
  }
  return { ok: true, publicUrl }
}
