/**
 * Curation guide text fields — per-language storage for future i18n.
 * Admin UI writes English (`en`) only; display resolves via locale.
 */

export const DEFAULT_CURATION_LANG = 'en'

/** Fields stored as `{ en: string, ko?: string, ... }`. */
export const LOCALIZED_CURATION_FIELD_KEYS = ['whyVisit', 'bestTime', 'timeNeeded', 'tips']

/** @typedef {{ [lang: string]: string }} LocalizedText */

/** Accept legacy plain string or language-keyed object. */
export function normalizeLocalizedField(value) {
  if (value == null) {
    return {}
  }
  if (typeof value === 'string') {
    const text = value.trim()
    return text ? { [DEFAULT_CURATION_LANG]: text } : {}
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const out = {}
    for (const [lang, text] of Object.entries(value)) {
      const trimmed = String(text ?? '').trim()
      if (trimmed) {
        out[String(lang).trim()] = trimmed
      }
    }
    return out
  }
  return {}
}

export function resolveLocalizedField(value, locale = DEFAULT_CURATION_LANG) {
  const obj = normalizeLocalizedField(value)
  const primary = String(obj[locale] ?? '').trim()
  if (primary) {
    return primary
  }
  if (locale !== DEFAULT_CURATION_LANG) {
    const fallback = String(obj[DEFAULT_CURATION_LANG] ?? '').trim()
    if (fallback) {
      return fallback
    }
  }
  for (const text of Object.values(obj)) {
    const trimmed = String(text).trim()
    if (trimmed) {
      return trimmed
    }
  }
  return ''
}

export function hasLocalizedContent(value) {
  return Object.values(normalizeLocalizedField(value)).some((text) => String(text).trim().length > 0)
}

export function setLocalizedField(existing, locale, text) {
  const next = { ...normalizeLocalizedField(existing) }
  const trimmed = String(text ?? '').trim()
  if (trimmed) {
    next[locale] = trimmed
  } else {
    delete next[locale]
  }
  return Object.keys(next).length > 0 ? next : {}
}

export function mergeLocalizedFields(base, override) {
  return { ...normalizeLocalizedField(base), ...normalizeLocalizedField(override) }
}
