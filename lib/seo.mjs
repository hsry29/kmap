import { createClient } from '@supabase/supabase-js'

export const SITE_URL = 'https://kmap.ai.kr'

/** @param {string} value */
export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** @param {{ id?: string, title?: string, slug?: string }} collection @param {unknown[]} allCollections */
export function getCollectionSlug(collection, allCollections = []) {
  if (collection?.slug) {
    return String(collection.slug).trim()
  }
  const base = slugify(collection?.title) || slugify(collection?.id) || 'collection'
  const siblings = allCollections.filter(
    (c) => c?.id !== collection?.id && slugify(c?.title) === slugify(collection?.title),
  )
  if (siblings.length === 0) {
    return base
  }
  const suffix = String(collection?.id ?? '').slice(-6)
  return suffix ? `${base}-${suffix}` : base
}

/** @param {{ id?: string, enName?: string, koName?: string, slug?: string }} place @param {unknown[]} siblings */
export function getPlaceSlug(place, siblings = []) {
  if (place?.slug) {
    return String(place.slug).trim()
  }
  const base =
    slugify(place?.enName) || slugify(place?.koName) || slugify(place?.id) || 'place'
  const dupes = siblings.filter(
    (p) =>
      p?.id !== place?.id &&
      (slugify(p?.enName) === slugify(place?.enName) ||
        slugify(p?.koName) === slugify(place?.koName)),
  )
  if (dupes.length === 0) {
    return base
  }
  const suffix = String(place?.id ?? '').slice(-6)
  return suffix ? `${base}-${suffix}` : base
}

/** @param {{ type?: string }} collection */
function isRouteCollection(collection) {
  return String(collection?.type ?? 'route').toLowerCase() === 'route'
}

/** @param {unknown[]} collections */
export function getPublishedCollections(collections) {
  return (collections ?? []).filter((c) => String(c?.status ?? 'published').toLowerCase() === 'published')
}

/** @param {unknown[]} collections */
export function buildSitemapEntries(collections) {
  const published = getPublishedCollections(collections)
  const today = new Date().toISOString().slice(0, 10)
  /** @type {Array<{ loc: string, lastmod: string, changefreq: string, priority: string }>} */
  const entries = [
    { loc: `${SITE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE_URL}/app`, lastmod: today, changefreq: 'weekly', priority: '0.9' },
  ]

  for (const collection of published) {
    const collectionSlug = getCollectionSlug(collection, published)
    const prefix = isRouteCollection(collection) ? 'routes' : 'spots'
    entries.push({
      loc: `${SITE_URL}/${prefix}/${collectionSlug}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    })
    const places = Array.isArray(collection.places) ? collection.places : []
    for (const place of places) {
      if (!Number.isFinite(Number(place?.lat)) || !Number.isFinite(Number(place?.lng))) {
        continue
      }
      const placeSlug = getPlaceSlug(place, places)
      entries.push({
        loc: `${SITE_URL}/place/${collectionSlug}/${placeSlug}`,
        lastmod: today,
        changefreq: 'monthly',
        priority: '0.7',
      })
    }
  }

  const seen = new Set()
  return entries.filter((entry) => {
    if (seen.has(entry.loc)) {
      return false
    }
    seen.add(entry.loc)
    return true
  })
}

/** @param {unknown[]} collections */
export function buildSitemapXml(collections) {
  const entries = buildSitemapEntries(collections)
  const body = entries
    .map(
      (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

/** @param {string} value */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function fetchPublishedCollections() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    return []
  }
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await sb
    .from('app_config')
    .select('value')
    .eq('key', 'collections')
    .maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  const list = data?.value?.collections
  return Array.isArray(list) ? list : []
}

export async function generateSitemapXml() {
  const collections = await fetchPublishedCollections()
  return buildSitemapXml(collections)
}
