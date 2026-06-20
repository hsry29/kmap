/**
 * 국제 통용 음식명 — 카테고리 Display 1순위.
 * 음절 로마자(Seu Te I Keu) 대신 Steak, Pizza 등 사용.
 * @type {[string, string][]}
 */
export const INTERNATIONAL_FOOD_PAIRS = [
  ['스테이크전문점', 'Steakhouse'],
  ['스테이크하우스', 'Steakhouse'],
  ['스테이크집', 'Steakhouse'],
  ['스테이크', 'Steak'],
  ['피자전문점', 'Pizzeria'],
  ['피자', 'Pizza'],
  ['파스타전문점', 'Pasta Restaurant'],
  ['파스타', 'Pasta'],
  ['버거전문점', 'Burger Restaurant'],
  ['햄버거전문점', 'Burger Restaurant'],
  ['햄버거', 'Burger'],
  ['버거', 'Burger'],
  ['샌드위치전문점', 'Sandwich Shop'],
  ['샌드위치', 'Sandwich'],
  ['타코', 'Taco'],
  ['부리또', 'Burrito'],
  ['샐러드', 'Salad'],
  ['브런치', 'Brunch'],
  ['와플', 'Waffle'],
  ['팬케이크', 'Pancake'],
  ['크로아상', 'Croissant'],
  ['바베큐', 'BBQ'],
  ['그릴', 'Grill'],
  ['리조또', 'Risotto'],
  ['스시', 'Sushi'],
  ['초밥', 'Sushi'],
  ['라멘', 'Ramen'],
  ['우동', 'Udon'],
  ['돈까스', 'Tonkatsu'],
  ['카레', 'Curry'],
  ['타파스', 'Tapas'],
  ['디저트', 'Dessert'],
  ['아이스크림', 'Ice Cream'],
  ['도넛', 'Donut'],
  ['베이글', 'Bagel'],
  ['오믈렛', 'Omelette'],
  ['수프', 'Soup'],
  ['스프', 'Soup'],
]

/** @type {Record<string, string>} */
export const INTERNATIONAL_FOOD_MAP = Object.fromEntries(INTERNATIONAL_FOOD_PAIRS)

/** 로마자 음절 → 국제 음식명 (categoryLexicon 패치) */
export const INTERNATIONAL_FOOD_ROMANIZED_PATCHES = [
  ['seu te i keu jeon mun jeom', 'Steakhouse'],
  ['seu te i keu', 'Steak'],
  ['pi ja jeon mun jeom', 'Pizzeria'],
  ['pi ja', 'Pizza'],
  ['pa seu ta', 'Pasta'],
  ['beo geo', 'Burger'],
  ['haem beo geo', 'Burger'],
  ['saen deu wi chi', 'Sandwich'],
  ['steak house', 'Steakhouse'],
]
