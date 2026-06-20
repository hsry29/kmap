/**
 * 큐레이션(테마) 장소 전용 가이드 — 앱 배포 시 모든 사용자에게 적용.
 *
 * 관리자가 상세 카드의 "Curator's guide → Add/Edit" 로 작성한 내용은 우선
 * 브라우저(localStorage, 키: kmap:admin-curation:v1)에만 저장됩니다.
 * 모든 사용자에게 영구 반영하려면, 해당 localStorage 값(또는 exportAdminCurationConfig()
 * 결과)의 entries 를 아래 entries 객체에 붙여넣고 다시 배포하세요.
 *
 * 형식: 장소 id → 가이드 필드
 *   {
 *     'dh-n-seoul-tower': {
 *       whyVisit:   { en: 'Why visit (English)' },  // ko 등 언어 키 확장 가능
 *       bestTime:   { en: 'Best time' },
 *       timeNeeded: { en: 'Duration' },
 *       tips:       { en: 'Tips' },
 *       nextStop:   'Next spot (plain string)',
 *     },
 *   }
 *   (레거시 plain string 도 로드 시 { en: '...' } 로 자동 변환됩니다.)
 *
 * 참고: src/data/places.js 의 장소에 curation: {...} 으로 직접 적은 값이 기본값이며,
 *       여기 entries / localStorage 값이 그 위를 덮어씁니다.
 */
export const ADMIN_CURATION = {
  entries: {},
}
