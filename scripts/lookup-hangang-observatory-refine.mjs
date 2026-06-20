import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '8000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Maebong view', '매봉산 전망대', '127.009', '37.544'],
  ['Maebong gangnam', '매봉산', '127.009', '37.544'],
  ['Daemo view', '대모산 돌탑전망대', '127.086', '37.479'],
  ['Daemo tower', '대모산 봉우대', '127.079', '37.475'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 6)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}\t${d.road_address_name || d.address_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
