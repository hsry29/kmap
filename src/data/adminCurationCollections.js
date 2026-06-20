/**
 * 영구 큐레이션 컬렉션 — 앱 배포 시 모든 사용자에게 적용되는 기본 목록.
 *
 * 관리자 패널(Curation 탭)에서 만든 컬렉션은 우선 브라우저(localStorage,
 * 키: kmap:admin-collections:v1)에만 저장됩니다.
 * 모든 사용자에게 영구 반영하려면, 패널의 "Copy collections (JSON)" 버튼으로
 * 복사한 내용을 아래 collections 배열에 붙여넣고 다시 배포하세요.
 *
 * 컬렉션 = 큐레이션 모드 상단 카테고리 칩 한 개(예: 'Seoul Night View Tour').
 * 각 항목 형식:
 *   {
 *     id: 'col-...',                 // 안정 식별자(중복 금지)
 *     title: 'Seoul Night View Tour',// 칩/카테고리 표시명(중복 금지)
 *     type: 'route',                 // 'route' | 'spots' (기본 route)
 *     pin: 'default',                // 핀 디자인 id (src/data/pinDesigns.js 참고)
 *     status: 'draft',               // 'draft' | 'published' — draft 는 사용자에게 미노출
 *     places: [
 *       {
 *         id: 'colplace-...',        // 안정 식별자
 *         enName: 'N Seoul Tower',   // 영문 표시명(비우면 한글 발음 표시)
 *         koName: 'N서울타워',
 *         lat: 37.551305, lng: 126.988231,
 *         koAddress: '서울 용산구 남산공원길 105',
 *         phone: '', placeUrl: '', kakaoId: '',
 *         imageUrl: '',                 // optional hero image URL for place detail card
 *         isPremium: false, partnerPerk: '',
 *         curation: {                // 큐레이터 가이드(비우면 미노출)
 *           whyVisit: { en: '...' }, bestTime: { en: '...' },
 *           timeNeeded: { en: '...' }, tips: { en: '...' },
 *           nextStop: '',
 *         },
 *       },
 *     ],
 *   }
 */
export const ADMIN_CURATION_COLLECTIONS = {
  collections: [],
}
