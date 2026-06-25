import { Helmet } from 'react-helmet-async'
import { buildJsonLd } from '../utils/seoJsonLd'

/**
 * @param {{
 *   title: string
 *   description: string
 *   canonical: string
 *   ogImage: string
 *   noindex?: boolean
 *   pageType?: string
 *   [key: string]: unknown
 * }} meta
 */
export function SeoHead({ meta }) {
  const jsonLd = buildJsonLd(meta)
  const jsonLdPayload =
    jsonLd.length === 0
      ? null
      : jsonLd.length === 1
        ? jsonLd[0]
        : {
            '@context': 'https://schema.org',
            '@graph': jsonLd.map(({ '@context': _c, ...node }) => node),
          }
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={meta.canonical} />
      {meta.noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="KMap" />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.canonical} />
      <meta property="og:image" content={meta.ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.ogImage} />
      {jsonLdPayload ? (
        <script type="application/ld+json">{JSON.stringify(jsonLdPayload)}</script>
      ) : null}
    </Helmet>
  )
}
