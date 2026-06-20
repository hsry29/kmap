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
  url.searchParams.set('radius', '5000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

const queries = [
  ['Garosu 1', '가로수길 거리', '127.023', '37.521'],
  ['Garosu 2', '신사 가로수길', '127.023', '37.521'],
  ['Garosu 3', '신사동 가로수길', '127.023', '37.521'],
  ['Dosan 1', '도산근린공원', '127.031', '37.527'],
  ['Dosan 2', '도산공원', '127.031', '37.527'],
  ['COEX 1', '코엑스몰', '127.059', '37.512'],
  ['COEX 2', '스타필드 코엑스', '127.059', '37.512'],
]

for (const [label, q, x, y] of queries) {
  const docs = await search(q, x, y)
  console.log(`\n=== ${label} (${q}) ===`)
  for (const d of docs.slice(0, 8)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}\t${d.road_address_name || d.address_name}`)
  }
  await new Promise((r) => setTimeout(r, 120))
}
