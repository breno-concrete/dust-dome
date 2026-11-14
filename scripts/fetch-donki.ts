// Owner: Dev A. Run locally (not in CI): npm run data:fetch -- 2024-05-01 2024-05-31
// Downloads real space-weather events from NASA DONKI into src/data/snapshots/.
//
// Endpoints (no key needed on the CCMC host):
//   https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD  (solar flares)
//   https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP?startDate=...&endDate=...  (solar energetic particles)
//   https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/CME?startDate=...&endDate=...  (coronal mass ejections)
// Same data via api.nasa.gov/DONKI/<TYPE>?...&api_key=YOUR_KEY
//
// TODO(Dev A, Sat): fetch FLR + SEP + CME for the range and write
// src/data/snapshots/<YYYY-MM>.json as { range, fetchedAt, flr, sep, cme }.

const [startDate, endDate] = process.argv.slice(2)
if (!startDate || !endDate) {
  console.error('usage: npm run data:fetch -- <startDate> <endDate>')
  process.exit(1)
}
console.log(`TODO: fetch DONKI ${startDate}..${endDate}`)
