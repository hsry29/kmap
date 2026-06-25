import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSitemapEntries, buildSitemapXml, fetchPublishedCollections } from '../lib/seo.mjs'

const outPath = resolve(process.cwd(), 'sitemap.preview.xml')

async function main() {
  let collections = []
  try {
    collections = await fetchPublishedCollections()
  } catch (error) {
    console.warn('[sitemap] Supabase fetch failed:', error instanceof Error ? error.message : error)
  }

  const xml = buildSitemapXml(collections)
  writeFileSync(outPath, xml, 'utf8')
  const entries = buildSitemapEntries(collections)
  console.log(`[sitemap] Preview: ${entries.length} URLs → ${outPath}`)
  console.log('[sitemap] Production uses /api/sitemap (not a static public/sitemap.xml file).')
}

main().catch((error) => {
  console.error('[sitemap] Failed:', error)
  process.exit(1)
})
