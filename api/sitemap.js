import { generateSitemapXml } from '../lib/seo.mjs'

/** Vercel Node.js serverless handler for /api/sitemap */
export default async function handler(req, res) {
  try {
    const xml = await generateSitemapXml()
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    res.setHeader('X-Sitemap-Source', 'api')
    res.status(200).send(xml)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sitemap generation failed'
    res.status(500).send(message)
  }
}
