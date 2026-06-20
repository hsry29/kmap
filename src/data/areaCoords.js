/**
 * Area gazetteer — foreign-friendly neighborhood / district search targets.
 * Matched before Kakao POI search so queries like "Hongdae" pan the map first.
 *
 * `level` applies to Explore / Routes. Places mode uses `resolveAreaMapLevel()` (level 3).
 */
export const AREA_COORDS = {
  Hongdae: {
    lat: 37.5563,
    lng: 126.9236,
    level: 4,
    aliases: ['hongdae', 'hongik university', 'hongik univ', '홍대', '홍대입구', '홍대입구역'],
  },
  Gangnam: {
    lat: 37.4979,
    lng: 127.0276,
    level: 4,
    aliases: ['gangnam', '강남', 'gangnam station', '강남역'],
  },
  Myeongdong: {
    lat: 37.5636,
    lng: 126.986,
    level: 4,
    aliases: ['myeongdong', 'myungdong', '명동', '명동역'],
  },
  Seongsu: {
    lat: 37.5446,
    lng: 127.0557,
    level: 4,
    aliases: ['seongsu', 'seong su', '성수', '성수동', '성수역'],
  },
  Itaewon: {
    lat: 37.5344,
    lng: 126.9943,
    level: 4,
    aliases: ['itaewon', '이태원', '이태원역'],
  },
  Jamsil: {
    lat: 37.5133,
    lng: 127.1002,
    level: 4,
    aliases: ['jamsil', '잠실', '잠실역', 'lotte world'],
  },
  Yeonnam: {
    lat: 37.565,
    lng: 126.9236,
    level: 5,
    aliases: ['yeonnam', 'yeonnam-dong', '연남', '연남동'],
  },
  Bukchon: {
    lat: 37.5826,
    lng: 126.983,
    level: 5,
    aliases: ['bukchon', 'bukchon hanok village', '북촌', '북촌한옥마을'],
  },
  Insadong: {
    lat: 37.573,
    lng: 126.9868,
    level: 5,
    aliases: ['insadong', 'insa-dong', '인사동'],
  },
  Apgujeong: {
    lat: 37.5271,
    lng: 127.0286,
    level: 4,
    aliases: ['apgujeong', 'apgujeong-rodeo', '압구정', '압구정역', '로데오거리'],
  },
  Euljiro: {
    lat: 37.5662,
    lng: 126.991,
    level: 4,
    aliases: ['euljiro', '을지로', '을지로입구', '을지로입구역'],
  },
  Jongno: {
    lat: 37.5729,
    lng: 126.9794,
    level: 4,
    aliases: ['jongno', 'jongno-gu', '종로', '종로구'],
  },
  Mangwon: {
    lat: 37.556,
    lng: 126.91,
    level: 4,
    aliases: ['mangwon', '망원', '망원동', '망원역'],
  },
  Hannam: {
    lat: 37.5344,
    lng: 127.0065,
    level: 4,
    aliases: ['hannam', 'hannam-dong', '한남', '한남동'],
  },
  Mapo: {
    lat: 37.5636,
    lng: 126.908,
    level: 4,
    aliases: ['mapo', 'mapo-gu', '마포', '마포구', '마포역'],
  },
  Yeouido: {
    lat: 37.5219,
    lng: 126.9245,
    level: 4,
    aliases: ['yeouido', 'yeoui-do', '여의도', '여의도역'],
  },
  Dongdaemun: {
    lat: 37.5665,
    lng: 127.009,
    level: 4,
    aliases: ['dongdaemun', 'dong dae mun', '동대문', '동대문역', 'ddp'],
  },
  Gwanghwamun: {
    lat: 37.576,
    lng: 126.9769,
    level: 5,
    aliases: ['gwanghwamun', 'gwang hwamun', '광화문', '광화문역'],
  },
  'Samcheong-dong': {
    lat: 37.58,
    lng: 126.982,
    level: 5,
    aliases: ['samcheong-dong', 'samcheong dong', 'samcheong', '삼청동'],
  },
  Seochon: {
    lat: 37.579,
    lng: 126.97,
    level: 5,
    aliases: ['seochon', 'seo chon', '서촌'],
  },
}
