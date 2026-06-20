/**
 * Kakao 카테고리 한글 → 영어 Display.
 *
 * 우선순위:
 * 1. 국제 통용 음식명 (Steak, Pizza, Steakhouse)
 * 2. 업종 번역 (Japanese Restaurant, Fusion Japanese)
 * 3. 한국 고유 음식 (Gukbap, Haejangguk)
 * 4. (호출측) 로마자 fallback
 */

import { INTERNATIONAL_FOOD_PAIRS } from './internationalFoodLexicon'
import { KOREAN_FOOD_NAME_PAIRS } from './koreanFoodLexicon'

/** @type {[string, string][]} 업종·시설 (국제음식·한국음식 항목 제외) */
export const CATEGORY_SEMANTIC_PAIRS = [
  ['퓨전일식', 'Fusion Japanese'],
  ['퓨전한식', 'Fusion Korean'],
  ['퓨전중식', 'Fusion Chinese'],
  ['퓨전양식', 'Fusion Western'],
  ['퓨전음식', 'Fusion Cuisine'],
  ['퓨전요리', 'Fusion Cuisine'],
  ['퓨전', 'Fusion'],
  ['이탈리안음식', 'Italian Restaurant'],
  ['이탈리안', 'Italian Restaurant'],
  ['프랑스음식', 'French Restaurant'],
  ['프렌치', 'French Restaurant'],
  ['멕시칸음식', 'Mexican Restaurant'],
  ['멕시칸', 'Mexican Restaurant'],
  ['태국음식', 'Thai Restaurant'],
  ['태국', 'Thai Restaurant'],
  ['베트남음식', 'Vietnamese Restaurant'],
  ['베트남', 'Vietnamese Restaurant'],
  ['인도음식', 'Indian Restaurant'],
  ['인도', 'Indian Restaurant'],
  ['회전초밥', 'Conveyor Belt Sushi'],
  ['이자카야', 'Izakaya'],
  ['삼겹살', 'Pork Belly BBQ'],
  ['고깃집', 'Korean BBQ'],
  ['육류,고기', 'Meat Restaurant'],
  ['해산물,생선', 'Seafood Restaurant'],
  ['해산물', 'Seafood Restaurant'],
  ['생선회', 'Sashimi Restaurant'],
  ['분식', 'Korean Snack Food'],
  ['분식점', 'Korean Snack Food'],
  ['치킨,닭', 'Chicken Restaurant'],
  ['치킨전문점', 'Chicken Restaurant'],
  ['치킨', 'Chicken Restaurant'],
  ['패스트푸드', 'Fast Food'],
  ['한식', 'Korean Restaurant'],
  ['일식', 'Japanese Restaurant'],
  ['중식', 'Chinese Restaurant'],
  ['양식', 'Western Restaurant'],
  ['아시아음식', 'Asian Restaurant'],
  ['뷔페', 'Buffet Restaurant'],
  ['디저트카페', 'Dessert Cafe'],
  ['베이커리', 'Bakery'],
  ['제과', 'Bakery'],
  ['제과점', 'Bakery'],
  ['커피전문점', 'Cafe'],
  ['카페', 'Cafe'],
  ['커피', 'Coffee Shop'],
  ['와인바', 'Wine Bar'],
  ['칵테일바', 'Cocktail Bar'],
  ['위스키바', 'Whiskey Bar'],
  ['포장마차', 'Street Food Pub'],
  ['호프', 'Beer Pub'],
  ['맥주', 'Beer Pub'],
  ['술집', 'Pub'],
  ['주점', 'Pub'],
  ['바', 'Bar'],
  ['라운지', 'Lounge'],
  ['펍', 'Pub'],
  ['음식점', 'Restaurants'],
  ['음식', 'Food & Drink'],
  ['카페,디저트', 'Cafes & Desserts'],
  ['정신건강의학과', 'Psychiatry Clinic'],
  ['재활의학과', 'Rehabilitation Clinic'],
  ['가정의학과', 'Family Medicine Clinic'],
  ['비뇨의학과', 'Urology Clinic'],
  ['이비인후과', 'ENT Clinic'],
  ['성형외과', 'Plastic Surgery Clinic'],
  ['신경외과', 'Neurosurgery Clinic'],
  ['정형외과', 'Orthopedic Clinic'],
  ['산부인과', 'OB-GYN Clinic'],
  ['피부과', 'Dermatology Clinic'],
  ['소아과', 'Pediatrics Clinic'],
  ['신경과', 'Neurology Clinic'],
  ['치과', 'Dental Clinic'],
  ['안과', 'Ophthalmology Clinic'],
  ['내과', 'Internal Medicine Clinic'],
  ['외과', 'Surgery Clinic'],
  ['한의원', 'Korean Medicine Clinic'],
  ['한방병원', 'Korean Medicine Hospital'],
  ['요양병원', 'Nursing Hospital'],
  ['병원', 'Hospital'],
  ['의원', 'Clinic'],
  ['약국', 'Pharmacy'],
  ['의료,건강', 'Medical & Health'],
  ['의료', 'Medical'],
  ['건강', 'Health'],
  ['편의점', 'Convenience Store'],
  ['마트', 'Supermarket'],
  ['슈퍼마켓', 'Supermarket'],
  ['백화점', 'Department Store'],
  ['쇼핑', 'Shopping'],
  ['미용실', 'Hair Salon'],
  ['네일숍', 'Nail Salon'],
  ['학원', 'Academy'],
  ['어린이집', 'Daycare Center'],
  ['유치원', 'Kindergarten'],
  ['노래방', 'Karaoke'],
  ['PC방', 'Internet Cafe'],
  ['헬스', 'Gym'],
  ['피트니스', 'Fitness Center'],
  ['게스트하우스', 'Guesthouse'],
  ['한옥스테이', 'Hanok Stay'],
  ['레지던스', 'Residence'],
  ['호스텔', 'Hostel'],
  ['호텔', 'Hotel'],
  ['모텔', 'Motel'],
  ['펜션', 'Pension'],
  ['관광,명소', 'Attractions'],
  ['관광명소', 'Attractions'],
  ['문화,예술', 'Culture & Arts'],
  ['문화시설', 'Cultural Venue'],
  ['박물관', 'Museum'],
  ['미술관', 'Art Gallery'],
  ['영화관', 'Cinema'],
  ['여행', 'Travel'],
  ['교통,수송', 'Transportation'],
  ['지하철,전철', 'Subway'],
  ['지하철역', 'Subway Station'],
  ['주차장', 'Parking'],
  ['은행', 'Bank'],
  ['가정,생활', 'Home & Living'],
  ['생활서비스', 'Services'],
  ['서비스,산업', 'Services & Industry'],
  ['여가,오락', 'Leisure & Entertainment'],
  ['드럭스토어', 'Drugstore'],
  ['정육점', 'Butcher Shop'],
  ['수산시장', 'Fish Market'],
]

const TIER_LISTS = [
  sortByKoLengthDesc(INTERNATIONAL_FOOD_PAIRS),
  sortByKoLengthDesc(CATEGORY_SEMANTIC_PAIRS),
  sortByKoLengthDesc(KOREAN_FOOD_NAME_PAIRS),
]

function sortByKoLengthDesc(pairs) {
  return [...pairs].sort((a, b) => b[0].length - a[0].length)
}

const EXACT_MAP = buildExactMap()

function buildExactMap() {
  const map = new Map()
  for (const list of [...TIER_LISTS].reverse()) {
    for (const [ko, en] of list) {
      map.set(ko, en)
    }
  }
  return map
}

const ALL_CATEGORY_PAIRS = [
  ...INTERNATIONAL_FOOD_PAIRS,
  ...CATEGORY_SEMANTIC_PAIRS,
  ...KOREAN_FOOD_NAME_PAIRS,
]

const CUISINE_SHORT = {
  일식: 'Japanese',
  한식: 'Korean',
  중식: 'Chinese',
  양식: 'Western',
  아시아음식: 'Asian',
  이탈리안: 'Italian',
  프랑스음식: 'French',
  프렌치: 'French',
  멕시칸: 'Mexican',
  태국: 'Thai',
  베트남: 'Vietnamese',
  인도: 'Indian',
}

const MODIFIER_PREFIX = new Set(['Fusion', 'Traditional', 'Modern'])

const HANGUL = /[\uAC00-\uD7AF]/

function containsHangul(text) {
  return HANGUL.test(String(text ?? ''))
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[·,/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/** @param {string} rest @param {[string, string][]} list */
function matchLongestPrefix(rest, list) {
  for (const [ko, en] of list) {
    if (rest.startsWith(ko)) {
      return { ko, en, len: ko.length }
    }
  }
  return null
}

/** @param {string[]} parts */
function joinCategoryParts(parts) {
  const cleaned = parts.map((p) => String(p ?? '').trim()).filter(Boolean)
  if (cleaned.length === 0) {
    return ''
  }
  if (cleaned.length === 1) {
    return cleaned[0]
  }
  if (cleaned.length === 2 && MODIFIER_PREFIX.has(cleaned[0])) {
    return `${cleaned[0]} ${cleaned[1].replace(/ Restaurant$/i, '')}`.trim()
  }
  return cleaned.join(', ')
}

/** @param {string} segment */
function greedyCategoryTokenize(segment) {
  let rest = segment
  const parts = []
  while (rest.length > 0) {
    let matched = null
    for (const list of TIER_LISTS) {
      matched = matchLongestPrefix(rest, list)
      if (matched) {
        break
      }
    }
    if (!matched) {
      return null
    }
    parts.push(matched.en)
    rest = rest.slice(matched.len)
  }
  return joinCategoryParts(parts)
}

/** @param {string} segment */
function translateHangulSegment(segment) {
  const raw = String(segment ?? '').trim()
  if (!raw || !containsHangul(raw)) {
    return raw || ''
  }

  if (EXACT_MAP.has(raw)) {
    return EXACT_MAP.get(raw)
  }

  for (const [modifierKo, modifierEn] of [
    ['퓨전', 'Fusion'],
    ['전통', 'Traditional'],
    ['현대', 'Modern'],
  ]) {
    if (raw.startsWith(modifierKo) && raw.length > modifierKo.length) {
      const tail = raw.slice(modifierKo.length)
      const cuisine = CUISINE_SHORT[tail] ?? EXACT_MAP.get(tail)?.replace(/ Restaurant$/i, '')
      if (cuisine) {
        return `${modifierEn} ${cuisine}`
      }
    }
  }

  const greedy = greedyCategoryTokenize(raw)
  if (greedy) {
    return greedy
  }

  return ''
}

/**
 * Kakao 카테고리 조각(한글) → 영어 Display.
 * @param {string} term
 * @returns {string} 번역 결과. 실패 시 빈 문자열(호출측에서 로마자 fallback).
 */
export function translateCategorySemantic(term) {
  const value = String(term ?? '').trim()
  if (!value) {
    return ''
  }

  if (!containsHangul(value)) {
    return value
  }

  if (EXACT_MAP.has(value)) {
    return EXACT_MAP.get(value)
  }

  if (/[,/]/.test(value)) {
    const pieces = value
      .split(/[,/]/)
      .map((piece) => translateHangulSegment(piece.trim()))
      .filter(Boolean)
    if (pieces.length > 0) {
      const deduped = []
      const seen = new Set()
      for (const piece of pieces) {
        const key = piece.toLowerCase()
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        deduped.push(piece)
      }
      return deduped.join(', ')
    }
  }

  const segment = translateHangulSegment(value)
  if (segment) {
    return segment
  }

  const normalized = normalizeKey(value)
  for (const [ko, en] of ALL_CATEGORY_PAIRS) {
    if (normalizeKey(ko) === normalized) {
      return en
    }
  }

  return ''
}
