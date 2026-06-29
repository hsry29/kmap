import { getSupabase, isSyncEnabled } from './supabaseClient'
import { normalizeImageKey } from './placeImageKeys'

export const KMAP_IMAGES_BUCKET = 'kmapimages'
export const NO_IMAGE_FILE = 'No_Image.jpg'

/**
 * Preferred Storage image version. When set to 2, `Photo_v2.jpg` is used if present;
 * otherwise falls back to `Photo.jpg`. Change to 3 for `_v3`, etc.
 */
export const KMAP_IMAGE_STORAGE_VERSION = 2

const IMAGE_FILE_RE = /\.(jpe?g|png|webp)$/i

/** @type {Map<string, string> | null} */
let storageFileIndex = null

/**
 * Pick the highest available `_vN` file in Storage, else the original filename.
 * @param {Map<string, string> | null | undefined} fileIndex
 * @param {string} fileName
 */
export function resolveStorageFileName(fileIndex, fileName) {
  const base = String(fileName ?? '').trim()
  if (!base || !fileIndex || KMAP_IMAGE_STORAGE_VERSION < 2) {
    return base
  }

  for (let version = KMAP_IMAGE_STORAGE_VERSION; version >= 2; version -= 1) {
    const candidate = buildVersionedStorageFileName(base, version)
    if (fileIndex.has(normalizeImageKey(candidate))) {
      return fileIndex.get(normalizeImageKey(candidate)) ?? candidate
    }
  }

  return base
}

/** @param {string} fileName @param {number} version */
function buildVersionedStorageFileName(fileName, version) {
  const match = String(fileName).match(/^(.+?)(\.(jpe?g|png|webp))$/i)
  if (!match) {
    return fileName
  }
  const baseStem = match[1].replace(/_v\d+$/i, '')
  return `${baseStem}_v${version}${match[2]}`
}

/** @param {string} fileName @param {Map<string, string> | null} [fileIndex] */
export function getStoragePublicUrl(fileName, fileIndex = storageFileIndex) {
  const name = resolveStorageFileName(fileIndex, String(fileName ?? '').trim())
  if (!name) {
    return ''
  }
  if (isSyncEnabled) {
    const supabase = getSupabase()
    if (supabase) {
      const { data } = supabase.storage.from(KMAP_IMAGES_BUCKET).getPublicUrl(name)
      return String(data?.publicUrl ?? '').trim()
    }
  }
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  if (!base) {
    return ''
  }
  const encoded = name.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${base}/storage/v1/object/public/${KMAP_IMAGES_BUCKET}/${encoded}`
}

/** @param {string[]} fileNames */
export function buildStorageFileIndex(fileNames) {
  /** @type {Map<string, string>} */
  const index = new Map()
  for (const rawName of fileNames ?? []) {
    const name = String(rawName ?? '').trim()
    if (!name || !IMAGE_FILE_RE.test(name)) {
      continue
    }
    const key = normalizeImageKey(name)
    if (key && !index.has(key)) {
      index.set(key, name)
    }
  }
  storageFileIndex = index
  return index
}

/** @returns {Promise<string[]>} */
export async function fetchStorageImageFileNames() {
  if (!isSyncEnabled) {
    return [NO_IMAGE_FILE]
  }
  const supabase = getSupabase()
  if (!supabase) {
    return [NO_IMAGE_FILE]
  }

  /** @type {string[]} */
  const names = []
  let offset = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase.storage.from(KMAP_IMAGES_BUCKET).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })
    if (error) {
      throw error
    }
    const batch = (data ?? []).filter((item) => item?.name && IMAGE_FILE_RE.test(item.name))
    names.push(...batch.map((item) => item.name))
    if (!data || data.length < limit) {
      break
    }
    offset += limit
  }

  if (!names.some((name) => normalizeImageKey(name) === normalizeImageKey(NO_IMAGE_FILE))) {
    names.push(NO_IMAGE_FILE)
  }
  return names
}

/** @param {Map<string, string>} fileIndex @param {string} label */
export function lookupStorageFileName(fileIndex, label) {
  const key = normalizeImageKey(label)
  if (!key || !fileIndex) {
    return ''
  }
  return fileIndex.get(key) ?? ''
}

export function isNoImageFileName(fileName) {
  return normalizeImageKey(fileName) === normalizeImageKey(NO_IMAGE_FILE)
}
