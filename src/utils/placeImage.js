/**
 * Curated Route/Spot place hero image (manual URL).
 * Accepts camelCase, snake_case CSV field, or legacy `image`.
 */

/** Strip CSV/LibreOffice wrapping quotes and whitespace. */
export function normalizeImageUrl(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '')
}

export function resolvePlaceImageUrl(place) {
  if (!place || typeof place !== 'object') {
    return ''
  }
  return normalizeImageUrl(place.imageUrl ?? place.image_url ?? place.image ?? '')
}

export function isNaverHostedImageUrl(url) {
  try {
    const host = new URL(normalizeImageUrl(url)).hostname.toLowerCase()
    return host.endsWith('pstatic.net') || host.includes('naver.com')
  } catch {
    return false
  }
}

/**
 * Some hosts block hotlinking unless Referer is omitted or relaxed.
 */
export function resolveImageReferrerPolicy(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (
      host.endsWith('pstatic.net') ||
      host.includes('naver.com') ||
      host.includes('tistory.com') ||
      host.includes('daumcdn.net')
    ) {
      return 'origin'
    }
  } catch {
    /* ignore invalid URL */
  }
  return 'no-referrer'
}

/** Admin hint when a URL is unlikely to work as an external embed. */
export function getImageUrlLoadHint(url) {
  const normalized = normalizeImageUrl(url)
  if (!normalized) {
    return ''
  }
  try {
    const host = new URL(normalized).hostname.toLowerCase()
    if (host.endsWith('pstatic.net') || host.includes('naver.com')) {
      return 'Naver/blog links cannot be embedded here. Save the image locally, then use Upload file in admin (or re-host on Imgur).'
    }
    if (host.includes('blog.naver') || host.includes('postfiles')) {
      return 'Blog attachment URLs usually cannot be embedded on other websites.'
    }
    if (host.includes('kakaocdn.net') || host.includes('kakao.com')) {
      return 'Kakao CDN links may block hotlinking from external apps.'
    }
  } catch {
    return 'Enter a direct image URL ending in .jpg, .png, or .webp.'
  }
  return ''
}
