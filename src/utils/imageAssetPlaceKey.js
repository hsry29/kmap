/** Stable dedupe key for image_assets (DB place_key column). */
export function deriveImageAssetPlaceKey(placeName) {
  return String(placeName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** @param {Record<string, unknown> | null | undefined} row */
export function imageAssetCompletenessScore(row) {
  if (!row) {
    return 0
  }
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
