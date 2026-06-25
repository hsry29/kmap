import { isRouteCollection } from './collectionTypes'
import { SITE_NAME, SITE_URL } from './seo'
import { getCollectionPath, getCollectionSlug, getPlacePath, getPlaceSlug } from './seoSlug'

/**
 * @param {Record<string, unknown>} meta
 */
export function buildJsonLd(meta) {
  const graph = []

  if (meta.pageType === 'home') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: meta.description,
      inLanguage: 'en',
    })
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
    })
    return graph
  }

  if (meta.pageType === 'place') {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: meta.placeName,
      description: meta.description,
      url: meta.canonical,
      address: meta.koAddress
        ? {
            '@type': 'PostalAddress',
            streetAddress: meta.koAddress,
            addressLocality: 'Seoul',
            addressCountry: 'KR',
          }
        : undefined,
      geo:
        Number.isFinite(meta.lat) && Number.isFinite(meta.lng)
          ? {
              '@type': 'GeoCoordinates',
              latitude: meta.lat,
              longitude: meta.lng,
            }
          : undefined,
    })
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: meta.placeName,
      description: meta.description,
      url: meta.canonical,
    })
    return graph
  }

  if (meta.pageType === 'route' || meta.pageType === 'collection') {
    const collection = meta.activeCollection ?? {}
    const collectionSlug = getCollectionSlug(collection)
    const places = Array.isArray(meta.places) ? meta.places : []
    const listType = isRouteCollection(collection) ? 'ItemList' : 'CollectionPage'

    if (listType === 'ItemList') {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: meta.collectionTitle,
        description: meta.description,
        url: meta.canonical,
        numberOfItems: places.length,
        itemListElement: places.map((place, index) => {
          const placeSlug = getPlaceSlug(place, places)
          return {
            '@type': 'ListItem',
            position: index + 1,
            name: place.enName || place.koName || place.id,
            url: `${SITE_URL}${getPlacePath(collectionSlug, placeSlug)}`,
          }
        }),
      })
    } else {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: meta.collectionTitle,
        description: meta.description,
        url: meta.canonical,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: places.length,
          itemListElement: places.map((place, index) => {
            const placeSlug = getPlaceSlug(place, places)
            return {
              '@type': 'ListItem',
              position: index + 1,
              name: place.enName || place.koName || place.id,
              url: `${SITE_URL}${getPlacePath(collectionSlug, placeSlug)}`,
            }
          }),
        },
      })
    }

    graph.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: meta.collectionTitle,
      description: meta.description,
      url: meta.canonical,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
      },
    })
    return graph
  }

  return graph
}

/** @param {unknown[]} collections */
export function buildBrowseLinks(collections) {
  const links = [
    { href: '/', label: 'KMap Home' },
    { href: '/app', label: 'KMap App' },
  ]
  for (const collection of collections) {
    const collectionSlug = getCollectionSlug(collection, collections)
    const collectionPath = getCollectionPath(collection, collectionSlug)
    links.push({
      href: collectionPath,
      label: collection.title,
    })
    const places = Array.isArray(collection.places) ? collection.places : []
    for (const place of places) {
      const placeSlug = getPlaceSlug(place, places)
      links.push({
        href: getPlacePath(collectionSlug, placeSlug),
        label: `${place.enName || place.koName || place.id} — ${collection.title}`,
      })
    }
  }
  return links
}
