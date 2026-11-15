// Owner: Dev A. Run locally (not in CI): npm run data:fetch -- 2024-05-01 2024-05-31
// Downloads real solar energetic particle (SEP) events from NASA DONKI and writes
// src/data/snapshots/<YYYY-MM>.json as { range, fetchedAt, sep }. The game never fetches: it only
// reads the committed snapshot (src/data/donki.ts).
//
// - Endpoint: https://api.nasa.gov/DONKI/SEP?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key=KEY
// - Key: NASA_API_KEY from the environment or, when it is not set, from .env.local at the project
//   root (git-ignored). Without a key, DEMO_KEY (low rate limit). The key is never printed and
//   never written to the snapshot.
// - flr and cme are left out on purpose (the game only reads sep). An omitted list is never
//   written as [], which would read as "no flares".
// - One file per month: a range that crosses months is refused.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = new URL('../', import.meta.url)
const SNAPSHOTS = new URL('src/data/snapshots/', ROOT)
const ENDPOINT = 'https://api.nasa.gov/DONKI/SEP'

function fail(message: string): never {
  console.error(`data:fetch: ${message}`)
  process.exit(1)
}

/** A real calendar day written as YYYY-MM-DD. */
function isDay(text: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d
}

function apiKey(): string {
  if (!process.env.NASA_API_KEY) {
    try {
      process.loadEnvFile(fileURLToPath(new URL('.env.local', ROOT)))
    } catch {
      // No .env.local: fall back to DEMO_KEY below.
    }
  }
  return process.env.NASA_API_KEY || 'DEMO_KEY'
}

const [startDate, endDate] = process.argv.slice(2)
if (!startDate || !endDate) fail('usage: npm run data:fetch -- <startDate> <endDate>')
if (!isDay(startDate) || !isDay(endDate)) fail('dates must be real days written as YYYY-MM-DD')
if (startDate > endDate) fail(`the range ends before it starts: ${startDate}..${endDate}`)
const month = startDate.slice(0, 7)
if (endDate.slice(0, 7) !== month) {
  fail(`the range ${startDate}..${endDate} crosses months; one snapshot file holds one month`)
}

const query = `startDate=${startDate}&endDate=${endDate}`
// Printed and recorded without the key.
console.log(`data:fetch: GET ${ENDPOINT}?${query}`)

const response = await fetch(`${ENDPOINT}?${query}&api_key=${encodeURIComponent(apiKey())}`)
if (!response.ok) fail(`DONKI answered ${response.status} ${response.statusText}`)
const body = (await response.text()).trim()
// DONKI answers with an empty body when the range has no event.
let sep: unknown
try {
  sep = body === '' ? [] : JSON.parse(body)
} catch {
  fail('DONKI did not answer with JSON')
}
if (!Array.isArray(sep)) fail('DONKI did not answer with a list of SEP events')

const snapshot = { range: `${startDate}..${endDate}`, fetchedAt: new Date().toISOString(), sep }
const file = new URL(`${month}.json`, SNAPSHOTS)
writeFileSync(file, `${JSON.stringify(snapshot, null, 2)}\n`)
console.log(`data:fetch: wrote ${sep.length} SEP events to ${fileURLToPath(file)}`)
