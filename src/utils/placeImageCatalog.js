import { buildImageAssetsIndex, fetchImageAssets, resolvePlaceImageAsset } from './imageAssets'
import {
  buildStorageFileIndex,
  fetchStorageImageFileNames,
  getStoragePublicUrl,
  isNoImageFileName,
  lookupStorageFileName,
  NO_IMAGE_FILE,
} from './placeImageStorage'
import { resolvePlaceImageUrl } from './placeImage'
import { normalizeImageKey } from './placeImageKeys'

/** @typedef {import('./imageAssets').ImageAssetRow} ImageAssetRow */

/** @typedef {{
 *   url: string
 *   fileName: string
 *   source: 'storage' | 'csv' | 'no_image'
 *   isNoImage: boolean
 *   asset: ImageAssetRow | null
 *   creditMatchedBy: 'place_name' | 'file_name' | null
 * }} ResolvedPlaceImage */

const DEBUG_PREFIX = '[KMap image_assets]'

const emptyCatalog = {
  ready: false,
  fileIndex: new Map(),
  assetsByPlaceKey: new Map(),
  assetsByFileKey: new Map(),
  assets: [],
  loadError: null,
}

let catalog = { ...emptyCatalog, fileIndex: new Map(), assetsByPlaceKey: new Map(), assetsByFileKey: new Map() }
/** @type {Set<() => void>} */
const listeners = new Set()

export function getPlaceImageCatalog() {
  return catalog
}

export function subscribePlaceImageCatalog(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function setCatalog(next) {
  catalog = next
  notifyListeners()
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

function attachCreditMetadata(place, fileName, base) {
  if (base.isNoImage) {
    return { ...base, asset: null, creditMatchedBy: null }
  }
  const { asset, matchedBy } = resolvePlaceImageAsset(place, catalog, fileName)
  if (asset && import.meta.env.DEV) {
    console.debug(`${DEBUG_PREFIX} Credit matched for "${collectPlaceNameCandidates(place)[0] ?? 'unknown'}":`, {
      matchedBy: matchedBy,
      place_name: asset.place_name,
      file_name: asset.file_name,
      image_author: asset.image_author,
      image_source: asset.image_source,
    })
  }
  return { ...base, asset, creditMatchedBy: matchedBy }
}

function buildResolved(fileName, source) {
  const isNoImage = isNoImageFileName(fileName)
  return {
    url: getStoragePublicUrl(fileName),
    fileName,
    source,
    isNoImage,
    asset: null,
    creditMatchedBy: null,
  }
}

/** @param {Record<string, unknown> | null | undefined} place */
export function resolveCuratedPlaceImage(place) {
  const csvUrl = resolvePlaceImageUrl(place)
  const names = collectPlaceNameCandidates(place)

  for (const name of names) {
    const fileName = lookupStorageFileName(catalog.fileIndex, name)
    if (fileName) {
      return attachCreditMetadata(place, fileName, buildResolved(fileName, 'storage'))
    }
  }

  for (const asset of catalog.assets) {
    if (!asset.file_name) {
      continue
    }
    const fileName = lookupStorageFileName(catalog.fileIndex, asset.file_name)
    if (!fileName) {
      continue
    }
    const linkedToPlace = names.some(
      (name) => normalizeImageKey(name) === normalizeImageKey(asset.place_name),
    )
    const linkedToFileLabel = names.some(
      (name) => normalizeImageKey(name) === normalizeImageKey(asset.file_name),
    )
    if (linkedToPlace || linkedToFileLabel) {
      return attachCreditMetadata(place, fileName, buildResolved(fileName, 'storage'))
    }
  }

  if (csvUrl) {
    return attachCreditMetadata(place, '', {
      url: csvUrl,
      fileName: '',
      source: 'csv',
      isNoImage: false,
      asset: null,
      creditMatchedBy: null,
    })
  }

  const fallbackFile =
    lookupStorageFileName(catalog.fileIndex, NO_IMAGE_FILE) || NO_IMAGE_FILE
  return buildResolved(fallbackFile, 'no_image')
}

export async function initPlaceImageCatalog() {
  let fileNames = [NO_IMAGE_FILE]
  let assets = []
  let loadError = null

  try {
    fileNames = await fetchStorageImageFileNames()
  } catch (err) {
    loadError = err
    console.error(`${DEBUG_PREFIX} Failed to list Storage bucket "kmapimages":`, err)
    fileNames = [NO_IMAGE_FILE]
  }

  try {
    assets = await fetchImageAssets()
  } catch (err) {
    loadError = err
    assets = []
  }

  const assetIndex = buildImageAssetsIndex(assets)
  setCatalog({
    ready: true,
    fileIndex: buildStorageFileIndex(fileNames),
    assetsByPlaceKey: assetIndex.byPlaceKey,
    assetsByFileKey: assetIndex.byFileKey,
    assets: assetIndex.rows,
    loadError,
  })

  console.debug(`${DEBUG_PREFIX} Catalog ready:`, {
    storageFiles: fileNames.length,
    metadataRows: assets.length,
    placeKeys: assetIndex.byPlaceKey.size,
    fileKeys: assetIndex.byFileKey.size,
    loadError: loadError ? String(loadError.message ?? loadError) : null,
  })

  return !loadError
}

export async function refreshPlaceImageCatalog() {
  return initPlaceImageCatalog()
}
