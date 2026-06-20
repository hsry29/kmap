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
  url.searchParams.set('radius', '10000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  for (const d of (await res.json()).documents || []) {
    console.log([d.place_name, d.id, d.y, d.x, d.category_name, d.address_name].join('\t'))
  }
}

console.log('=== K-Star Zone ===')
await search('케이스타존', '127.044', '37.544')
await search('K-Star Zone 서울숲', '127.044', '37.544')
await search('서울숲 K스타', '127.044', '37.544')
console.log('=== Myeongdong K-POP ===')
await search('K-POP Plaza', '126.986', '37.563')
await search('케이팝스퀘어 명동', '126.986', '37.563')
await search('명동 K팝', '126.986', '37.563')
await search('케이팝팔레트 명동', '126.986', '37.563')
console.log('=== JYP verify ===')
await search('JYP엔터테인먼트', '127.045', '37.524')
