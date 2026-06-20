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
  url.searchParams.set('radius', '3000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

for (const [q, x, y] of [
  ['뚝섬전망문화콤플렉스', '127.065', '37.530'],
  ['전망문화콤플렉스', '127.065', '37.530'],
  ['한강플플', '127.065', '37.530'],
  ['뚝섬 옥루', '127.065', '37.530'],
  ['뚝섬한강공원', '127.069', '37.529'],
]) {
  console.log(`\n=== ${q} ===`)
  for (const d of (await search(q, x, y)).slice(0, 8)) {
    console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.category_name}\t${d.road_address_name || d.address_name}`)
  }
}
