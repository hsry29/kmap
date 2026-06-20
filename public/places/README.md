# 장소 이미지 보관소 (`public/places/`)

각 장소(핀)의 인포윈도우에 표시되는 사진을 두는 곳입니다.

## 사용법

### 1) 로컬 이미지 사용
1. 이미지를 이 폴더에 둡니다.
   - 예: `public/places/gyeongbokgung.jpg`
2. `src/data/places.js` 의 해당 장소 객체에 `image` 필드를 추가합니다.
   - 절대 경로(앞에 `/` 붙임)로 적습니다.

```js
{
  id: 'gyeongbokgung',
  ...,
  image: '/places/gyeongbokgung.jpg',  // public/places/ 아래 파일을 가리킴
},
```

### 2) 외부 URL 사용
직접 호스팅된 이미지 URL을 그대로 적어도 동작합니다.

```js
image: 'https://example.com/photo.jpg',
```

### 3) 비워두기 (기본 이미지 사용)
`image` 필드를 아예 안 적으면 테마별 기본 이미지가 사용됩니다.
이미지 로딩에 실패해도 자동으로 테마 기본 이미지로 대체됩니다.

## 권장 사양

| 항목 | 권장 값 | 비고 |
|------|---------|------|
| **확장자** | `.webp` (1순위) / `.jpg` (2순위) | PNG는 사진엔 비효율, AVIF는 일부 구형 브라우저 미지원 |
| **사이즈(가로 × 세로)** | **800 × 420 px** (1배) ~ **1200 × 630 px** (Retina 2배) | 인포윈도우 표시 영역이 약 240×126 픽셀이라 가로:세로 ≈ **1.9 : 1** |
| **파일 용량** | 한 장당 **80 KB 이하** 권장 (최대 150 KB) | 너무 크면 모바일에서 로딩 지연 |
| **컬러 프로필** | sRGB | 웹 표준 |
| **압축** | JPG: quality 75~85 / WebP: quality 70~80 | 시각적 손실 거의 없이 용량 큰 폭 절감 |

### 빠른 변환 팁

- **온라인 도구**: [squoosh.app](https://squoosh.app) — 드래그&드롭, WebP/JPG 변환·리사이즈·압축 한 번에
- **로컬 (선택)**:
  - macOS/Linux: `cwebp -q 80 input.jpg -o output.webp`
  - ImageMagick: `magick input.jpg -resize 1200x630^ -gravity center -extent 1200x630 -quality 82 output.jpg`

### 권장 파일 이름

`places.js` 의 `id` 와 같게 두면 관리가 쉽습니다.

```
public/places/
├── gyeongbokgung.webp
├── national-museum-korea.webp
├── n-seoul-tower.jpg
└── kwangya-seoul.jpg
```

## 저작권 주의

- 본인이 촬영한 사진 또는 라이선스가 명시된 이미지(Unsplash, Pixabay, Pexels 등의 무료 라이선스)를 사용해주세요.
- 구글 이미지 검색 결과를 그대로 가져다 쓰면 저작권 문제가 될 수 있습니다.
