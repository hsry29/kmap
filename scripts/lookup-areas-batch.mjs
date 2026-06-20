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
    en: 'Ikseon-dong',
    ko: '익선동',
    queries: ['익선동한옥거리', '익선동 한옥마을', '익선동'],
    x: '126.990',
    y: '37.573',
    pickName: '익선동한옥거리',
    pickAddress: /종로|익선/,
  },
  {
    en: 'Hannam-dong',
    ko: '한남동',
    queries: ['한남동', '한남동 거리', '한남동 카페거리'],
    x: '127.005',
    y: '37.536',
    pickAddress: /용산|한남/,
    preferCategory: /명소|거리|카페|음식점|관광/,
  },
  {
    en: 'Yeonnam-dong',
    ko: '연남동',
    queries: ['연남동 경의선숲길', '경의선숲길', '연남동'],
    x: '126.924',
    y: '37.565',
    pickName: '경의선숲길',
    pickAddress: /연남|마포/,
  },
  {
    en: 'Songridan-gil',
    ko: '송리단길',
    queries: ['송리단길', '송리단길 카페'],
    x: '127.100',
    y: '37.508',
    pickName: '송리단길',
    pickAddress: /송파/,
  },
  {
    en: 'Banpo Hangang Park',
    ko: '반포한강공원',
    queries: ['반포한강공원', '반포 한강공원'],
    x: '126.997',
    y: '37.511',
    pickName: '반포한강공원',
  },
  {
    en: 'Cheonggyecheon Stream',
    ko: '청계천',
    queries: ['청계천', '청계천광장', '청계천 복개'],
    x: '126.978',
    y: '37.569',
    pickName: '청계천',
    rejectName: /주차|ATM|편의점/,
  },
  {
    en: 'Seoul City Wall Trail',
    ko: '서울성곽길',
    queries: ['서울성곽길', '서울성곽', '낙산공원 성곽', '성곽길'],
    x: '127.008',
    y: '37.580',
    preferCategory: /명소|공원|산책|관광|문화/,
    pickAddress: /성동|종로|중구|용산/,
    rejectName: /주차|입구|교차로/,
  },
  {
    en: 'Nodeul Island',
    ko: '노들섬',
    queries: ['노들섬', '노들섬 공원'],
    x: '126.958',
    y: '37.518',
    pickName: '노들섬',
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
  if (place.preferCategory?.test(row.koName)) s += 5
  if (/주차장|ATM|은행|편의점|약국|병원|입출구|교차로/.test(row.category)) s -= 8
  if (place.en === 'Hannam-dong' && /한남/.test(row.koName + row.address)) s += 8
  if (place.en === 'Seoul City Wall Trail' && /성곽/.test(row.koName)) s += 15
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
