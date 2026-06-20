import { buildSemanticDisplayName, containsHangul } from './koreanDisplayName'

/**
 * 서울·수도권 지하철역 한글명 → 외국인 관용 영문명.
 * ○○입구역은 Entrance Station 등으로 직역하지 않고 실제 통용 표기를 사용한다.
 */
const SUBWAY_STATION_PAIRS = [
  ['강남역', 'Gangnam Station'],
  ['홍대입구역', 'Hongdae Station'],
  ['건대입구역', 'Konkuk Univ. Station'],
  ['서울역', 'Seoul Station'],
  ['잠실역', 'Jamsil Station'],
  ['고속터미널역', 'Express Bus Terminal Station'],
  ['서울대입구역', "Seoul Nat'l Univ. Station"],
  ['교대역', "Seoul Nat'l Univ. of Education Station"],
  ['명동역', 'Myeongdong Station'],
  ['이태원역', 'Itaewon Station'],
  ['동대문역', 'Dongdaemun Station'],
  ['광화문역', 'Gwanghwamun Station'],
  ['시청역', 'City Hall Station'],
  ['종각역', 'Jonggak Station'],
  ['신촌역', 'Sinchon Station'],
  ['이대역', 'Ewha Womans Univ. Station'],
  ['여의도역', 'Yeouido Station'],
  ['삼성역', 'Samseong Station'],
  ['역삼역', 'Yeoksam Station'],
  ['선릉역', 'Seolleung Station'],
  ['압구정역', 'Apgujeong Station'],
  ['신사역', 'Sinsa Station'],
  ['논현역', 'Nonhyeon Station'],
  ['학동역', 'Hakdong Station'],
  ['도곡역', 'Dogok Station'],
  ['대치역', 'Daechi Station'],
  ['한티역', 'Hanti Station'],
  ['수서역', 'Suseo Station'],
  ['방배역', 'Bangbae Station'],
  ['사당역', 'Sadang Station'],
  ['이수역', 'Isu Station'],
  ['노량진역', 'Noryangjin Station'],
  ['영등포역', 'Yeongdeungpo Station'],
  ['영등포구청역', 'Yeongdeungpo-gu Office Station'],
  ['여의나루역', 'Yeouinaru Station'],
  ['마포역', 'Mapo Station'],
  ['합정역', 'Hapjeong Station'],
  ['상암역', 'Sangam Station'],
  ['공덕역', 'Gongdeok Station'],
  ['용산역', 'Yongsan Station'],
  ['한남역', 'Hannam Station'],
  ['녹사평역', 'Noksapyeong Station'],
  ['성수역', 'Seongsu Station'],
  ['뚝섬역', 'Ttukseom Station'],
  ['왕십리역', 'Wangsimni Station'],
  ['청량리역', 'Cheongnyangni Station'],
  ['신도림역', 'Sindorim Station'],
  ['구로역', 'Guro Station'],
  ['금천구청역', 'Geumcheon-gu Office Station'],
  ['가산디지털단지역', 'Gasan Digital Complex Station'],
  ['문래역', 'Mullae Station'],
  ['대림역', 'Daerim Station'],
  ['신림역', 'Sillim Station'],
  ['봉천역', 'Bongcheon Station'],
  ['낙성대역', 'Nakseongdae Station'],
  ['남태령역', 'Namtaeryeong Station'],
  ['당고개역', 'Danggogae Station'],
  ['상계역', 'Sanggye Station'],
  ['노원역', 'Nowon Station'],
  ['창동역', 'Chang-dong Station'],
  ['쌍문역', 'Ssangmun Station'],
  ['수유역', 'Suyu Station'],
  ['미아역', 'Mia Station'],
  ['미아사거리역', 'Mia Sageori Station'],
  ['길음역', 'Gireum Station'],
  ['성신여대입구역', 'Sungshin Womens Univ. Station'],
  ['한성대입구역', 'Hansung Univ. Station'],
  ['뚝섬유원지역', 'Ttukseom Resort Station'],
  ['구의역', 'Guui Station'],
  ['강변역', 'Gangbyeon Station'],
  ['잠실나루역', 'Jamsillaru Station'],
  ['잠실새내역', 'Jamsilsaenae Station'],
  ['종합운동장역', 'Sports Complex Station'],
  ['선정릉역', 'Seonjeongneung Station'],
  ['봉은사역', 'Bongeunsa Station'],
  ['청담역', 'Cheongdam Station'],
  ['강남구청역', 'Gangnam-gu Office Station'],
  ['학여울역', 'Hangnyeoul Station'],
  ['대청역', 'Daecheong Station'],
  ['일원역', 'Irwon Station'],
  ['총신대입구역', 'Soongsil Univ. Station'],
  ['숙대입구역', 'Sookmyung Womens Univ. Station'],
  ['남영역', 'Namyung Station'],
  ['충무로역', 'Chungmuro Station'],
  ['을지로입구역', 'Euljiro 1-ga Station'],
  ['을지로3가역', 'Euljiro 3-ga Station'],
  ['을지로4가역', 'Euljiro 4-ga Station'],
  ['동대문역사문화공원역', 'Dongdaemun History & Culture Park Station'],
  ['신당역', 'Sindang Station'],
  ['상왕십리역', 'Sangwangsimni Station'],
  ['한양대역', 'Hanyang Univ. Station'],
  ['장한평역', 'Janghanpyeong Station'],
  ['군자역', 'Gunja Station'],
  ['아차산역', 'Achasan Station'],
  ['광나루역', 'Gwangnaru Station'],
  ['천호역', 'Cheonho Station'],
  ['강동역', 'Gangdong Station'],
  ['길동역', 'Gil-dong Station'],
  ['굽은다리역', 'Gubeundari Station'],
  ['명일역', 'Myeongil Station'],
  ['고덕역', 'Godeok Station'],
  ['상일동역', 'Sangil-dong Station'],
  ['방이역', 'Bangi Station'],
  ['오금역', 'Ogeum Station'],
  ['개롱역', 'Gaerong Station'],
  ['거여역', 'Geoyeo Station'],
  ['마천역', 'Macheon Station'],
  ['까치산역', 'Kkachisan Station'],
  ['화곡역', 'Hwagok Station'],
  ['발산역', 'Balsan Station'],
  ['우장산역', 'Ujangsan Station'],
  ['염창역', 'Yeomchang Station'],
  ['등촌역', 'Deungchon Station'],
  ['증미역', 'Jeungmi Station'],
  ['선유도역', 'Seonyudo Station'],
  ['당산역', 'Dangsan Station'],
  ['국회의사당역', 'National Assembly Station'],
  ['샛강역', 'Saetgang Station'],
  ['노들역', 'Nodeul Station'],
  ['흑석역', 'Heukseok Station'],
  ['중앙보훈병원역', 'Central Veterans Hospital Station'],
  ['봉화산역', 'Bonghwasan Station'],
  ['화랑대역', 'Hwarangdae Station'],
  ['태릉입구역', 'Taereung Station'],
  ['먹골역', 'Meokgol Station'],
  ['중화역', 'Junghwa Station'],
  ['상봉역', 'Sangbong Station'],
  ['면목역', 'Myeonmok Station'],
  ['사가정역', 'Sagajeong Station'],
  ['용마산역', 'Yongmasan Station'],
  ['중곡역', 'Junggok Station'],
  ['어린이대공원역', "Children's Grand Park Station"],
  ['청구역', 'Cheonggu Station'],
  ['신금호역', 'Singumho Station'],
  ['행당역', 'Haengdang Station'],
  ['마장역', 'Majang Station'],
  ['답십리역', 'Dapsimni Station'],
  ['강동구청역', 'Gangdong-gu Office Station'],
  ['몽촌토성역', 'Mongchontoseong Station'],
  ['석촌역', 'Seokchon Station'],
  ['송파나루역', 'Songpa Naru Station'],
  ['한성백제역', 'Hanseong Baekje Station'],
  ['올림픽공원역', 'Olympic Park Station'],
  ['둔촌오륜역', 'Dunchon Oryun Station'],
  ['김포공항역', "Gimpo Int'l Airport Station"],
  ['공항시장역', 'Airport Market Station'],
  ['신방화역', 'Sinbanghwa Station'],
  ['마곡나루역', 'Magok Naru Station'],
  ['양천향교역', 'Yangcheon Hyanggyo Station'],
  ['가양역', 'Gayang Station'],
  ['신목동역', 'Sinmokdong Station'],
  ['동작역', 'Dongjak Station'],
  ['구반포역', 'Gubanpo Station'],
  ['신반포역', 'Sinbanpo Station'],
  ['사평역', 'Sapyeong Station'],
  ['신논현역', 'Sinnonhyeon Station'],
  ['언주역', 'Eonju Station'],
  ['삼전역', 'Samjeon Station'],
  ['석촌고분역', 'Seokchon Gobun Station'],
  ['개화역', 'Gaehwa Station'],
  ['송정역', 'Songjeong Station'],
  ['마곡역', 'Magok Station'],
  ['신정역', 'Sinjeong Station'],
  ['목동역', 'Mokdong Station'],
  ['오목교역', 'Omokgyo Station'],
  ['양평역', 'Yangpyeong Station'],
  ['영등포시장역', 'Yeongdeungpo Market Station'],
  ['신길역', 'Singil Station'],
  ['대방역', 'Daebang Station'],
  ['내방역', 'Naebang Station'],
  ['남성역', 'Namseong Station'],
  ['숭실대입구역', 'Soongsil Univ. Station'],
  ['상도역', 'Sangdo Station'],
  ['장승배기역', 'Jangseungbaegi Station'],
  ['신대방삼거리역', 'Sindaebang Samgeori Station'],
  ['보라매역', 'Boramae Station'],
  ['신풍역', 'Sinpung Station'],
  ['남구로역', 'Namguro Station'],
  ['가리봉역', 'Garibong Station'],
  ['구로디지털단지역', 'Guro Digital Complex Station'],
  ['양재역', 'Yangjae Station'],
  ['매봉역', 'Maebong Station'],
  ['반포역', 'Banpo Station'],
  ['남부터미널역', 'Nambu Bus Terminal Station'],
  ['신대방역', 'Sindaebang Station'],
  ['대곡역', 'Daegok Station'],
  ['백석역', 'Baekseok Station'],
  ['마두역', 'Madu Station'],
  ['정발산역', 'Jeongbalsan Station'],
  ['주엽역', 'Juyeop Station'],
  ['대화역', 'Daehwa Station'],
  ['신정네거리역', 'Sinjeong Negeori Station'],
  ['인천국제공항역', "Incheon Int'l Airport Station"],
  ['공항화물청사역', 'Airport Cargo Terminal Station'],
  ['운서역', 'Unseo Station'],
  ['영종역', 'Yeongjong Station'],
  ['청라국제도시역', "Cheongna Int'l City Station"],
  ['검암역', 'Geomam Station'],
  ['계양역', 'Gyeyang Station'],
  ['디지털미디어시티역', 'Digital Media City Station'],
  ['회기역', 'Hoegi Station'],
  ['망우역', 'Mangwoo Station'],
  ['신내역', 'Sinnae Station'],
  ['갈매역', 'Galmae Station'],
  ['별내역', 'Byeollae Station'],
  ['퇴계원역', 'Toegyewon Station'],
  ['사릉역', 'Sareung Station'],
  ['금곡역', 'Geumgok Station'],
  ['평내호평역', 'Pyeongnae-Hopyeong Station'],
  ['천마산역', 'Cheonmasan Station'],
  ['마석역', 'Maseok Station'],
  ['백마역', 'Baengma Station'],
  ['풍산역', 'Pungsan Station'],
  ['일산역', 'Ilsan Station'],
  ['탄현역', 'Tanhyeon Station'],
  ['야당역', 'Yadang Station'],
  ['혜화역', 'Hyehwa Station'],
  ['충정로역', 'Chungjeongno Station'],
  ['애오개역', 'Aeogae Station'],
  ['독산역', 'Doksan Station'],
  ['석수역', 'Seoksu Station'],
  ['관악역', 'Gwanak Station'],
  ['안양역', 'Anyang Station'],
  ['명학역', 'Myeonghak Station'],
  ['금정역', 'Geumjeong Station'],
  ['군포역', 'Gunpo Station'],
  ['당정역', 'Dangjeong Station'],
  ['의왕역', 'Uiwang Station'],
  ['성균관대역', 'Sungkyunkwan Univ. Station'],
  ['화서역', 'Hwaseo Station'],
  ['수원역', 'Suwon Station'],
  ['세류역', 'Seryu Station'],
  ['병점역', 'Byeongjeom Station'],
  ['세마역', 'Sema Station'],
  ['오산대역', 'Osan College Station'],
  ['오산역', 'Osan Station'],
  ['진위역', 'Jinwi Station'],
  ['송탄역', 'Songtan Station'],
  ['서정리역', 'Seojeong-ri Station'],
  ['평택지제역', 'Pyeongtaek Jije Station'],
  ['평택역', 'Pyeongtaek Station'],
  ['성환역', 'Seonghwan Station'],
  ['직산역', 'Jiksan Station'],
  ['두정역', 'Dujeong Station'],
  ['천안역', 'Cheonan Station'],
  ['봉명역', 'Bongmyeong Station'],
  ['쌍용역', 'Ssangyong Station'],
  ['아산역', 'Asan Station'],
  ['배방역', 'Baebang Station'],
  ['온양온천역', 'Onyang Oncheon Station'],
  ['신창역', 'Sinchang Station'],
  ['수내역', 'Sunae Station'],
  ['정자역', 'Jeongja Station'],
  ['미금역', 'Migeum Station'],
  ['오리역', 'Ori Station'],
  ['죽전역', 'Jukjeon Station'],
  ['보정역', 'Bojeong Station'],
]

/** @type {Map<string, string>} */
const SUBWAY_STATION_EN = new Map(SUBWAY_STATION_PAIRS)

/** ○○입구역 사전 미등록 시 — Entrance 직역 금지, 관용 지명만 사용 */
const SUBWAY_ENTRANCE_AREA_EN = new Map([
  ['홍대', 'Hongdae'],
  ['건대', 'Konkuk Univ.'],
  ['서울대', "Seoul Nat'l Univ."],
  ['이대', 'Ewha Womans Univ.'],
  ['숙대', 'Sookmyung Womens Univ.'],
  ['총신대', 'Soongsil Univ.'],
  ['숭실대', 'Soongsil Univ.'],
  ['한성대', 'Hansung Univ.'],
  ['성신여대', 'Sungshin Womens Univ.'],
  ['경희대', 'Kyung Hee Univ.'],
  ['외대', 'Hankuk Univ. of Foreign Studies'],
  ['신촌', 'Sinchon'],
  ['을지로', 'Euljiro 1-ga'],
  ['태릉', 'Taereung'],
])

const SUBWAY_CATEGORY_PATTERN = /지하철|전철|subway/i
const SUBWAY_EXIT_ONLY_PATTERN = /지하철출구|전철출구/i

/** @type {[string, string][]} */
const SUBWAY_LINE_PAIRS = [
  ['수인분당선', 'Suin–Bundang Line'],
  ['경의중앙선', 'Gyeongui–Jungang Line'],
  ['경의·중앙선', 'Gyeongui–Jungang Line'],
  ['신분당선', 'Shinbundang Line'],
  ['공항철도', 'AREX'],
  ['인천공항철도', 'AREX'],
  ['우이신설선', 'Ui–Sinseol Line'],
  ['우이신설경전철', 'Ui–Sinseol Line'],
  ['서해선', 'Seohae Line'],
  ['경춘선', 'Gyeongchun Line'],
  ['분당선', 'Bundang Line'],
  ['경강선', 'Gyeonggang Line'],
  ['김포골드라인', 'Gimpo Goldline'],
  ['신림선', 'Sillim Line'],
  ['GTX-A', 'GTX-A'],
  ['GTX-B', 'GTX-B'],
  ['GTX-C', 'GTX-C'],
  ['1호선', 'Line 1'],
  ['2호선', 'Line 2'],
  ['3호선', 'Line 3'],
  ['4호선', 'Line 4'],
  ['5호선', 'Line 5'],
  ['6호선', 'Line 6'],
  ['7호선', 'Line 7'],
  ['8호선', 'Line 8'],
  ['9호선', 'Line 9'],
]

const SUBWAY_LINE_KO_SORTED = [...SUBWAY_LINE_PAIRS]
  .map(([ko]) => ko)
  .sort((a, b) => b.length - a.length)

/** @type {Map<string, string>} */
const SUBWAY_LINE_EN = new Map(SUBWAY_LINE_PAIRS)

const SUBWAY_LINE_NOISE_PATTERN =
  /수도권\s*호선|수도권\s*전철|수도권전철|도시철도|전철역|지하철역|지하철|전철|subway/gi

/**
 * @param {string} text
 */
function stripLineNamesFromText(text) {
  let s = String(text ?? '')
  for (const ko of SUBWAY_LINE_KO_SORTED) {
    s = s.split(ko).join(' ')
  }
  return s
    .replace(/\d+\s*호선/g, ' ')
    .replace(SUBWAY_LINE_NOISE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string | undefined | null} name
 */
export function normalizeSubwayStationKey(name) {
  let s = stripLineNamesFromText(String(name ?? '').trim())
  if (!s || !containsHangul(s)) {
    return ''
  }
  s = s.replace(/\([^)]*\)/g, ' ')
  s = s.replace(/\d+\s*번\s*(출구|출입구).*/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  if (!s) {
    return ''
  }
  if (!s.endsWith('역')) {
    s = `${s}역`
  }
  return s
}

/**
 * @param {Record<string, unknown>} place
 */
export function isSubwayPlace(place) {
  const cat = String(place.categoryName ?? place.category_name ?? '').trim()
  if (SUBWAY_EXIT_ONLY_PATTERN.test(cat)) {
    return false
  }
  if (SUBWAY_CATEGORY_PATTERN.test(cat)) {
    return true
  }
  const key = normalizeSubwayStationKey(place.name ?? place.place_name)
  return key !== '' && SUBWAY_STATION_EN.has(key)
}

/**
 * @param {string} lineToken e.g. "2호선", "경의중앙선"
 */
export function resolveSubwayLineEnglish(lineToken) {
  const raw = String(lineToken ?? '').trim()
  if (!raw) {
    return ''
  }
  const direct = SUBWAY_LINE_EN.get(raw)
  if (direct) {
    return direct
  }
  const numbered = raw.match(/^(\d+)\s*호선$/)
  if (numbered) {
    return `Line ${numbered[1]}`
  }
  return ''
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function extractSubwayLineTokens(text) {
  const source = String(text ?? '').trim()
  if (!source) {
    return []
  }
  const found = []
  const seen = new Set()
  const add = (token) => {
    const key = String(token ?? '').trim()
    if (!key || seen.has(key)) {
      return
    }
    seen.add(key)
    found.push(key)
  }

  for (const m of source.matchAll(/(\d+)\s*호선/g)) {
    add(`${m[1]}호선`)
  }
  for (const ko of SUBWAY_LINE_KO_SORTED) {
    if (source.includes(ko)) {
      add(ko)
    }
  }

  const numbered = found
    .filter((token) => /^\d+호선$/.test(token))
    .sort((a, b) => Number(a) - Number(b))
  const named = found.filter((token) => !/^\d+호선$/.test(token))
  return [...numbered, ...named]
}

/**
 * @param {Record<string, unknown>} place
 * @returns {string[]}
 */
export function resolveSubwayLinesEnglish(place) {
  const rawName = String(place.name ?? place.place_name ?? '').trim()
  const category = String(place.categoryName ?? place.category_name ?? '').trim()
  const tokens = [
    ...extractSubwayLineTokens(rawName),
    ...extractSubwayLineTokens(category),
  ]
  const seen = new Set()
  const lines = []
  for (const token of tokens) {
    const en = resolveSubwayLineEnglish(token)
    if (!en || seen.has(en)) {
      continue
    }
    seen.add(en)
    lines.push(en)
  }
  return lines
}

/**
 * @param {string} stationKo
 * @param {Record<string, unknown>} place
 */
function resolveStationEnglishName(stationKo, place) {
  const key = normalizeSubwayStationKey(stationKo)
  if (!key) {
    return ''
  }

  const direct = SUBWAY_STATION_EN.get(key)
  if (direct) {
    return direct
  }

  const entranceMatch = key.match(/^(.+)입구역$/)
  if (entranceMatch) {
    const area = entranceMatch[1]
    const areaEn = SUBWAY_ENTRANCE_AREA_EN.get(area)
    if (areaEn) {
      return areaEn.includes('Station') ? areaEn : `${areaEn} Station`
    }
  }

  if (!isSubwayPlace({ ...place, name: stationKo })) {
    return ''
  }

  const semantic = buildSemanticDisplayName(key)
  if (semantic && /[A-Za-z]/.test(semantic)) {
    return /station/i.test(semantic) ? semantic : `${semantic} Station`
  }
  return ''
}

/**
 * @param {Record<string, unknown>} place
 */
export function isSubwayStationContext(place) {
  if (isSubwayPlace(place)) {
    return true
  }
  const rawName = String(place.name ?? place.place_name ?? '').trim()
  const stationKo = normalizeSubwayStationKey(rawName)
  if (!stationKo) {
    return false
  }
  const category = String(place.categoryName ?? place.category_name ?? '').trim()
  return /지하철|전철|호선|subway/i.test(`${category} ${rawName}`)
}

/**
 * @param {Record<string, unknown>} place
 * @returns {{ nameKo: string, nameEn: string, subwayLines: string[] } | null}
 */
export function resolveSubwayStationDisplay(place) {
  if (!isSubwayStationContext(place)) {
    return null
  }

  const rawName = String(place.name ?? place.place_name ?? '').trim()
  const nameKo = normalizeSubwayStationKey(rawName) || rawName
  const nameEn = resolveStationEnglishName(nameKo, place)
  const subwayLines = resolveSubwayLinesEnglish(place)

  return {
    nameKo,
    nameEn,
    subwayLines,
  }
}

/**
 * @param {string} rawName
 * @param {Record<string, unknown>} [place]
 */
export function resolveSubwayStationEnglishName(rawName, place = {}) {
  const display = resolveSubwayStationDisplay({ ...place, name: rawName })
  return display?.nameEn ?? ''
}
