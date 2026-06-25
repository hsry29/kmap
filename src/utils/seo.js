import { isRouteCollection } from './collectionTypes'
import {
  findCollectionBySlug,
  findPlaceBySlug,
  getCollectionPath,
  getCollectionSlug,
  getPlacePath,
  getPlaceSlug,
} from './seoSlug'

export const SITE_URL = 'https://kmap.ai.kr'
export const SITE_NAME = 'KMap'
export const DEFAULT_TITLE = 'KMap — Seoul Travel Map'
export const DEFAULT_DESCRIPTION =
  'Curated Seoul travel map for international visitors. Explore routes, spot collections, and place guides on an interactive Kakao map.'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`

/**
 * @param {string} pathname
 */
export function parseSeoPath(pathname) {
  const path = String(pathname ?? '/').replace(/\/+$/, '') || '/'
  if (path === '/admin') {
    return { kind: 'admin' }
  }
  if (path === '' || path === '/' || path === '/app') {
    return { kind: 'home' }
  }
  const placeMatch = path.match(/^\/place\/([^/]+)\/([^/]+)$/)
  if (placeMatch) {
    return {
      kind: 'place',
      collectionSlug: decodeURIComponent(placeMatch[1]),
      placeSlug: decodeURIComponent(placeMatch[2]),
    }
  }
  const routeMatch = path.match(/^\/routes\/([^/]+)$/)
  if (routeMatch) {
    return {
      kind: 'collection',
      mode: 'routes',
      collectionSlug: decodeURIComponent(routeMatch[1]),
    }
  }
  const spotsMatch = path.match(/^\/spots\/([^/]+)$/)
  if (spotsMatch) {
    return {
      kind: 'collection',
      mode: 'explore',
      collectionSlug: decodeURIComponent(spotsMatch[1]),
    }
  }
  return { kind: 'home' }
}

/**
 * @param {{
 *   mode: string
 *   activeCategory: string
 *   selectedPlace: Record<string, unknown> | null
 *   activeCollection: Record<string, unknown> | null
 *   visibleCollections: unknown[]
 * }} state
 */
export function buildPathFromAppState({
  mode,
  activeCategory,
  selectedPlace,
  activeCollection,
  visibleCollections,
}) {
  if (mode === 'places') {
    return '/'
  }
  if (selectedPlace && activeCollection && activeCategory !== 'All') {
    const collectionSlug = getCollectionSlug(activeCollection, visibleCollections)
    const places = Array.isArray(activeCollection.places) ? activeCollection.places : []
    const placeSlug = getPlaceSlug(selectedPlace, places)
    return getPlacePath(collectionSlug, placeSlug)
  }
  if (activeCollection && activeCategory !== 'All') {
    const collectionSlug = getCollectionSlug(activeCollection, visibleCollections)
    return getCollectionPath(activeCollection, collectionSlug)
  }
  return '/'
}

/**
 * @param {unknown[]} collections
 * @param {ReturnType<typeof parseSeoPath>} parsed
 */
export function resolveRouteTarget(collections, parsed) {
  if (parsed.kind === 'home') {
    return {
      mode: 'explore',
      activeCategory: 'All',
      selectedPlaceId: null,
      selectedPlaceCollectionId: null,
    }
  }
  if (parsed.kind === 'collection') {
    const collection = findCollectionBySlug(collections, parsed.collectionSlug)
    if (!collection) {
      return null
    }
    return {
      mode: parsed.mode,
      activeCategory: collection.title,
      selectedPlaceId: null,
      selectedPlaceCollectionId: null,
    }
  }
  if (parsed.kind === 'place') {
    const collection = findCollectionBySlug(collections, parsed.collectionSlug)
    if (!collection) {
      return null
    }
    const place = findPlaceBySlug(collection, parsed.placeSlug)
    if (!place) {
      return null
    }
    return {
      mode: isRouteCollection(collection) ? 'routes' : 'explore',
      activeCategory: collection.title,
      selectedPlaceId: place.id,
      selectedPlaceCollectionId: collection.id,
    }
  }
  return null
}

/**
 * @param {{
 *   mode: string
 *   activeCollection: Record<string, unknown> | null
 *   selectedPlace: Record<string, unknown> | null
 *   imageUrl?: string | null
 *   visibleCollections?: unknown[]
 * }} input
 */
export function resolveSeoMeta({
  mode,
  activeCollection,
  selectedPlace,
  imageUrl = null,
  visibleCollections = [],
}) {
  if (mode === 'admin') {
    return {
      title: 'Admin — KMap',
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}/admin`,
      ogImage: DEFAULT_OG_IMAGE,
      noindex: true,
      pageType: 'admin',
    }
  }

  if (mode === 'places') {
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: `${SITE_URL}/`,
      ogImage: DEFAULT_OG_IMAGE,
      noindex: true,
      pageType: 'home',
    }
  }

  if (selectedPlace && activeCollection) {
    const name =
      String(selectedPlace.enName ?? selectedPlace.koName ?? selectedPlace.name ?? 'Place').trim()
    const collectionTitle = String(activeCollection.title ?? 'Collection').trim()
    const whyVisit = selectedPlace.curation?.whyVisit?.en
    const description =
      (typeof whyVisit === 'string' && whyVisit.trim()) ||
      `Visit ${name} in Seoul — part of ${collectionTitle} on KMap.`
    const collectionSlug = getCollectionSlug(activeCollection, visibleCollections)
    const places = Array.isArray(activeCollection.places) ? activeCollection.places : []
    const placeSlug = getPlaceSlug(selectedPlace, places)
    const canonical = `${SITE_URL}${getPlacePath(collectionSlug, placeSlug)}`
    return {
      title: `${name} | ${collectionTitle} — KMap`,
      description,
      canonical,
      ogImage: imageUrl || DEFAULT_OG_IMAGE,
      noindex: false,
      pageType: 'place',
      placeName: name,
      collectionTitle,
      activeCollection,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng,
      koAddress: selectedPlace.koAddress,
    }
  }

  if (activeCollection) {
    const title = String(activeCollection.title ?? 'Collection').trim()
    const isRoute = isRouteCollection(activeCollection)
    const placeCount = Array.isArray(activeCollection.places) ? activeCollection.places.length : 0
    const description = isRoute
      ? `Follow the ${title} route in Seoul — ${placeCount} curated stops on KMap.`
      : `Explore ${title} — ${placeCount} curated spots in Seoul on KMap.`
    const collectionSlug = getCollectionSlug(activeCollection, visibleCollections)
    const canonical = `${SITE_URL}${getCollectionPath(activeCollection, collectionSlug)}`
    return {
      title: `${title} — KMap`,
      description,
      canonical,
      ogImage: DEFAULT_OG_IMAGE,
      noindex: false,
      pageType: isRoute ? 'route' : 'collection',
      collectionTitle: title,
      activeCollection,
      places: activeCollection.places ?? [],
    }
  }

  return {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonical: `${SITE_URL}/`,
    ogImage: DEFAULT_OG_IMAGE,
    noindex: false,
    pageType: 'home',
  }
}
