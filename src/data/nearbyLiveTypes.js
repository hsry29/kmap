/** Live 모드 주변 탐색 — 그룹 + 개별 카테고리 (확장 가능). */
export const NEARBY_LIVE_GROUPS = [
  {
    id: 'food',
    label: 'Food',
    icon: '🍴',
    items: [
      { id: 'FD6', label: 'Restaurants', kind: 'category', code: 'FD6' },
      { id: 'CE7', label: 'Cafes', kind: 'category', code: 'CE7' },
    ],
  },
  {
    id: 'transit',
    label: 'Transit',
    icon: '🚇',
    items: [
      { id: 'SW8', label: 'Subway', kind: 'category', code: 'SW8' },
      { id: 'BUS', label: 'Bus Terminals', kind: 'keyword', keyword: '버스터미널' },
    ],
  },
  {
    id: 'stay',
    label: 'Stay',
    icon: '🏨',
    items: [{ id: 'AD5', label: 'Lodging', kind: 'category', code: 'AD5' }],
  },
  {
    id: 'services',
    label: 'Services',
    icon: '🏦',
    items: [
      { id: 'BK9', label: 'Banks', kind: 'category', code: 'BK9' },
      { id: 'CS2', label: 'Convenience stores', kind: 'category', code: 'CS2' },
    ],
  },
]

/** @deprecated flat list — 그룹에서 자동 생성. */
export const NEARBY_LIVE_TYPES = NEARBY_LIVE_GROUPS.flatMap((group) => group.items)

/** @param {string} tabId */
export function getNearbyLiveSpec(tabId) {
  return NEARBY_LIVE_TYPES.find((item) => item.id === tabId) ?? null
}

/** @param {string} tabId */
export function getNearbyLiveGroupForTab(tabId) {
  return NEARBY_LIVE_GROUPS.find((group) => group.items.some((item) => item.id === tabId)) ?? null
}

/** 음식점·카페 등 밀도가 높은 탭 — 핀 수·화면 분산 보정. */
export const NEARBY_DENSE_TAB_BOOST = {
  FD6: { pageMultiplier: 4, displayMultiplier: 4, spreadGrid: 8 },
  CE7: { pageMultiplier: 1.3, displayMultiplier: 1.35, spreadGrid: 5 },
}

/** @param {string} tabId */
export function getNearbyTabDensityBoost(tabId) {
  return NEARBY_DENSE_TAB_BOOST[tabId] ?? null
}
