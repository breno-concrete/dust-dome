// Owner: Breno. Opens, updates and closes GitHub issues from ci-out/errors.json. Deterministic.
// Usage: node .github/scripts/file-issues.mjs [--in ci-out/errors.json] [--ran ci-out/ran.json]
// Env: GH_TOKEN (for the gh CLI), COMMIT, RUN_URL.
//
// Rules:
//  - one failure = one open issue, found by the hidden marker <!-- ci-fingerprint: HASH -->;
//  - still failing: one short comment, never a second issue;
//  - "flaky" and "infra" never open issues (they show up in the run summary);
//  - closes an issue only if its fingerprint is gone AND the thing really ran and passed this run;
//  - more than MAX_NEW new failures at once: ONE summary issue instead of a flood.
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { AREA_SPEC, shortCommit } from './ci-lib.mjs'

export const MAX_NEW = 10
export const SUMMARY_MARKER = 'summary'

export const LABELS = {
  'ci-failure': ['B60205', 'Opened by the automatic CI'],
  regression: ['D93F0B', 'Something that worked on main stopped working'],
  'area:engine': ['0E8A16', 'Owner: engine/'],
  'area:data': ['0E8A16', 'Owner: data/'],
  'area:ui': ['0E8A16', 'Owner: ui/'],
  'area:scene': ['0E8A16', 'Owner: scene/'],
  'area:content': ['0E8A16', 'Owner: content/'],
  'area:shared': ['0E8A16', 'Owner: shared/ (tech lead)'],
}

const AREA_PREFIX = {
  engine: 'engine/',
  data: 'data/',
  ui: 'ui/',
  scene: 'scene/',
  content: 'content/',
  shared: 'shared/',
}

const MARKER = /<!--\s*ci-fingerprint:\s*([a-z0-9]+)\s*-->/
const SOURCE_MARKER = /<!--\s*ci-source:\s*([^\s]+)\s*-->/

export function realGh(args) {
  return execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
}

const day = (now) => now().toISOString().slice(0, 10)
const fence = (text) => text.replaceAll('```', "'''")
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 3)}...` : text)

export function issueTitle(e) {
  return `[CI] ${e.type}: ${clip(e.summary, 100)}`
}

export function issueBody(e) {
  const area = e.area ?? 'shared'
  const spec = e.feature ?? AREA_SPEC[area]
  return [
    `<!-- ci-fingerprint: ${e.fingerprint} -->`,
    `<!-- ci-source: ${e.source} -->`,
    '',
    `**Type:** ${e.type} · **Area:** ${area} (\`${AREA_PREFIX[area]}\` branches)${spec ? ` · **Spec:** \`${spec}\`` : ''}`,
    `**First seen:** ${e.first_seen.slice(0, 10)} · **Commit:** \`${shortCommit(e.commit)}\`${e.run_url ? ` · **Run:** ${e.run_url}` : ''}`,
    '',
    '### What failed',
    e.summary,
    '',
    '```text',
    fence(e.excerpt || '(no output captured)'),
    '```',
    '',
    '### Reproduce locally',
    '```text',
    e.reproduce,
    '```',
    '',
    '### How to fix (project flow)',
    `1. Branch from an up-to-date \`main\` with the prefix of the owning area (\`${AREA_PREFIX[area]}\`).`,
    '2. Reproduce with the command above. If no test catches it yet, write that failing test first (constitution VIII, red).',
    '3. Make the smallest fix. Never delete, skip or weaken a test.',
    '4. Run `npm run check`, open a small PR, wait for green CI.',
    '5. If the cause is in another area or a contract file, write a contract change request (a `shared/` PR).',
    '',
    '_Opened automatically. It closes by itself when the failing check passes again._',
  ].join('\n')
}

function summaryBody(pending, now) {
  const lines = pending.map((e) => `- [${e.type}] \`${e.test}\` - ${clip(e.summary, 120)}`)
  return [
    `<!-- ci-fingerprint: ${SUMMARY_MARKER} -->`,
    '<!-- ci-source: summary -->',
    '',
    `More than ${MAX_NEW} new failures appeared at once (${day(now)}). This usually means one shared change broke many things, so no individual issues were opened.`,
    '',
    ...lines,
    '',
    'Fix the common cause first. Individual issues are opened automatically if the list drops to 10 or fewer.',
  ].join('\n')
}

export function fileIssues({
  errors: rawErrors,
  ran,
  gh = realGh,
  now = () => new Date(),
  commit = '',
  runUrl = '',
  maxNew = MAX_NEW,
}) {
  const log = []
  const say = (m) => {
    log.push(m)
    console.log(m)
  }
  // Older or locally generated logs may lack commit/run: fall back to this run's values.
  const errors = rawErrors.map((e) => ({
    ...e,
    commit: e.commit || commit,
    run_url: e.run_url || runUrl,
  }))
  const when = day(now)
  const link = runUrl ? ` - [run](${runUrl})` : ''
  const trackable = errors.filter((e) => e.type === 'regression')

  // Labels are created once and are idempotent (--force updates an existing label).
  for (const [name, [color, description]] of Object.entries(LABELS)) {
    gh(['label', 'create', name, '--color', color, '--description', description, '--force'])
  }

  const open = JSON.parse(
    gh([
      'issue',
      'list',
      '--state',
      'open',
      '--label',
      'ci-failure',
      '--limit',
      '200',
      '--json',
      'number,body',
    ]),
  )
  const byFingerprint = new Map()
  for (const issue of open) {
    const m = MARKER.exec(issue.body ?? '')
    if (m && !byFingerprint.has(m[1])) {
      byFingerprint.set(m[1], {
        number: issue.number,
        source: SOURCE_MARKER.exec(issue.body)?.[1] ?? null,
      })
    }
  }

  // 1. Still failing: comment only.
  const pending = []
  for (const e of trackable) {
    const existing = byFingerprint.get(e.fingerprint)
    if (existing) {
      gh([
        'issue',
        'comment',
        String(existing.number),
        '--body',
        `Still failing on \`${shortCommit(commit || e.commit)}\` (${when})${link}`,
      ])
      say(`commented #${existing.number}`)
    } else pending.push(e)
  }

  // 2. New failures: individual issues, or one summary when there are too many.
  const summary = byFingerprint.get(SUMMARY_MARKER)
  if (pending.length > maxNew) {
    if (summary) {
      gh([
        'issue',
        'comment',
        String(summary.number),
        '--body',
        `Still ${pending.length} untracked failures on \`${shortCommit(commit)}\` (${when})${link}`,
      ])
      say(`commented summary #${summary.number}`)
    } else {
      gh([
        'issue',
        'create',
        '--title',
        `[CI] ${pending.length} new failures at once`,
        '--body',
        summaryBody(pending, now),
        '--label',
        'ci-failure',
        '--label',
        'regression',
      ])
      say(`created summary issue for ${pending.length} failures`)
    }
  } else {
    for (const e of pending) {
      const labels = ['ci-failure', 'regression', `area:${e.area ?? 'shared'}`]
      gh([
        'issue',
        'create',
        '--title',
        issueTitle(e),
        '--body',
        issueBody(e),
        ...labels.flatMap((l) => ['--label', l]),
      ])
      say(`created issue for ${e.test}`)
    }
    if (summary) {
      gh([
        'issue',
        'close',
        String(summary.number),
        '--reason',
        'completed',
        '--comment',
        `Back to ${trackable.length} tracked failure(s); individual issues take over (${when}).`,
      ])
      say(`closed summary #${summary.number}`)
    }
  }

  // 3. Fixed: gone from the errors AND proven to have run. Never close because something was skipped.
  const stillFailing = new Set(errors.map((e) => e.fingerprint))
  const passed = new Set(ran?.passed ?? [])
  const exhaustive = new Set(ran?.exhaustive ?? [])
  for (const [fp, issue] of byFingerprint) {
    if (fp === SUMMARY_MARKER || stillFailing.has(fp)) continue
    const proven = passed.has(fp) || (issue.source !== null && exhaustive.has(issue.source))
    if (!proven) {
      say(`kept #${issue.number} open: not proven fixed in this run`)
      continue
    }
    gh([
      'issue',
      'close',
      String(issue.number),
      '--reason',
      'completed',
      '--comment',
      `Green on \`${shortCommit(commit)}\` (${when})${link}`,
    ])
    say(`closed #${issue.number}`)
  }
  return log
}

function main(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }
  const errors = JSON.parse(readFileSync(arg('--in', 'ci-out/errors.json'), 'utf8'))
  let ran = null
  try {
    ran = JSON.parse(readFileSync(arg('--ran', 'ci-out/ran.json'), 'utf8'))
  } catch {
    console.log('No ran.json: no issue will be closed in this run.')
  }
  fileIssues({ errors, ran, commit: process.env.COMMIT ?? '', runUrl: process.env.RUN_URL ?? '' })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
