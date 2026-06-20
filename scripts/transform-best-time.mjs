import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mapBestTimeToCategory } from './bestTimeCategories.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const INPUT = `
09:00-11:00
10:30-12:00
12:00-14:00
15:00-18:00
18:00-21:00
09:00-11:00
11:00-12:30
12:30-14:00
15:00-18:00
18:30-21:00
10:00-11:30
11:30-14:00
15:00-17:00
18:00-20:00
14:00-15:00
09:00-10:30
10:30-11:30
11:30-13:00
13:00-14:00
14:00-16:00
09:00-11:00
11:00-12:00
12:00-13:30
13:30-15:30
15:30-18:00
18:00–20:00
19:30–21:00
20:00–21:00
20:30–22:00
21:30–23:00
19:00-22:00
19:00-22:00
18:00-21:00
19:00-22:00
18:00-22:00
10:00-18:00
11:00-18:00
11:00-19:00
12:00-20:00
15:00-21:00
10:00-16:00
10:00-17:00
11:00-18:00
11:00-18:00
10:00-18:00
11:00-20:00
10:00-17:00
12:00-21:00
10:00-18:00
11:00-18:00
12:00-20:00
15:00-20:00
16:00-21:00
10:00-17:00
10:00-18:00
10:00-17:00
10:00-20:00
11:00-21:00
10:00-18:00
10:00-18:00
10:00-18:00
11:00-20:00
11:00-21:00
08:00-10:00
17:00-20:00
17:00-19:00
18:00-21:00
11:00-18:00
09:00-16:00
18:00-22:00
09:00-17:00
10:00-18:00
19:00-22:00
Early April
Early April
Early April
Early April
Early April
11:00-13:00
12:00-14:00
13:00-15:00
15:00-17:00
17:00-20:00
09:00-11:00
10:00-15:00
10:00-16:00
10:00-16:00
10:00-15:00
09:00-17:00
09:00-17:00
09:00-17:00
09:00-17:00
09:00-18:00
10:00-17:00
10:00-16:00
11:00-17:00
10:00-17:00
11:00-17:00
10:00-17:00
10:00-17:00
10:00-17:00
10:00-18:00
10:00-18:00
15:00-21:00
11:00-17:00
11:00-18:00
11:00-18:00
12:00-19:00
11:00-20:00
11:00-19:00
10:30-21:00
10:00-21:00
10:30-22:00
18:00-21:00
11:00-20:00
18:00-22:00
17:00-21:00
17:00-21:00
17:00-21:00
17:00-22:00
17:00-21:00
17:00-22:00
17:00-21:00
10:00-15:00
11:00-15:00
11:00-14:00
11:00-15:00
10:00-15:00
10:00-18:00
11:00-20:00
10:00-18:00
09:00-17:00
10:00-17:00
`.trim().split(/\r?\n/)

const rows = INPUT.map((line) => line.trim()).filter(Boolean)
const output = rows.map(mapBestTimeToCategory)
const changed = rows.filter((r, i) => r !== output[i])
const unmapped = [...new Set(rows.filter((r) => r !== 'Early April' && mapBestTimeToCategory(r) === r))]

/** @type {Record<string, number>} */
const summary = {}
for (const v of output) {
  summary[v] = (summary[v] ?? 0) + 1
}

console.log(output.join('\n'))
console.log('\n=== Summary ===')
console.log(`Total rows: ${rows.length}`)
console.log(`Changed rows: ${changed.length}`)
console.log(`Early April (unchanged): ${rows.filter((r) => r === 'Early April').length}`)
if (unmapped.length) {
  console.log(`Unmapped (kept as-is): ${unmapped.join(', ')}`)
}
console.log('\nCategory counts:')
for (const [k, n] of Object.entries(summary).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${k}: ${n}`)
}

fs.writeFileSync(path.join(__dirname, 'best-time-transformed.txt'), `${output.join('\n')}\n`, 'utf8')
console.log('\nSaved: scripts/best-time-transformed.txt')
