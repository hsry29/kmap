/**

 * 관리자가 검색에서 숨길 장소 (앱 배포 시 모든 사용자에게 적용).

 * Admin 패널에서 추가한 항목은 브라우저 localStorage에도 저장되며,

 * 영구 반영하려면 여기 names / namePatterns 에 넣고 다시 배포하세요.

 */

export const ADMIN_HIDDEN_SEARCH = {

  names: [],

  /** RegExp source strings */

  namePatterns: [],

  keys: [],

}


