import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
url.searchParams.set('query', '송리단길')
url.searchParams.set('x', '127.100')
url.searchParams.set('y', '37.508')
url.searchParams.set('size', '8')
const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
for (const d of (await res.json()).documents || []) {
  console.log(`${d.place_name}\t${d.id}\t${d.y}\t${d.x}\t${d.road_address_name || d.address_name}`)
}
