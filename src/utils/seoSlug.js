import { isRouteCollection } from './collectionTypes'

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

/**
 * @param {{ id?: string, title?: string, slug?: string }} collection
 * @param {Array<{ id?: string, title?: string, slug?: string }>} [allCollections]
 */
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

/**
 * @param {{ id?: string, enName?: string, koName?: string, slug?: string }} place
 * @param {Array<{ id?: string, enName?: string, koName?: string }>} [siblings]
 */
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

/**
 * @param {Array<{ id?: string, title?: string, slug?: string }>} collections
 * @param {string} slug
 */
export function findCollectionBySlug(collections, slug) {
  const target = String(slug ?? '').trim().toLowerCase()
  if (!target) {
    return null
  }
  return (
    collections.find((collection) => getCollectionSlug(collection, collections) === target) ?? null
  )
}

/**
 * @param {{ places?: unknown[] }} collection
 * @param {string} slug
 */
export function findPlaceBySlug(collection, slug) {
  const places = Array.isArray(collection?.places) ? collection.places : []
  const target = String(slug ?? '').trim().toLowerCase()
  if (!target) {
    return null
  }
  return places.find((place) => getPlaceSlug(place, places) === target) ?? null
}

/**
 * @param {Array<{ title?: string, type?: unknown, id?: string, href?: string }>} featured
 * @param {unknown[]} allCollections
 */
export function enrichFeaturedCollections(featured, allCollections) {
  return (featured ?? []).map((item) => {
    const full =
      allCollections.find((c) => c.id === item.id || c.title === item.title) ?? null
    if (!full) {
      return item
    }
    const slug = getCollectionSlug(full, allCollections)
    return { ...item, href: getCollectionPath(full, slug) }
  })
}

/**
 * @param {{ type?: unknown }} collection
 * @param {string} collectionSlug
 */
export function getCollectionPath(collection, collectionSlug) {
  const prefix = isRouteCollection(collection) ? 'routes' : 'spots'
  return `/${prefix}/${collectionSlug}`
}

/**
 * @param {string} collectionSlug
 * @param {string} placeSlug
 */
export function getPlacePath(collectionSlug, placeSlug) {
  return `/place/${collectionSlug}/${placeSlug}`
}
