import { convert } from 'hangul-romanization'
import {
  MEDICAL_DEPARTMENT_PAIRS,
  normalizePlaceEnglishSpacing,
} from './categoryLexicon'
import { KOREAN_FOOD_NAME_PAIRS } from './koreanFoodLexicon'
import { applyLodgingTypePatches, LODGING_TYPE_PAIRS } from './lodgingTypeLexicon'

const HANGUL = /[\uAC00-\uD7AF]/

/** @param {string | undefined | null} s */
export function containsHangul(s) {
  return typeof s === 'string' && HANGUL.test(s)
}

/** 한국 고유 음식 + 일반 메뉴 토큰 (상호 Display Name) */
const FOOD_TOKENS = [
  ...KOREAN_FOOD_NAME_PAIRS,
  ['돈까스', 'Donkatsu'],
  ['라면', 'Ramyeon'],
  ['분식', 'Bunsik'],
  ['치킨', 'Chicken'],
  ['초밥', 'Sushi'],
  ['스시', 'Sushi'],
  ['회', 'Hoe'],
]

/** 지명·상권 — 합쳐서 표기 (Gangnam, Hakdong) */
const LOCATION_TOKENS = [
  ['종합어시장', 'Fish Market'],
  ['어시장', 'Fish Market'],
  ['수산시장', 'Fish Market'],
  ['전통시장', 'Traditional Market'],
  ['상현', 'Sanghyeon'],
  ['판교', 'Pangyo'],
  ['분당', 'Bundang'],
  ['일산', 'Ilsan'],
  ['수원', 'Suwon'],
  ['용인', 'Yongin'],
  ['성남', 'Seongnam'],
  ['고양', 'Goyang'],
  ['부천', 'Bucheon'],
  ['인천', 'Incheon'],
  ['대구', 'Daegu'],
  ['대전', 'Daejeon'],
  ['광주', 'Gwangju'],
  ['울산', 'Ulsan'],
  ['창원', 'Changwon'],
  ['제주', 'Jeju'],
  ['속초', 'Sokcho'],
  ['강릉', 'Gangneung'],
  ['춘천', 'Chuncheon'],
  ['원주', 'Wonju'],
  ['평창', 'Pyeongchang'],
  ['동대문', 'Dongdaemun'],
  ['명동', 'Myeongdong'],
  ['이태원', 'Itaewon'],
  ['홍대', 'Hongdae'],
  ['신촌', 'Sinchon'],
  ['여의도', 'Yeouido'],
  ['잠실', 'Jamsil'],
  ['송파', 'Songpa'],
  ['강동', 'Gangdong'],
  ['천호', 'Cheonho'],
  ['건대입구', 'Konkuk Univ. Station'],
  ['건대', 'Konkuk Univ.'],
  ['왕십리', 'Wangsimni'],
  ['을지로', 'Euljiro'],
  ['종로', 'Jongno'],
  ['광화문', 'Gwanghwamun'],
  ['삼성', 'Samseong'],
  ['역삼', 'Yeoksam'],
  ['선릉', 'Seolleung'],
  ['압구정', 'Apgujeong'],
  ['청담', 'Cheongdam'],
  ['신사', 'Sinsa'],
  ['논현', 'Nonhyeon'],
  ['학동', 'Hakdong'],
  ['도곡', 'Dogok'],
  ['대치', 'Daechi'],
  ['개포', 'Gaepo'],
  ['일원', 'Irwon'],
  ['수서', 'Suseo'],
  ['교대', 'Gyodae'],
  ['서초', 'Seocho'],
  ['방배', 'Bangbae'],
  ['사당', 'Sadang'],
  ['이수', 'Isu'],
  ['노량진', 'Noryangjin'],
  ['영등포', 'Yeongdeungpo'],
  ['여의', 'Yeoui'],
  ['마포', 'Mapo'],
  ['합정', 'Hapjeong'],
  ['상암', 'Sangam'],
  ['연남', 'Yeonnam'],
  ['망원', 'Mangwon'],
  ['공덕', 'Gongdeok'],
  ['용산', 'Yongsan'],
  ['한남', 'Hannam'],
  ['성수', 'Seongsu'],
  ['뚝섬', 'Ttukseom'],
  ['교동', 'Gyodong'],
  ['강남', 'Gangnam'],
  ['서울역', 'Seoul Station'],
  ['서울', 'Seoul'],
  ['부산', 'Busan'],
  ['경주', 'Gyeongju'],
  ['해운대', 'Haeundae'],
  ['서면', 'Seomyeon'],
  ['수지', 'Suji'],
  ['기흥', 'Giheung'],
]

/** 브랜드·체인 — 자연스러운 영문 브랜드명 */
const BRAND_TOKENS = [
  ['광화문국밥', 'Gwanghwamun Gukbap'],
  ['세종한우', 'Sejong Hanwoo'],
  ['교동면옥', 'Gyodong Naengmyeon'],
  ['올리브영', 'Olive Young'],
  ['이마트', 'E-Mart'],
  ['홈플러스', 'Homeplus'],
  ['스타벅스', 'Starbucks'],
  ['투썸플레이스', 'Twosome Place'],
  ['메가커피', 'Mega Coffee'],
  ['컴포즈커피', 'Compose Coffee'],
  ['파리바게뜨', 'Paris Baguette'],
  ['뚜레쥬르', 'Tous Les Jours'],
  ['베스킨라빈스', 'Baskin-Robbins'],
  ['던킨', 'Dunkin'],
  ['맥도날드', 'McDonald\'s'],
  ['버거킹', 'Burger King'],
  ['롯데리아', 'Lotteria'],
  ['교촌치킨', 'Kyochon Chicken'],
  ['네네치킨', 'NeNe Chicken'],
  ['정육점', 'Butcher Shop'],
  ['카페', 'Cafe'],
  ['커피', 'Coffee'],
]

const FOOD_KO_SET = new Set(FOOD_TOKENS.map(([ko]) => ko))

const FACILITY_SUFFIX_OVERRIDES = new Map([
  ['정형외과', 'Orthopedic Clinic'],
  ['의원', 'Clinic'],
  ['병원', 'Hospital'],
  ['학원', 'Academy'],
  ['약국', 'Pharmacy'],
])

/** 시설·과목 접미 — 음식명(FOOD_TOKENS)은 제외 */
const FACILITY_SUFFIX_TOKENS = [
  ...MEDICAL_DEPARTMENT_PAIRS.map(([ko, en]) => [ko, FACILITY_SUFFIX_OVERRIDES.get(ko) ?? en]),
  ['센터', 'Center'],
  ['마트', 'Mart'],
  ['백화점', 'Department Store'],
  ['아울렛', 'Outlet'],
  ...LODGING_TYPE_PAIRS,
  ['미용실', 'Hair Salon'],
  ['네일숍', 'Nail Salon'],
  ['세탁소', 'Laundry'],
  ['주유소', 'Gas Station'],
  ['편의점', 'Convenience Store'],
].filter(([ko]) => !FOOD_KO_SET.has(ko))

/** @type {Record<string, string>} 공백으로 분리된 지점 수식어 */
const STANDALONE_BRANCH_MODIFIERS = {
  본점: '(Main Store)',
  직영점: '(Flagship Store)',
  프리미엄점: '(Premium Branch)',
}

/** 접미사 길이 내림차순 (역점·본점 > 점) */
const END_BRANCH_SUFFIXES = ['역점', '본점', '직영점', '프리미엄점', '지점', '역', '점']

function sortByKoLengthDesc(pairs) {
  return [...pairs].sort((a, b) => b[0].length - a[0].length)
}

const SORTED_FOODS = sortByKoLengthDesc(FOOD_TOKENS)
const SORTED_LOCATIONS = sortByKoLengthDesc(LOCATION_TOKENS)
const SORTED_BRANDS = sortByKoLengthDesc(BRAND_TOKENS)
const SORTED_FACILITY = sortByKoLengthDesc(FACILITY_SUFFIX_TOKENS)

const LOOKUP_MAP = new Map()
for (const list of [SORTED_BRANDS, SORTED_FOODS, SORTED_LOCATIONS, SORTED_FACILITY]) {
  for (const [ko, en] of list) {
    if (!LOOKUP_MAP.has(ko)) {
      LOOKUP_MAP.set(ko, en)
    }
  }
}

/** @param {string} suffix @param {string} prefixEn */
function formatWithBranchSuffix(suffix, prefixEn) {
  const base = String(prefixEn ?? '').trim()
  switch (suffix) {
    case '본점':
      return `${base} (Main Store)`
    case '직영점':
      return `${base} (Flagship Store)`
    case '프리미엄점':
      return `${base} (Premium Branch)`
    case '역점':
      return `${base} Station Branch`
    case '역':
      return `${base} Station`
    case '지점':
    case '점':
      return `${base} Branch`
    default:
      return base
  }
}

/** @param {string} text */
function romanizeMergedWord(text) {
  const hangul = String(text ?? '').match(/[\uAC00-\uD7AF]+/)?.[0] ?? ''
  if (!hangul) {
    return String(text ?? '').trim()
  }
  const roman = convert(hangul)
  if (!roman) {
    return ''
  }
  return roman.charAt(0).toUpperCase() + roman.slice(1)
}

/** @param {string} prefix */
function translatePrefix(prefix) {
  const raw = String(prefix ?? '').trim()
  if (!raw) {
    return ''
  }
  if (!containsHangul(raw)) {
    return raw
  }
  const direct = LOOKUP_MAP.get(raw)
  if (direct) {
    return direct
  }
  return greedyTokenize(raw)
}

/** @param {string} segment */
function greedyTokenize(segment) {
  let rest = segment
  const parts = []
  while (rest.length > 0) {
    let matched = false
    for (const list of [SORTED_BRANDS, SORTED_FOODS, SORTED_LOCATIONS, SORTED_FACILITY]) {
      for (const [ko, en] of list) {
        if (rest.startsWith(ko)) {
          parts.push(en)
          rest = rest.slice(ko.length)
          matched = true
          break
        }
      }
      if (matched) {
        break
      }
    }
    if (matched) {
      continue
    }
    const nextHangul = rest.match(/^[\uAC00-\uD7AF]+/)?.[0]
    if (nextHangul) {
      parts.push(romanizeMergedWord(nextHangul))
      rest = rest.slice(nextHangul.length)
      continue
    }
    const nextOther = rest.match(/^[^ \uAC00-\uD7AF]+/)?.[0]
    if (nextOther) {
      parts.push(nextOther)
      rest = rest.slice(nextOther.length)
      continue
    }
    rest = rest.slice(1)
  }
  return parts.join(' ')
}

/** @param {string} segment */
function tokenizeSegment(segment) {
  const raw = String(segment ?? '').trim()
  if (!raw) {
    return ''
  }
  if (!containsHangul(raw)) {
    return raw
  }

  const whole = LOOKUP_MAP.get(raw)
  if (whole) {
    return whole
  }

  for (const suffix of END_BRANCH_SUFFIXES) {
    if (raw.endsWith(suffix) && raw.length > suffix.length) {
      const prefix = raw.slice(0, -suffix.length)
      const prefixEn = translatePrefix(prefix)
      return formatWithBranchSuffix(suffix, prefixEn).trim()
    }
  }

  for (const [ko, en] of SORTED_FACILITY) {
    if (raw.endsWith(ko) && raw.length > ko.length) {
      const prefix = raw.slice(0, -ko.length)
      const prefixEn = translatePrefix(prefix)
      return `${prefixEn} ${en}`.trim()
    }
    if (raw === ko) {
      return en
    }
  }

  return greedyTokenize(raw)
}

/**
 * @param {string[]} translated
 * @param {string} modifier e.g. "(Main Store)"
 */
function appendBranchModifier(translated, modifier) {
  if (translated.length === 0) {
    translated.push(modifier)
    return
  }
  const last = translated[translated.length - 1]
  translated[translated.length - 1] = `${last} ${modifier}`.trim()
}

/**
 * 한국어 상호명 → 자연스러운 영어 Display Name.
 * 발음(Romanization)은 pronunciation 쪽에서 별도 처리.
 * @param {string} name
 */
export function buildSemanticDisplayName(name) {
  const raw = applyLodgingTypePatches(String(name ?? '').trim())
  if (!raw) {
    return ''
  }
  const parts = raw.split(/\s+/).filter(Boolean)
  const translated = []

  for (const part of parts) {
    const branchMod = STANDALONE_BRANCH_MODIFIERS[part]
    if (branchMod) {
      appendBranchModifier(translated, branchMod)
      continue
    }
    translated.push(tokenizeSegment(part))
  }

  return normalizePlaceEnglishSpacing(translated.filter(Boolean).join(' '))
}
