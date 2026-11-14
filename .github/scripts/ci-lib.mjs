// Owner: Breno. Shared helpers for the regression CI scripts (no dependencies, pure functions).
import { createHash } from 'node:crypto'
import { sep } from 'node:path'

export const MAX_EXCERPT_LINES = 40

export const ERROR_TYPES = ['regression', 'infra', 'flaky']

// Order matters: specific token shapes first, generic key=value last.
// Bare digit runs are NOT masked: seeds and timestamps in test output must stay readable.
const REDACTIONS = [
  [/github_pat_[A-Za-z0-9_]{20,}/g, '[REDACTED_TOKEN]'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '[REDACTED_TOKEN]'],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, '[REDACTED_TOKEN]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_TOKEN]'],
  [/\bAIza[0-9A-Za-z_-]{30,}/g, '[REDACTED_TOKEN]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, '[REDACTED_TOKEN]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]'],
  [/([?&](?:api_key|apikey|key|token|access_token)=)[^&\s"']+/gi, '$1[REDACTED]'],
  [
    /\b(api[_-]?key|token|secret|password|passwd|authorization)(["']?\s*[:=]\s*["']?)[^\s"',;&]{4,}/gi,
    '$1$2[REDACTED]',
  ],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[REDACTED_EMAIL]'],
  // Brazilian CPF / CNPJ, only in their formatted shape.
  [/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[REDACTED_DOC]'],
  [/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[REDACTED_DOC]'],
]

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g

/** Remove colors, mask secrets/emails/documents and turn absolute repo paths into relative ones. */
export function redact(text, cwd = '') {
  let out = String(text ?? '').replace(ANSI, '')
  if (cwd)
    out = out
      .split(cwd + sep)
      .join('')
      .split(cwd.split(sep).join('/') + '/')
      .join('')
  for (const [pattern, replacement] of REDACTIONS) out = out.replace(pattern, replacement)
  return out
}

/** Redacted excerpt with at most `max` lines (the last line says when it was cut). */
export function excerpt(text, cwd = '', max = MAX_EXCERPT_LINES) {
  const lines = redact(text, cwd).replace(/\r/g, '').split('\n')
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
  while (lines.length > 0 && lines[0].trim() === '') lines.shift()
  if (lines.length <= max) return lines.join('\n')
  return [...lines.slice(0, max - 1), '... (output truncated)'].join('\n')
}

/** Stable across runs: no date, run id or temp path goes into the hash. */
export function fingerprint(type, specId, test) {
  return createHash('sha1')
    .update(`${type}\n${specId ?? ''}\n${test}`)
    .digest('hex')
}

/** Repo-relative path with forward slashes, so Windows and Linux agree. */
export function repoPath(file, cwd) {
  const slashed = (p) => p.replaceAll('\\', '/')
  const f = slashed(file)
  const root = slashed(cwd).replace(/\/+$/, '') + '/'
  // Case-insensitive on purpose: Windows drive letters ("C:" vs "c:") differ between tools.
  return f.toLowerCase().startsWith(root.toLowerCase()) ? f.slice(root.length) : f
}

// Network, registry and environment problems are not code regressions.
// A single vitest test that times out is NOT here: that one is a real failure.
const INFRA_PATTERNS =
  /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENOSPC|socket hang up|npm (?:ERR!|error) (?:network|code E(?:CONN|TIMEDOUT|AI_AGAIN))|npm (?:ERR!|error) 5\d\d|\b(?:502|503|504) (?:Bad Gateway|Service Unavailable|Gateway Time-?out)|rate limit exceeded|command timed out|fetch failed/i

export function looksLikeInfra(text) {
  return INFRA_PATTERNS.test(String(text ?? ''))
}

// First matching rule wins, so the more specific path goes first.
// Keep in sync with AREAS in check-ownership.mjs and the table in CLAUDE.md.
const AREA_RULES = [
  ['src/engine/events/', 'data'],
  ['src/engine/', 'engine'],
  ['src/app/', 'engine'],
  [/^src\/config\/[^/]+\.json$/, 'content'],
  ['src/config/', 'engine'],
  ['src/data/', 'data'],
  ['scripts/', 'data'],
  ['src/features/sources/', 'data'],
  ['src/features/end/', 'data'],
  ['src/ui-kit/', 'ui'],
  ['src/features/title/', 'ui'],
  ['src/features/hud/', 'ui'],
  ['src/features/decisions/', 'ui'],
  ['src/features/scene/', 'scene'],
  ['src/features/repair/', 'scene'],
  ['public/', 'scene'],
]

export const AREA_SPEC = {
  engine: 'specs/001-engine-core',
  data: 'specs/002-events-data',
  ui: 'specs/003-game-ui',
  scene: 'specs/004-base-scene',
  content: null,
  shared: null,
}

/** Which team area owns a repo-relative path (anything unknown is "shared"). */
export function areaOf(path) {
  for (const [rule, area] of AREA_RULES) {
    if (rule instanceof RegExp ? rule.test(path) : path.startsWith(rule)) return area
  }
  return 'shared'
}

export function shortCommit(commit) {
  return String(commit ?? '').slice(0, 7) || 'unknown'
}
