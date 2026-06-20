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
  for (const d of (await res.json()).documents || []) {
    console.log([d.place_name, d.id, d.y, d.x, d.category_name, d.address_name].join('\t'))
  }
}

console.log('=== K-Star Road Apgujeong ===')
await search('케이스타로드', '127.039', '37.527')
await search('K스타로드', '127.039', '37.527')
console.log('=== Seoul Forest kpop spots ===')
await search('서울숲', '127.044', '37.544')
await search('제이홉숲', '127.044', '37.544')
await search('BTS 벤치 서울숲', '127.044', '37.544')
