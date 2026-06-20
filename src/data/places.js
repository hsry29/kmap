// ─────────────────────────────────────────────────────────────────────────────
// 큐레이션 장소 데이터.
//
// 이 파일만 수정하면 지도에 표시되는 장소가 즉시 반영됩니다.
//
// 추가/수정 방법:
//   1) THEME_PLACES[테마] 배열에 객체를 추가하세요.
//   2) image, description, pronunciation 등 선택 필드는 비워두면 자동 fallback.
//   3) 자동 추출 결과(`places.generated.js`)에서 검토 후 좋은 항목만 골라
//      이쪽 배열에 옮겨오시면 됩니다.
//
// 스키마:
//   id            (string)  고유 식별자. 중복되면 React key 충돌이 납니다.
//   region        (string)  도시 라벨. 검색·필터 용도.
//   enName        (string)  영문/표기명. 인포윈도우 제목으로 노출.
//   pronunciation (string?) 발음 가이드. 없으면 미노출.
//   koAddress     (string)  한글 주소. 드라이버 모달에 노출.
//   lat, lng      (number)  위경도.
//   image         (string?) 인포윈도우에 표시할 사진.
//                            • 외부 URL: 'https://example.com/foo.jpg'
//                            • 로컬 파일: '/places/foo.jpg' (public/places/foo.jpg)
//                            비우면 테마 기본 이미지 사용. 로드 실패해도 자동 폴백.
//                            권장: 1200×630 webp, 80KB 이하 (자세한 건 public/places/README.md)
//   description   (string?) 영문 설명.
//   phone         (string?) 전화번호. 있으면 tel: 링크.
//   categoryName  (string?) 카카오 카테고리 라벨. 자동 추출 데이터에 부착.
//   placeUrl      (string?) kakao.map 상세 페이지 URL.
//   koName        (string?) 한글 상호. 있으면 상세 카드에 한글명으로 노출·복사.
//   isPremium     (boolean?) 제휴(파트너) 매장 여부. true면 카테고리/테마 필터와
//                            무관하게 지도에 상시 노출되고, 황금색 마커·Partner 뱃지·
//                            혜택 강조가 적용됨. 비우면 false. (향후 DB의 is_premium 컬럼과 매핑)
//   partnerPerk   (string?) 제휴 매장 전용 공지/혜택 문구. 상세창 최상단에 강조 노출.
//                            예: '주차 2시간 무료 · 화면 제시 시 웰컴 쿠폰'
//   curation      (object?) 큐레이션(테마) 장소 전용 가이드. 관리자가 직접 채우는
//                            소개 문구로, 상세 카드에 'Curator's guide' 섹션으로 노출됨.
//                            필드(모두 string, 비우면 미노출):
//                              whyVisit   왜 가야 하는가 (Why Visit?)
//                              bestTime   언제 가야 하는가 (Best Time)
//                              timeNeeded 얼마나 걸리는가 (Time Needed)
//                              tips       주의사항 (Tips)
//                              nextStop   다음 추천 장소 (Next Stop)
//                            관리자 패널/상세 카드에서 수정하면 localStorage 에 저장되어
//                            여기 값을 덮어씁니다. (향후 DB 연동 시 컬럼으로 매핑)
// ─────────────────────────────────────────────────────────────────────────────

const STOCK_IMG = {
  city: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=800&q=80',
  history: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
  hike: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
  demon: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=800&q=80',
}

// 각 테마의 기본 이미지. 항목별 `image`가 비었을 때 이 값이 사용됨.
export const THEME_DEFAULT_IMAGE = {
  'K-POP': STOCK_IMG.city,
  History: STOCK_IMG.history,
  Hiking: STOCK_IMG.hike,
  DemonHunters: STOCK_IMG.demon,
}

// 테마별 UI 마커 (App.jsx 에서 사용). 비어 있으면 카카오 기본 마커.
// src 는 public/ 경로 또는 절대 URL.
const THEME_PIN = { width: 40, height: 48 }
const THEME_PIN_ANCHOR = { x: 20, y: 48 }

export const THEME_MARKER = {
  'K-POP': {
    src: '/marker-kpop.svg',
    size: THEME_PIN,
    options: { offset: THEME_PIN_ANCHOR },
  },
  History: {
    src: '/marker-history.svg',
    size: THEME_PIN,
    options: { offset: THEME_PIN_ANCHOR },
  },
  Hiking: {
    src: '/marker-hiking.svg',
    size: THEME_PIN,
    options: { offset: THEME_PIN_ANCHOR },
  },
  DemonHunters: {
    src: '/marker-demon.svg',
    size: THEME_PIN,
    options: { offset: THEME_PIN_ANCHOR },
  },
}

// 테마별 인포윈도우 배지 (있으면 인포윈도우 상단에 표시).
export const THEME_BADGE = {
  DemonHunters: 'Battle Scene · Key combat locations from the story',
}

export const THEMES = Object.keys(THEME_DEFAULT_IMAGE)

// 검색창에서 "Seoul", "Busan" 등으로 지도를 빠르게 이동할 때 쓰이는 좌표.
export const REGION_COORDS = {
  Seoul: { lat: 37.5665, lng: 126.978, level: 7 },
  Busan: { lat: 35.1796, lng: 129.0756, level: 7 },
  Jeju: { lat: 33.4996, lng: 126.5312, level: 8 },
  Gyeongju: { lat: 35.8562, lng: 129.2247, level: 7 },
  Yongin: { lat: 37.2411, lng: 127.1776, level: 7 },
  Suji: { lat: 37.3221, lng: 127.0975, level: 6 },
  Seongbokcheon: { lat: 37.3128, lng: 127.0788, level: 5 },
}

// ─── 원본(raw) 데이터 ───────────────────────────────────────────────────────
// 이쪽에 항목만 늘려가면 됩니다. category 와 image 는 아래 withDefaults() 가
// 자동으로 채워줍니다.

const RAW_THEME_PLACES = {
  'K-POP': [
    { id: 'hybe-seoul', region: 'Seoul', enName: 'HYBE Headquarters', pronunciation: 'ha-i-beu', koAddress: '서울특별시 용산구 한강대로 42', lat: 37.524954, lng: 126.964735, description: 'Global K-POP entertainment headquarters near Yongsan.' },
    { id: 'sm-seongsu', region: 'Seoul', enName: 'SM Seongsu', pronunciation: 'eseu-em seong-su', koAddress: '서울특별시 성동구 왕십리로 83-21', lat: 37.5446, lng: 127.0557, description: 'Fan-favorite K-POP destination in Seongsu district.' },
    { id: 'kstarroad', region: 'Seoul', enName: 'K-Star Road', pronunciation: 'kei-seu-ta ro-deu', koAddress: '서울특별시 강남구 압구정로 423', lat: 37.5231, lng: 127.0386, description: 'Gangnam road with K-POP character sculptures and shops.' },
    { id: 'jyp-center', region: 'Seoul', enName: 'JYP Entertainment Center', pronunciation: 'jei-wa-i-pi', koAddress: '서울특별시 강동구 강동대로 205', lat: 37.5257, lng: 127.1287, description: 'Entertainment office linked to many global idol groups.' },
    { id: 'yg-hapjeong', region: 'Seoul', enName: 'YG Entertainment', pronunciation: 'wa-i-ji', koAddress: '서울특별시 마포구 희우정로1길 7', lat: 37.5494, lng: 126.9087, description: 'Popular stop for fans around Hapjeong area.' },
    { id: 'coex-kculture', region: 'Seoul', enName: 'COEX K-Culture Zone', pronunciation: 'ko-ek-seu', koAddress: '서울특별시 강남구 영동대로 513', lat: 37.5116, lng: 127.0592, description: 'Events, fandom pop-ups, and K-content exhibitions.' },
    { id: 'busan-cinema', region: 'Busan', enName: 'Busan Cinema Center', pronunciation: 'bu-san si-ne-ma', koAddress: '부산광역시 해운대구 수영강변대로 120', lat: 35.1712, lng: 129.1277, description: 'Major venue for Korean music and film festivals.' },
    { id: 'seomyeon-kstreet', region: 'Busan', enName: 'Seomyeon K-Street', pronunciation: 'seo-myeon', koAddress: '부산광역시 부산진구 서면로 68', lat: 35.1579, lng: 129.0592, description: 'Trendy youth district with idol stores and cafes.' },
    { id: 'jeju-kpop-cafe', region: 'Jeju', enName: 'Jeju K-POP Cafe Street', pronunciation: 'je-ju', koAddress: '제주특별자치도 제주시 노형로 95', lat: 33.4889, lng: 126.4766, description: 'Island fan spots with K-POP themed cafes and goods.' },
    { id: 'gyeongju-hwangridan', region: 'Gyeongju', enName: 'Hwangridan K-Culture Street', pronunciation: 'hwang-ri-dan', koAddress: '경상북도 경주시 포석로 1080', lat: 35.8366, lng: 129.2155, description: 'Hip street blending heritage and modern K-culture.' },
    { id: 'yongin-everland-kpop', region: 'Yongin', enName: 'Everland K-Music Festival Ground', pronunciation: 'e-beo-raen-deu', koAddress: '경기도 용인시 처인구 포곡읍 에버랜드로 199', lat: 37.2945, lng: 127.2024, description: 'Large event space hosting occasional Korean pop shows.' },
    { id: 'suji-youth-stage', region: 'Yongin', enName: 'Suji Youth Culture Stage', pronunciation: 'su-ji', koAddress: '경기도 용인시 수지구 풍덕천로 122', lat: 37.3228, lng: 127.0957, description: 'Local performance stage popular with youth dance teams.' },
    // ── 카카오 Local API 매칭 결과 (resolve:names) ─────────────────────────
    { id: 'kwangya-seoul', region: 'Seoul', enName: 'KWANGYA@SEOUL', pronunciation: 'gwang-ya', koAddress: '서울 성동구 왕십리로 83-21', lat: 37.544455, lng: 127.044301, phone: '02-6233-6729', placeUrl: 'http://place.map.kakao.com/673687562', description: 'Official SM Entertainment store: albums, artist goods, and exhibitions in Seongsu.', isPremium: true, partnerPerk: 'Partner store · Free 2-hour parking · Show this screen for a welcome photocard' },
    { id: 'ktown4u-academy', region: 'Seoul', enName: 'Ktown4u Academy (COEX)', pronunciation: 'kei-ta-un-po-yu', koAddress: '서울 강남구 영동대로 513', lat: 37.511517, lng: 127.058318, placeUrl: 'http://place.map.kakao.com/718837181', description: 'Hands-on K-POP dance classes for visiting fans.', isPremium: true, partnerPerk: '10% off any class for app users · Free trial lesson on weekdays' },
    { id: '1million-dance', region: 'Seoul', enName: '1MILLION Dance Studio', pronunciation: 'won-mil-li-eon', koAddress: '서울 성동구 뚝섬로13길 33', lat: 37.541179, lng: 127.057572, phone: '02-512-6756', placeUrl: 'http://place.map.kakao.com/26463372', description: 'Famous K-POP choreographer studio in Seongsu offering open dance classes.' },
    { id: 'dongdaemun-market-kpop', region: 'Seoul', enName: 'Dongdaemun Wholesale Market', pronunciation: 'dong-dae-mun', koAddress: '서울 종로구 종로 266', lat: 37.570421, lng: 127.007618, phone: '02-2262-0114', placeUrl: 'http://place.map.kakao.com/8272010', description: 'Wholesale market beloved by fans for DIY photocard cases, lightstick ribbons, and supplies.' },
    { id: 'gwanghwamun-plaza', region: 'Seoul', enName: 'Gwanghwamun Plaza', pronunciation: 'gwang-hwa-mun', koAddress: '서울 종로구 세종로 1-68', lat: 37.572603, lng: 126.976916, placeUrl: 'http://place.map.kakao.com/8193961', description: 'Iconic Seoul plaza that frequently hosts large-scale K-POP performances.' },
    { id: 'kspo-dome', region: 'Seoul', enName: 'KSPO Dome (Olympic Park)', pronunciation: 'kei-eseu-pi-o-dom', koAddress: '서울 송파구 올림픽로 424', lat: 37.519261, lng: 127.127400, placeUrl: 'http://place.map.kakao.com/13314685', description: 'Major K-POP concert venue inside Olympic Park.' },
    { id: 'hongdae-walking-street', region: 'Seoul', enName: 'Hongdae Walking Street', pronunciation: 'hong-dae', koAddress: '서울 마포구 서교동 348-40', lat: 37.555941, lng: 126.924264, description: 'Hongdae pedestrian street famous for K-POP cover dance buskers.' },
  ],

  // 작품 'K-POP 데몬헌터스(KPop Demon Hunters)' 등장 장소.
  // 사용자 큐레이션 데이터 — 항목을 추가하려면 아래 배열에 객체를 push 하세요.
  DemonHunters: [
    {
      id: 'dh-gwanghwamun-plaza',
      region: 'Seoul',
      enName: 'Gwanghwamun Plaza',
      pronunciation: 'gwang-hwa-mun',
      koAddress: '서울 종로구 세종대로 172',
      lat: 37.572603,
      lng: 126.976916,
      placeUrl: 'http://place.map.kakao.com/8193961',
      description: 'Opening-act battlefield — first large-scale clash between Hunters and a high-tier demon that appeared among the crowd.',
    },
    {
      id: 'dh-gangnam-exit11',
      region: 'Seoul',
      enName: 'Gangnam Station Exit 11 & M Stage',
      pronunciation: 'gang-nam-yeok',
      koAddress: '서울 강남구 강남대로 406 일대',
      lat: 37.498833,
      lng: 127.027503,
      placeUrl: 'http://place.map.kakao.com/22906013',
      description: 'Neon-lit downtown stage where the protagonist first awakens her powers and chases a demon through the crowd.',
    },
    {
      id: 'dh-sevit-islets',
      region: 'Seoul',
      enName: 'Some Sevit (Floating Islands)',
      pronunciation: 'se-bit-seom',
      koAddress: '서울 서초구 올림픽대로 2085-14',
      lat: 37.512332,
      lng: 126.995889,
      phone: '1566-3433',
      placeUrl: 'http://place.map.kakao.com/12322745',
      description: 'Night-time duel arena — the brightly-lit floating islands where the team strategises and battles an aquatic demon rising from the Han River.',
    },
    {
      id: 'dh-nakwon-arcade',
      region: 'Seoul',
      enName: 'Nakwon Musical Instruments Arcade',
      pronunciation: 'nak-won-ak-gi-sang-ga',
      koAddress: '서울 종로구 삼일대로 428',
      lat: 37.572792,
      lng: 126.988096,
      phone: '1599-1968',
      placeUrl: 'http://place.map.kakao.com/11504818',
      description: 'Spiritual-weapon vault — vintage instrument arcade that doubles as a secret hideout for repairing antique spirit weapons.',
    },
    {
      id: 'dh-yeonmujang-gil',
      region: 'Seoul',
      enName: 'Seongsu Yeonmujang-gil (Abandoned Factory District)',
      pronunciation: 'yeon-mu-jang-gil',
      koAddress: '서울 성동구 연무장길 일대',
      lat: 37.544600,
      lng: 127.056000,
      description: 'Demon hideout — a trendy cafe street by day, but an abandoned warehouse here is used to trap human souls behind a demonic barrier.',
    },
    {
      id: 'dh-n-seoul-tower',
      region: 'Seoul',
      enName: 'N Seoul Tower (Namsan)',
      pronunciation: 'en-seo-ul-ta-wo',
      koAddress: '서울 용산구 남산공원길 105',
      lat: 37.551305,
      lng: 126.988231,
      placeUrl: 'http://place.map.kakao.com/3286026',
      description: 'Final battleground — Hunters fight the climactic battle here to shatter the giant barrier threatening to engulf all of Seoul.',
      curation: {
        whyVisit: 'The easiest landmark for first-timers to take in the full Seoul night skyline in one sweep.',
        bestTime: 'Arrive about 30 minutes before sunset to catch both the golden hour and the city lights.',
        timeNeeded: 'Around 1.5–2 hours including the cable car ride up and down.',
        tips: 'Weekend evenings get very crowded. The open-air viewing deck beats the indoor observatory for photos.',
        nextStop: 'Walk down to Myeongdong (about 15 min) for late-night street food and shopping.',
      },
    },
  ],

  History: [
    { id: 'gyeongbokgung', region: 'Seoul', enName: 'Gyeongbokgung Palace', pronunciation: 'gyeong-bok-gung', koAddress: '서울특별시 종로구 사직로 161', lat: 37.579617, lng: 126.977041, description: 'Largest Joseon palace with royal architecture.' },
    { id: 'changdeokgung', region: 'Seoul', enName: 'Changdeokgung Palace', pronunciation: 'chang-deok-gung', koAddress: '서울특별시 종로구 율곡로 99', lat: 37.579435, lng: 126.991023, description: 'UNESCO heritage palace with a famous secret garden.' },
    { id: 'deoksugung', region: 'Seoul', enName: 'Deoksugung Palace', pronunciation: 'deok-su-gung', koAddress: '서울특별시 중구 세종대로 99', lat: 37.5658, lng: 126.9752, description: 'Historic palace mixing Korean and Western architecture.' },
    { id: 'jongmyo', region: 'Seoul', enName: 'Jongmyo Shrine', pronunciation: 'jong-myo', koAddress: '서울특별시 종로구 종로 157', lat: 37.5744, lng: 126.9942, description: 'Important Confucian shrine and UNESCO heritage site.' },
    { id: 'war-memorial', region: 'Seoul', enName: 'War Memorial of Korea', pronunciation: 'wo me-mo-ri-eol', koAddress: '서울특별시 용산구 이태원로 29', lat: 37.5361, lng: 126.977, description: 'Museum covering key periods of Korean history.' },
    { id: 'national-museum-korea', region: 'Seoul', enName: 'National Museum of Korea', pronunciation: 'gung-nip jung-ang bang-mul-gwan', koAddress: '서울특별시 용산구 서빙고로 137', lat: 37.52399, lng: 126.98032, description: 'Korea’s flagship museum—archaeology, fine arts, and rotating exhibitions spanning prehistory to modern times.' },
    { id: 'haedong-yonggungsa', region: 'Busan', enName: 'Haedong Yonggungsa Temple', pronunciation: 'hae-dong yong-gung-sa', koAddress: '부산광역시 기장군 기장읍 용궁길 86', lat: 35.1888, lng: 129.2234, description: 'Oceanfront Buddhist temple with dramatic coastal views.' },
    { id: 'beomeosa', region: 'Busan', enName: 'Beomeosa Temple', pronunciation: 'beo-meo-sa', koAddress: '부산광역시 금정구 범어사로 250', lat: 35.2733, lng: 129.0849, description: 'Ancient mountain temple known for serene atmosphere.' },
    { id: 'seokguram', region: 'Gyeongju', enName: 'Seokguram Grotto', pronunciation: 'seok-gu-ram', koAddress: '경상북도 경주시 진현동 999', lat: 35.7945, lng: 129.3495, description: 'UNESCO grotto with iconic stone Buddha statue.' },
    { id: 'bulguksa', region: 'Gyeongju', enName: 'Bulguksa Temple', pronunciation: 'bul-guk-sa', koAddress: '경상북도 경주시 불국로 385', lat: 35.79, lng: 129.331, description: 'Classic Silla-era temple and must-visit heritage site.' },
    { id: 'daereungwon', region: 'Gyeongju', enName: 'Daereungwon Tomb Complex', pronunciation: 'dae-reung-won', koAddress: '경상북도 경주시 황남동 31-1', lat: 35.8385, lng: 129.2111, description: 'Ancient royal tombs from the Silla kingdom period.' },
    { id: 'jeju-mokgwana', region: 'Jeju', enName: 'Jeju Mokgwana Government Office', pronunciation: 'mok-gwa-na', koAddress: '제주특별자치도 제주시 관덕로 25', lat: 33.513, lng: 126.5213, description: 'Restored Joseon-era local government complex in Jeju.' },
    { id: 'yongin-folk-village', region: 'Yongin', enName: 'Korean Folk Village', pronunciation: 'han-guk min-sok-chon', koAddress: '경기도 용인시 기흥구 민속촌로 90', lat: 37.2597, lng: 127.1178, description: 'Living museum showing traditional houses and customs.' },
  ],

  Hiking: [
    { id: 'bukhansan', region: 'Seoul', enName: 'Bukhansan National Park', pronunciation: 'bu-kan-san', koAddress: '서울특별시 강북구 우이동 산1-1', lat: 37.658658, lng: 126.977751, description: 'Classic Seoul mountain for all hiking levels.' },
    { id: 'namsan', region: 'Seoul', enName: 'Namsan Trail', pronunciation: 'nam-san', koAddress: '서울특별시 용산구 남산공원길 105', lat: 37.551169, lng: 126.988227, description: 'Easy city trail with Seoul skyline views.' },
    { id: 'gwanaksan', region: 'Seoul', enName: 'Gwanaksan Mountain', pronunciation: 'gwan-ak-san', koAddress: '서울특별시 관악구 신림동 산56-1', lat: 37.445, lng: 126.9642, description: 'Popular ridge hike in southern Seoul.' },
    { id: 'hwangnyeongsan', region: 'Busan', enName: 'Hwangnyeongsan Mountain', pronunciation: 'hwang-nyeong-san', koAddress: '부산광역시 부산진구 전포동 산50-1', lat: 35.157, lng: 129.0892, description: 'Night viewpoint mountain over Busan city lights.' },
    { id: 'jangsan', region: 'Busan', enName: 'Jangsan Mountain', pronunciation: 'jang-san', koAddress: '부산광역시 해운대구 좌동 산74', lat: 35.1934, lng: 129.1764, description: 'Sea-facing ridge routes near Haeundae beaches.' },
    { id: 'hallasan', region: 'Jeju', enName: 'Hallasan Mountain', pronunciation: 'hal-la-san', koAddress: '제주특별자치도 제주시 1100로 2070-61', lat: 33.3617, lng: 126.5292, description: 'Highest mountain in Korea with crater views.' },
    { id: 'oreum-trail', region: 'Jeju', enName: 'Jeju Oreum Trail', pronunciation: 'o-reum', koAddress: '제주특별자치도 제주시 구좌읍 비자림로 1456', lat: 33.4485, lng: 126.7985, description: 'Volcanic cone trails with open grassland scenery.' },
    { id: 'tohamsan', region: 'Gyeongju', enName: 'Tohamsan Mountain Trail', pronunciation: 'to-ham-san', koAddress: '경상북도 경주시 진현동 산33-1', lat: 35.7904, lng: 129.3497, description: 'Forest trail linking cultural heritage sites.' },
    { id: 'namsan-gyeongju', region: 'Gyeongju', enName: 'Gyeongju Namsan Trail', pronunciation: 'gyeong-ju nam-san', koAddress: '경상북도 경주시 배동 30-1', lat: 35.7924, lng: 129.2287, description: 'Historic mountain trails with stone relics.' },
    { id: 'gwanggyo', region: 'Yongin', enName: 'Gwanggyosan Mountain', pronunciation: 'gwang-gyo-san', koAddress: '경기도 용인시 수지구 성복동 산83-1', lat: 37.3335, lng: 127.0479, description: 'Popular mountain near Suji and Pangyo areas.' },
    { id: 'seongbokcheon-trail', region: 'Yongin', enName: 'Seongbokcheon Riverside Trail', pronunciation: 'seong-bok-cheon', koAddress: '경기도 용인시 수지구 성복동 33-1', lat: 37.3128, lng: 127.0788, description: 'Easy waterside walk ideal for local exploration.' },
    { id: 'bojeong-forest', region: 'Yongin', enName: 'Bojeong Forest Walk', pronunciation: 'bo-jeong', koAddress: '경기도 용인시 기흥구 보정동 1265', lat: 37.3092, lng: 127.1099, description: 'Quiet neighborhood forest paths in Yongin.' },
    // ── 서울 하이킹 & 산책 (큐레이션) ─────────────────────────────────────
    { id: 'hike-namsan-dulle', region: 'Seoul', enName: 'Namsan Dulle-gil (Easy Walk)', pronunciation: 'nam-san dul-le-gil', koAddress: '서울 중구 회현동1가 산1-45', lat: 37.553759, lng: 126.982413, description: 'Gentle slopes and a very popular loop: enjoy N Seoul Tower and the downtown panorama at an easy pace.' },
    { id: 'hike-bukhansan-baekundae', region: 'Seoul', enName: 'Bukhansan Baekundae Peak', pronunciation: 'baek-un-dae', koAddress: '서울 강북구 우이동 산68-1', lat: 37.665598, lng: 126.998550, description: 'Seoul’s highest peak: scramble rocky ridges for thrills, then take in a sweeping city view from the summit.' },
    { id: 'hike-inwang-fortress', region: 'Seoul', enName: 'Inwangsan Fortress Wall Trail', pronunciation: 'in-wang-san', koAddress: '서울 종로구 무악동 산2-1', lat: 37.578888, lng: 126.960584, description: 'Walk along the Hanyang Fortress wall—especially magical at night when Seoul’s lights meet the lit ramparts.' },
    { id: 'hike-achasan-yongmasan', region: 'Seoul', enName: 'Achasan & Yongmasan', pronunciation: 'a-cha-san yong-ma-san', koAddress: '서울 광진구 구의동 산21', lat: 37.566844, lng: 127.102742, description: 'Moderate trails famous for sunrise and sunset; wide-open views over the Han River.' },
    { id: 'hike-gwanak-yeonjudae', region: 'Seoul', enName: 'Gwanaksan Yeonjudae Rock', pronunciation: 'yeon-ju-dae', koAddress: '서울 관악구 신림동 산56-1', lat: 37.444906, lng: 126.964177, description: 'Signature southern Seoul peak with dramatic cliffs and the iconic Yeonjudae rock platform near the top.' },
    { id: 'hike-cheonggyesan-maebong', region: 'Seoul', enName: 'Cheonggyesan Maebong', pronunciation: 'cheong-gye-san mae-bong', koAddress: '서울 서초구 원지동 산4-1', lat: 37.449662, lng: 127.038015, description: 'Lots of stairs (“stair mountain”) but a clear, well-maintained trail—beginner-friendly with steady foot traffic.' },
    { id: 'hike-ansan-jarak', region: 'Seoul', enName: 'Ansan Jarak-gil (Barrier-free Deck)', pronunciation: 'an-san ja-rak-gil', koAddress: '서울 서대문구 봉원동 산1', lat: 37.575610, lng: 126.946227, description: 'Flat wooden boardwalks loop the hill—strollers and wheelchairs welcome for a light forest outing.' },
    { id: 'hike-bugaksan-fortress', region: 'Seoul', enName: 'Bugaksan Hanyang Fortress Trail', pronunciation: 'bu-gak-san', koAddress: '서울 종로구 청운동 산1-1', lat: 37.591346, lng: 126.971829, description: 'Historic fortress segments near the former Blue House zone—nature and Joseon-era wall history in one hike.' },
    { id: 'hike-seoul-forest', region: 'Seoul', enName: 'Seoul Forest (Trail Start)', pronunciation: 'seo-ul-sup', koAddress: '서울 성동구 성수동1가 685-20', lat: 37.543070, lng: 127.041799, description: 'Start in the urban forest; many hikers cross the Rainbow Bridge toward Eungbongsan for forsythia and night views.' },
    { id: 'hike-eungbongsan', region: 'Seoul', enName: 'Eungbongsan Octagonal Pavilion', pronunciation: 'eung-bong-san', koAddress: '서울 성동구 응봉동 267-1', lat: 37.547820, lng: 127.029909, description: 'Classic finish of the Seoul Forest loop—octagonal pavilion views especially popular for spring flowers and evening skylines.' },
    { id: 'hike-suraksan', region: 'Seoul', enName: 'Suraksan (Waterfall Course)', pronunciation: 'su-rak-san', koAddress: '서울 노원구 상계동 산155-1', lat: 37.683328, lng: 127.090168, description: 'Boulders and a refreshing waterfall make this a favourite summer hike in northern Seoul.' },
  ],
}

/** 테마 큐레이션 장소 id → 한글 상호 (`koName` 미지정 시 withDefaults 에서 주입) */
const THEME_KO_NAMES = {
  'hybe-seoul': '하이브',
  'sm-seongsu': 'SM성수',
  kstarroad: '케이스타로드',
  'jyp-center': 'JYP엔터테인먼트',
  'yg-hapjeong': 'YG엔터테인먼트',
  'coex-kculture': '코엑스 K컬처존',
  'busan-cinema': '부산영화의전당',
  'seomyeon-kstreet': '서면 K스트리트',
  'jeju-kpop-cafe': '제주 K팝 카페거리',
  'gyeongju-hwangridan': '황리단길',
  'yongin-everland-kpop': '에버랜드 K뮤직 페스티벌장',
  'suji-youth-stage': '수지청년문화무대',
  'kwangya-seoul': '광야@서울',
  'ktown4u-academy': '케이타운포유 아카데미',
  '1million-dance': '1MILLION 댄스 스튜디오',
  'dongdaemun-market-kpop': '동대문종합시장',
  'gwanghwamun-plaza': '광화문광장',
  'kspo-dome': 'KSPO돔',
  'hongdae-walking-street': '홍대 걷고싶은거리',
  'dh-gwanghwamun-plaza': '광화문광장',
  'dh-gangnam-exit11': '강남역 11번 출구',
  'dh-sevit-islets': '세빛섬',
  'dh-nakwon-arcade': '낙원악기상가',
  'dh-yeonmujang-gil': '연무장길',
  'dh-n-seoul-tower': 'N서울타워',
  gyeongbokgung: '경복궁',
  changdeokgung: '창덕궁',
  deoksugung: '덕수궁',
  jongmyo: '종묘',
  'war-memorial': '전쟁기념관',
  'national-museum-korea': '국립중앙박물관',
  'haedong-yonggungsa': '해동용궁사',
  beomeosa: '범어사',
  seokguram: '석굴암',
  bulguksa: '불국사',
  daereungwon: '대릉원',
  'jeju-mokgwana': '제주목관아',
  'yongin-folk-village': '한국민속촌',
  bukhansan: '북한산국립공원',
  namsan: '남산 둘레길',
  gwanaksan: '관악산',
  hwangnyeongsan: '황령산',
  jangsan: '장산',
  hallasan: '한라산',
  'oreum-trail': '제주 오름길',
  tohamsan: '토함산',
  'namsan-gyeongju': '경주 남산',
  gwanggyo: '광교산',
  'seongbokcheon-trail': '성복천 산책로',
  'bojeong-forest': '보정숲길',
  'hike-namsan-dulle': '남산 둘레길',
  'hike-bukhansan-baekundae': '북한산 백운대',
  'hike-inwang-fortress': '인왕산 한양도성',
  'hike-achasan-yongmasan': '아차산·용마산',
  'hike-gwanak-yeonjudae': '관악산 연주대',
  'hike-cheonggyesan-maebong': '청계산 매봉',
  'hike-ansan-jarak': '안산 자락길',
  'hike-bugaksan-fortress': '북악산 한양도성',
  'hike-seoul-forest': '서울숲',
  'hike-eungbongsan': '응봉산 팔각정',
  'hike-suraksan': '수락산',
}

// ─── 후처리 ─────────────────────────────────────────────────────────────────
// category 와 image 를 자동 주입. 사용자는 RAW_THEME_PLACES 만 손대면 됨.

function withDefaults(theme, places) {
  return places.map((place) => ({
    ...place,
    category: theme,
    image: place.image || THEME_DEFAULT_IMAGE[theme],
    koName: place.koName ?? THEME_KO_NAMES[place.id],
    // 제휴(파트너) 매장 플래그. DB 연동 시 is_premium 컬럼으로 대체 예정.
    isPremium: place.isPremium ?? false,
    partnerPerk: place.partnerPerk ?? '',
    // 큐레이션 가이드(테마 장소 전용). 관리자가 localStorage 로 덮어쓸 수 있음.
    curation: place.curation ?? null,
  }))
}

export const THEME_PLACES = Object.fromEntries(
  Object.entries(RAW_THEME_PLACES).map(([theme, places]) => [theme, withDefaults(theme, places)]),
)

// 비어 있는 테마는 UI 칩에서 자동으로 숨김 (사용자가 채울 때까지 노출 안 됨)
export const ACTIVE_THEMES = Object.keys(THEME_PLACES).filter(
  (theme) => THEME_PLACES[theme].length > 0,
)

// ─── 편의시설(편의점/환전소) ────────────────────────────────────────────────

export const CONVENIENCE_PLACES = {
  store: [
    { id: 'store-seoul', name: 'CU Myeongdong', lat: 37.5628, lng: 126.9853 },
    { id: 'store-busan', name: 'GS25 Haeundae', lat: 35.1601, lng: 129.1616 },
    { id: 'store-jeju', name: '7-Eleven Jeju', lat: 33.4912, lng: 126.5332 },
    { id: 'store-gyeongju', name: 'CU Gyeongju', lat: 35.839, lng: 129.2114 },
    { id: 'store-yongin', name: 'GS25 Suji', lat: 37.3205, lng: 127.0958 },
  ],
  exchange: [
    { id: 'exchange-seoul', name: 'Myeongdong Exchange', lat: 37.5634, lng: 126.9829 },
    { id: 'exchange-busan', name: 'Seomyeon Exchange', lat: 35.1579, lng: 129.0592 },
    { id: 'exchange-jeju', name: 'Jeju City Exchange', lat: 33.5002, lng: 126.5297 },
    { id: 'exchange-gyeongju', name: 'Gyeongju Exchange', lat: 35.8409, lng: 129.2132 },
    { id: 'exchange-yongin', name: 'Yongin Exchange', lat: 37.2415, lng: 127.1771 },
  ],
}
