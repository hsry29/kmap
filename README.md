# Kmap

외국인 대상 한국 여행 지도 웹사이트의 초기 프로젝트입니다.

## 1) 카카오 키 설정

1. 프로젝트 루트에 `.env` 파일을 만듭니다.
2. 아래처럼 키를 넣습니다.

```bash
# 지도 표시용 (Kakao Developers > JavaScript 키)
VITE_KAKAO_MAP_KEY=여기에_카카오_JavaScript_키

# 장소 자동 추출용 (Kakao Developers > REST API 키) - 선택 사항
KAKAO_REST_API_KEY=여기에_카카오_REST_API_키
```

두 키 모두 [Kakao Developers](https://developers.kakao.com/) 의 같은 앱에서 발급되며, 서로 다른 키입니다.

## 2) 설치

```bash
npm install
```

## 3) 실행

```bash
npm run dev
```

브라우저에서 안내되는 주소(보통 `http://localhost:5173`)를 열면 `Kmap` 초기 화면과 지도가 보입니다.

## 4) 장소 데이터 관리

### 데이터 파일 위치

모든 큐레이션 장소는 한 파일에 모여 있습니다.

```
src/data/places.js
```

이 파일의 `RAW_THEME_PLACES` 객체만 편집하면 즉시 지도에 반영됩니다 (Vite HMR).

### 항목 추가 예시

```js
'K-POP': [
  {
    id: 'my-new-place',
    region: 'Seoul',
    enName: 'My New Place',
    pronunciation: 'ma-i-keu',          // 선택
    koAddress: '서울특별시 ...',
    lat: 37.0000,
    lng: 127.0000,
    description: 'Short English description.', // 선택
    image: 'https://...',                // 선택 (없으면 테마 기본 이미지)
  },
  ...
]
```

`category`, `image` 같은 필드는 비워두면 자동으로 채워지므로 위 항목들만 기재하면 됩니다.

### 카카오 API로 데이터 채우기 (선택, 두 가지 도구)

#### A. 이름 리스트 → 좌표/주소 변환 (`resolve:names`) ⭐ 추천

추가하고 싶은 장소의 이름만 알면 됩니다. `scripts/place-names.txt` 에 적고 한 줄 실행하면 카카오에서 정확한 좌표·주소·전화·카테고리를 채워 줍니다.

`scripts/place-names.txt` 예시:

```
## K-POP
- 하이커 그라운드 종로 한국관광공사
- 동대문 종합시장
- KSPO DOME 올림픽공원
```

실행:

```bash
npm run resolve:names
```

- `KAKAO_REST_API_KEY` 가 `.env` 에 있어야 합니다.
- 결과는 `src/data/places.resolved.js` 에 저장됩니다.
- 콘솔에 매칭 결과와 다른 후보를 보여주므로, 어색하면 키워드를 더 구체적으로 고쳐 재실행하세요.
- 검토 후 좋은 항목만 `src/data/places.js` 의 `RAW_THEME_PLACES` 에 복사하시면 됩니다.

#### B. 주변 일괄 수집 (`fetch:places`)

테마별로 도시 주변 50개씩 카카오 검색으로 한꺼번에 모으고 싶다면:

```bash
npm run fetch:places
```

- 결과는 `src/data/places.generated.js` 에 저장됩니다.
- 검색 키워드/도시/반경을 바꾸려면 `scripts/fetch-kakao-places.mjs` 상단의 `THEMES`, `ANCHORS`, `RADIUS_M` 등을 조정하세요.

> 자동 생성 파일들 (`places.resolved.js`, `places.generated.js`) 은 `.gitignore` 되어 있어 커밋되지 않습니다. 큐레이션 결과만 `places.js` 에 모입니다.
