/** Global convenience-store brands — never romanize these from Korean. */

export const CONVENIENCE_STORE_BRAND_PAIRS = [
  ['세븐일레븐', '7-Eleven'],
  ['이마트24', 'emart24'],
  ['지에스25', 'GS25'],
  ['미니스톱', 'MINISTOP'],
  ['씨유', 'CU'],
]

/** Latin forms that should normalize to official brand names. */
export const CONVENIENCE_STORE_LATIN_BRANDS = [
  [/\bseven\s*-?\s*eleven\b/gi, '7-Eleven'],
  [/\bsebeunilrebeun\b/gi, '7-Eleven'],
  [/\bse\s*beun\s*il\s*re\s*beun\b/gi, '7-Eleven'],
  [/\bgs\s*-?\s*25\b/gi, 'GS25'],
  [/\bjieoseu\s*25\b/gi, 'GS25'],
  [/\bji\s*e\s*seu\s*25\b/gi, 'GS25'],
  [/\bemart\s*-?\s*24\b/gi, 'emart24'],
  [/\bemateu\s*24\b/gi, 'emart24'],
  [/\be\s*ma\s*teu\s*24\b/gi, 'emart24'],
  [/\bministop\b/gi, 'MINISTOP'],
  [/\bminiseutop\b/gi, 'MINISTOP'],
  [/\bcu\b/gi, 'CU'],
  [/\bssiyu\b/gi, 'CU'],
  [/\bssi\s*yu\b/gi, 'CU'],
]

export const CONVENIENCE_STORE_BRAND_PATTERN =
  /(편의점|세븐\s*일레븐|세븐일레븐|seven\s*eleven|se\s*beun\s*il\s*re\s*beun|\bcu\b|씨유|\bgs\s*25\b|지에스\s*25|지에스25|emart\s*24|이마트\s*24|이마트24|ministop|미니스톱)/i

const KOREAN_BRAND_SPACING = [
  [/세븐\s*일레븐/g, '세븐일레븐'],
  [/지에스\s*25/g, '지에스25'],
  [/이마트\s*24/g, '이마트24'],
]

const ROMANIZED_BRAND_PATTERN =
  /\b(sebeunilrebeun|se\s*beun\s*il\s*re\s*beun|jieoseu\s*25|ji\s*e\s*seu\s*25|emateu\s*24|e\s*ma\s*teu\s*24|ssiyu|ssi\s*yu)\b/i

/** Collapse spaced Korean brand spellings before tokenization. */
export function normalizeKoreanStoreName(name) {
  let text = String(name ?? '').trim()
  for (const [pattern, replacement] of KOREAN_BRAND_SPACING) {
    text = text.replace(pattern, replacement)
  }
  return text.replace(/\s+/g, ' ').trim()
}

const LATIN_BRAND_IN_NAME = [
  [/\bgs\s*-?\s*25\b/gi, '지에스25'],
  [/\bemart\s*-?\s*24\b/gi, '이마트24'],
  [/\bmini\s*stop\b/gi, '미니스톱'],
  [/\bseven\s*-?\s*eleven\b/gi, '세븐일레븐'],
  [/\bcu\b/gi, '씨유'],
]

/** Kakao list rank prefix, e.g. "A GS25 …" */
const KAKAO_RANK_PREFIX = /^[A-Z]\s+/

const LATIN_BRANCH_BLOCKLIST =
  /^(new|wave|plus|open|best|hot|cool|mart|store|shop|stop|eleven|emart|mini)$/i

/** Latin convenience brands in Kakao place_name → Korean brand token before Hangul extraction. */
export function normalizeLatinBrandsInPlaceName(text) {
  let out = String(text ?? '').trim().replace(KAKAO_RANK_PREFIX, '')
  for (const [pattern, ko] of LATIN_BRAND_IN_NAME) {
    out = out.replace(pattern, ko)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** "명동IB점" → "명동 IB점" so branch codes survive extraction. */
function splitGluedLatinBranchCodes(text) {
  return String(text ?? '')
    .replace(/([\uAC00-\uD7AF]+)([A-Za-z]{1,4})(점)/g, '$1 $2$3')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Keep Hangul + digits + short Latin branch codes; drop marketing fragments (e.g. "New Wave"). */
export function extractKoreanPlaceName(text) {
  let prepared = normalizeKoreanStoreName(String(text ?? '').trim())
  prepared = normalizeLatinBrandsInPlaceName(prepared)
  prepared = splitGluedLatinBranchCodes(prepared)

  /** @type {string[]} */
  const tokens = []
  const re = /[\uAC00-\uD7AF0-9]+|[A-Za-z]{1,4}점|[A-Za-z]{1,4}/g
  let match
  while ((match = re.exec(prepared)) !== null) {
    const token = match[0]
    if (/^[A-Za-z]+$/.test(token) && LATIN_BRANCH_BLOCKLIST.test(token)) {
      continue
    }
    tokens.push(token)
  }
  return normalizeKoreanStoreName(tokens.join(' '))
}

/** @param {string} text */
export function normalizeConvenienceBrandEnglish(text) {
  let out = String(text ?? '').trim()
  for (const [pattern, brand] of CONVENIENCE_STORE_LATIN_BRANDS) {
    out = out.replace(pattern, brand)
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** @param {string} text */
export function looksLikeRomanizedConvenienceBrand(text) {
  return ROMANIZED_BRAND_PATTERN.test(String(text ?? ''))
}

/** @param {Record<string, unknown>} place @param {string} [koreanName] */
export function isConvenienceStoreContext(place, koreanName = '') {
  const fields = [
    koreanName,
    place?.name,
    place?.placeName,
    place?.koName,
    place?.categoryName,
    place?.category,
  ]
  return fields.some((field) => CONVENIENCE_STORE_BRAND_PATTERN.test(String(field ?? '')))
}
