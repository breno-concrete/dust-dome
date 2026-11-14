// Owner: Breno. Fails a PR that edits files outside the area of its branch prefix.
// Usage (CI): node .github/scripts/check-ownership.mjs <branch> <base-sha> <head-sha>
// Usage (local test): echo "src/x.ts" | node .github/scripts/check-ownership.mjs scene/foo --stdin
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const AREAS = {
  engine: [
    'src/engine/',
    'src/app/',
    'src/config/schema.ts',
    'src/config/loadConfig.ts',
    'src/config/config.test.ts',
    'specs/001-engine-core/',
  ],
  data: [
    'src/engine/events/',
    'src/data/',
    'scripts/',
    'src/features/sources/',
    'src/features/end/',
    'specs/002-events-data/',
  ],
  ui: [
    'src/ui-kit/',
    'src/features/title/',
    'src/features/hud/',
    'src/features/decisions/',
    'specs/003-game-ui/',
  ],
  scene: [
    'src/features/scene/',
    'src/features/repair/',
    'public/models/',
    'public/audio/',
    'specs/004-base-scene/',
  ],
  content: [/^src\/config\/[^/]+\.json$/],
}

// Files anyone may touch (each area writes only in its own section).
const ALWAYS_ALLOWED = ['CREDITS.md']

function areaFor(branch) {
  if (branch.startsWith('shared/')) return 'shared'
  // POs editing on github.com get branches like "maria-patch-1".
  if (/(^|-)patch-\d+$/.test(branch)) return 'content'
  const prefix = branch.split('/')[0]
  return prefix in AREAS ? prefix : null
}

function matches(file, rule) {
  return rule instanceof RegExp ? rule.test(file) : file === rule || file.startsWith(rule)
}

const [branch, ...rest] = process.argv.slice(2)
if (!branch) {
  console.error('usage: check-ownership.mjs <branch> (<base> <head> | --stdin)')
  process.exit(2)
}

const files =
  rest[0] === '--stdin'
    ? readFileSync(0, 'utf8').split('\n').filter(Boolean)
    : execFileSync('git', ['diff', '--name-only', `${rest[0]}...${rest[1]}`], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean)

const area = areaFor(branch)

if (area === null) {
  console.error(
    `Branch "${branch}" has no known area prefix. Use one of: ${Object.keys(AREAS).join('/, ')}/, shared/`,
  )
  process.exit(1)
}

if (area === 'shared') {
  console.log(`shared/ branch: ${files.length} file(s), CODEOWNERS review applies.`)
  process.exit(0)
}

const outside = files.filter(
  (f) => !ALWAYS_ALLOWED.includes(f) && !AREAS[area].some((rule) => matches(f, rule)),
)

if (outside.length > 0) {
  console.error(`Branch "${branch}" (area "${area}") touches files outside its area:`)
  for (const f of outside) console.error(`  - ${f}`)
  console.error(
    'Move these changes to a PR from the right area, or to a shared/ branch with the owner review.',
  )
  process.exit(1)
}

console.log(`OK: ${files.length} file(s), all inside area "${area}".`)
