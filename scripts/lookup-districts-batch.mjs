import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const KEY = process.env.KAKAO_REST_API_KEY

const places = [
  {
    en: 'Seochon',
    ko: '서촌',
    queries: ['서촌', '서촌마을', '서촌 한옥마을', '경복궁 서촌'],
    x: '126.970',
    y: '37.579',
    pickAddress: /종로|서촌/,
    preferCategory: /명소|거리|관광|문화/,
    rejectName: /주차|편의점|병원|약국|부동산|학원/,
  },
  {
    en: 'Hannam-dong Art District',
    ko: '한남동 예술의거리',
    queries: ['한남동 예술의거리', '한남동 아트', '한남동 갤러리거리', '한남동 카페거리'],
    x: '127.005',
    y: '37.536',
    pickAddress: /용산|한남/,
    preferCategory: /명소|거리|관광|문화|갤러리/,
    rejectName: /주차|편의점|병원/,
  },
  {
    en: 'Samcheong-dong',
    ko: '삼청동',
    queries: ['삼청동', '삼청동길', '삼청동 카페거리', '삼청로'],
    x: '126.982',
    y: '37.584',
    pickAddress: /종로|삼청/,
    preferCategory: /명소|거리|관광|문화|카페/,
    rejectName: /주차|편의점|병원|약국|부동산/,
  },
  {
    en: 'Seongsu Culture District',
    ko: '성수문화거리',
    queries: ['성수문화거리', '성수동 문화거리', '성수동 카페거리', '성수동'],
    x: '127.056',
    y: '37.544',
    pickAddress: /성동|성수/,
    preferCategory: /명소|거리|관광|문화|카페/,
    rejectName: /주차|역|입출구|교차로/,
  },
  {
    en: 'Yongsan Cultural District',
    ko: '용산문화거리',
    queries: ['용산문화거리', '용산 문화거리', '용산 문화공간', '용산구 문화'],
    x: '126.965',
    y: '37.532',
    pickAddress: /용산/,
    preferCategory: /명소|거리|관광|문화/,
    rejectName: /주차|역|입출구|교차로|편의점/,
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(query, x, y) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json')
  url.searchParams.set('query', query)
  url.searchParams.set('x', x)
  url.searchParams.set('y', y)
  url.searchParams.set('radius', '20000')
  url.searchParams.set('size', '10')
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  return (await res.json()).documents || []
}

function toRow(d, q) {
  return {
    koName: d.place_name,
    kakaoId: d.id,
    lat: Number(d.y),
    lng: Number(d.x),
    category: d.category_name,
    address: d.road_address_name || d.address_name,
    query: q,
  }
}

function score(place, row) {
  if (place.rejectName?.test(row.koName)) return -100
  if (place.pickName && row.koName === place.pickName) {
    if (place.pickAddress && !place.pickAddress.test(row.address)) return 60
    return 100
  }
  let s = 0
  if (place.pickAddress?.test(row.address)) s += 20
  if (place.preferCategory?.test(row.category)) s += 10
  if (place.preferCategory?.test(row.koName)) s += 8
  if (/주차장|ATM|은행|편의점|약국|병원|입출구|교차로|부동산/.test(row.category)) s -= 8
  if (place.en.includes('Seochon') && /서촌/.test(row.koName + row.address)) s += 12
  if (place.en.includes('Samcheong') && /삼청/.test(row.koName + row.address)) s += 12
  if (place.en.includes('Seongsu') && /성수/.test(row.koName + row.address)) s += 12
  if (place.en.includes('Yongsan') && /용산/.test(row.koName + row.address)) s += 12
  if (place.en.includes('Hannam') && /한남/.test(row.koName + row.address)) s += 12
  return s
}

for (const place of places) {
  const seen = new Set()
  const candidates = []
  let best = null
  let bestScore = -999

  for (const q of place.queries) {
    const docs = await search(q, place.x, place.y)
    for (const d of docs) {
      if (seen.has(d.id)) continue
      seen.add(d.id)
      const row = toRow(d, q)
      candidates.push(row)
      const s = score(place, row)
      if (s > bestScore) {
        best = row
        bestScore = s
      }
    }
    await sleep(120)
  }

  candidates.sort((a, b) => score(place, b) - score(place, a))

  console.log(`\n=== ${place.en} (${place.ko}) ===`)
  if (best) {
    console.log(`PICK: ${best.koName}\t${best.kakaoId}\t${best.lat}\t${best.lng}\t${best.address}`)
  } else {
    console.log('PICK: NOT FOUND')
  }
  console.log('Candidates:')
  for (const c of candidates.slice(0, 6)) {
    console.log(`  ${c.koName}\t${c.kakaoId}\t${c.lat}\t${c.lng}\t${c.address}`)
  }
}
