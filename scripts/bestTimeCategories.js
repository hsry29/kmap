#!/usr/bin/env node
/**
 * Map legacy best_time ranges → visit-time categories.
 * Used by transform-best-time.mjs and CSV patch scripts.
 */

/** @type {Record<string, string>} */
export const BEST_TIME_CATEGORY_MAP = {
  '08:00-10:00': 'Morning',
  '09:00-10:30': 'Morning',
  '09:00-11:00': 'Morning',
  '10:00-11:30': 'Morning',
  '10:30-11:30': 'Morning',
  '10:30-12:00': 'Morning',
  '11:00-12:00': 'Morning',
  '11:00-12:30': 'Morning',
  '09:00-16:00': 'Daytime',
  '09:00-17:00': 'Daytime',
  '09:00-18:00': 'Daytime',
  '10:00-15:00': 'Daytime',
  '10:00-16:00': 'Daytime',
  '10:00-17:00': 'Daytime',
  '10:00-18:00': 'Daytime',
  '10:00-20:00': 'Daytime',
  '10:00-21:00': 'Daytime',
  '10:30-21:00': 'Daytime',
  '10:30-22:00': 'Daytime',
  '11:00-17:00': 'Daytime',
  '11:00-18:00': 'Daytime',
  '11:00-19:00': 'Daytime',
  '11:30-13:00': 'Daytime',
  '11:30-14:00': 'Daytime',
  '11:00-13:00': 'Afternoon & Evening',
  '11:00-14:00': 'Afternoon & Evening',
  '11:00-15:00': 'Afternoon & Evening',
  '12:00-13:30': 'Afternoon & Evening',
  '12:00-14:00': 'Afternoon & Evening',
  '12:00-19:00': 'Afternoon & Evening',
  '12:00-20:00': 'Afternoon & Evening',
  '12:00-21:00': 'Afternoon & Evening',
  '12:30-14:00': 'Afternoon & Evening',
  '13:00-14:00': 'Afternoon & Evening',
  '13:00-15:00': 'Afternoon & Evening',
  '13:30-15:30': 'Afternoon & Evening',
  '14:00-15:00': 'Afternoon & Evening',
  '14:00-16:00': 'Afternoon & Evening',
  '15:00-17:00': 'Afternoon & Evening',
  '15:00-18:00': 'Afternoon & Evening',
  '15:00-20:00': 'Afternoon & Evening',
  '15:00-21:00': 'Afternoon & Evening',
  '15:30-18:00': 'Afternoon & Evening',
  '11:00-20:00': 'Daytime',
  '11:00-21:00': 'Daytime',
  '16:00-21:00': 'Sunset & Night',
  '17:00-19:00': 'Sunset & Night',
  '17:00-20:00': 'Sunset & Night',
  '17:00-21:00': 'Sunset & Night',
  '17:00-22:00': 'Sunset & Night',
  '18:00-20:00': 'Night View',
  '18:00-21:00': 'Night View',
  '18:00-22:00': 'Night View',
  '18:30-21:00': 'Night View',
  '19:00-22:00': 'Night View',
  '19:30-21:00': 'Night View',
  '20:00-21:00': 'Night View',
  '20:30-22:00': 'Night View',
  '21:30-23:00': 'Night View',
}

export function normalizeBestTimeKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\u2013\u2014\u2212]/g, '-')
}

/** @param {string} value */
export function mapBestTimeToCategory(value) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === 'Early April') {
    return raw
  }
  return BEST_TIME_CATEGORY_MAP[normalizeBestTimeKey(raw)] ?? raw
}
