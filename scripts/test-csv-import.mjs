import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCsvImport } from '../src/utils/curationCsv.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const userCsv = `collection_name,type,place_name,korean_name,kakao_place_id,lat,lng,why_visit,best_time,time_needed,tips,next_spot,status
Seoul First Trip,route,Gyeongbokgung Palace,경복궁,18619553,37.5776,126.9769,The largest and most iconic royal palace of the Joseon Dynasty. A must-visit landmark to understand Korea's history and culture.,09:00-11:00,1.5-2h,Visit early to avoid crowds and watch the Royal Guard Changing Ceremony.,Bukchon Hanok Village,published
Seoul First Trip,route,Bukchon Hanok Village,북촌한옥마을,781129546,37.5818,126.9848,A beautiful neighborhood filled with traditional Korean hanok houses and narrow alleys perfect for photography.,10:30-12:00,1-1.5h,Please keep noise levels low as local residents still live in the area.,Insadong,published
Seoul Night View Tour,spots,Banpo Hangang Park,반포한강공원,8142957,37.51082,126.99716,,,,,,published
`

const result = validateCsvImport(userCsv)
console.log('ok:', result.ok)
console.log('errors:', result.errors)
console.log('rowErrors:', result.rowErrors)
console.log('collections:', result.collections.length, 'places:', result.stats.placeCount)

const userPath = path.join(__dirname, 'kmap-curation.csv')
if (fs.existsSync(userPath)) {
  const file = fs.readFileSync(userPath, 'utf8')
  const r2 = validateCsvImport(file)
  console.log('\n--- kmap-curation.csv ---')
  console.log('ok:', r2.ok)
  console.log('errors:', r2.errors)
  console.log('rowErrors:', r2.rowErrors.slice(0, 5))
  console.log('collections:', r2.collections.length)
}
