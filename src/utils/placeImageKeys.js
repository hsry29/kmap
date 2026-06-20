/** Normalize place/file names for Storage filename matching. */
export function normalizeImageKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|gif)$/i, '')
    .replace(/[_\-\s]+/g, '')
}

export function stripImageExtension(value) {
  return String(value ?? '')
    .trim()
    .replace(/\.(jpe?g|png|webp|gif)$/i, '')
}
