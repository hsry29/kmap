import { getPublishedCollections } from '../utils/adminCollections'
import { buildBrowseLinks } from '../utils/seoJsonLd'

/**
 * Crawler-friendly internal links (visually hidden).
 * @param {{ collections: unknown[] }} props
 */
export function SeoBrowseNav({ collections }) {
  const published = getPublishedCollections(collections)
  const links = buildBrowseLinks(published)
  if (links.length === 0) {
    return null
  }
  return (
    <nav className="seo-browse-nav" aria-label="Browse KMap">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href}>{link.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
