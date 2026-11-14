// Owner: Breno. Turns the raw results in ci-out/ into one structured error log.
// Usage:
//   node .github/scripts/report.mjs [--in ci-out] [--out ci-out/errors.json]
//   node .github/scripts/report.mjs --gate ci-out/errors.json     (exit 1 if any non-flaky error)
// Env (set by the workflow, all optional): COMMIT, RUN_URL, GITHUB_STEP_SUMMARY.
//
// Writes:
//   errors.json  array of errors (schema below, one per distinct failure)
//   ran.json     what actually ran, so file-issues.mjs only closes issues for things that passed
//
// Error: { fingerprint, type, spec_id, feature, area, source, test, summary, excerpt, reproduce,
//          commit, run_url, first_seen, rerun_passed }
// type: regression | infra | flaky
import { appendFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  areaOf,
  AREA_SPEC,
  excerpt,
  fingerprint,
  looksLikeInfra,
  redact,
  repoPath,
  shortCommit,
} from './ci-lib.mjs'

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

/** Drops stack frames that point into node_modules or Node internals: they only add noise. */
function cleanStack(text) {
  return String(text ?? '')
    .split('\n')
    .filter((line) => !/^\s*at\s.*(node_modules|node:internal|<anonymous>)/.test(line))
    .join('\n')
}

const oneLine = (text, max = 160) => redact(text).replace(/\s+/g, ' ').trim().slice(0, max)

/** Tests of one vitest JSON report: failed = Map(testId -> { file, name, message }), passed = Set(testId). */
function failedTests(json, cwd) {
  const failed = new Map()
  const passed = new Set()
  for (const suite of json?.testResults ?? []) {
    const file = repoPath(suite.name, cwd)
    const results = suite.assertionResults ?? []
    for (const t of results) {
      const id = `${file}::${t.fullName ?? t.title}`
      if (t.status === 'failed') {
        failed.set(id, {
          file,
          name: t.fullName ?? t.title,
          message: (t.failureMessages ?? []).join('\n'),
        })
      } else if (t.status === 'passed') passed.add(id)
    }
    // A suite that crashed (import error, syntax error) has no assertion results at all.
    if (suite.status === 'failed' && !results.some((t) => t.status === 'failed')) {
      failed.set(`${file}::<suite>`, {
        file,
        name: '<suite failed to run>',
        message: suite.message ?? '',
      })
    }
  }
  return { failed, passed }
}

export function buildReport({
  cwd = process.cwd(),
  inDir = 'ci-out',
  commit = '',
  runUrl = '',
  now = () => new Date(),
} = {}) {
  const dir = join(cwd, inDir)
  const stepsFile = readJson(join(dir, 'steps.json'))
  const steps = stepsFile?.steps ?? []
  const common = {
    commit: shortCommit(commit) === 'unknown' ? '' : commit,
    run_url: runUrl,
    first_seen: now().toISOString(),
  }
  const errors = []
  const exhaustive = new Set() // sources that ran to the end: a finding that vanished there is really fixed
  const passedFingerprints = new Set()

  function add(e) {
    const fp = fingerprint(e.type, e.spec_id ?? null, e.test)
    if (errors.some((x) => x.fingerprint === fp)) return
    errors.push({
      fingerprint: fp,
      spec_id: null,
      feature: null,
      rerun_passed: false,
      ...common,
      ...e,
    })
  }

  // No results at all means the runner itself broke: never report that as "all green".
  if (stepsFile === null) {
    add({
      type: 'infra',
      area: 'shared',
      source: 'step:runner',
      test: 'step:runner',
      summary: 'The regression runner produced no results (ci-out/steps.json is missing)',
      excerpt: '',
      reproduce: 'npm run ci:regression',
    })
  }

  // Step-level errors are fingerprinted by step name only, never by message text.
  for (const s of steps) {
    if (s.status === 'skipped' || s.id === 'tests-retry') continue
    const log = s.log ? readText(join(dir, s.log)) : ''
    // Test-level findings (below) are only "exhaustive" per test, so the tests step is not listed here.
    if (s.id !== 'tests') exhaustive.add(`step:${s.id}`)
    if (s.status === 'passed') continue
    // A failed tests step with a readable report is reported test by test.
    if (s.id === 'tests' && readJson(join(dir, 'vitest.json'))) continue

    const timedOut = s.status === 'timeout'
    const infra = timedOut || looksLikeInfra(log)
    add({
      type: infra ? 'infra' : 'regression',
      area: 'shared',
      source: `step:${s.id}`,
      test: `step:${s.id}`,
      summary: timedOut
        ? `Step "${s.id}" timed out`
        : `Step "${s.id}" failed (exit code ${s.exitCode})`,
      excerpt: excerpt(log, cwd),
      reproduce: s.command,
    })
  }

  // Test failures, with one retry: failed twice = regression, passed the 2nd time = flaky.
  const first = readJson(join(dir, 'vitest.json'))
  if (first) {
    const retry = readJson(join(dir, 'vitest-retry.json'))
    const { failed, passed } = failedTests(first, cwd)
    const retried = retry ? failedTests(retry, cwd) : null
    for (const id of passed) passedFingerprints.add(fingerprint('regression', null, id))
    for (const [id, t] of failed) {
      const flaky = retried !== null && retried.passed.has(id)
      const area = areaOf(t.file)
      add({
        type: flaky ? 'flaky' : looksLikeInfra(t.message) ? 'infra' : 'regression',
        area,
        feature: AREA_SPEC[area] ?? null,
        source: 'tests',
        test: id,
        summary: oneLine(`${t.name} - ${t.message.split('\n')[0] || 'failed'}`),
        excerpt: excerpt(cleanStack(t.message), cwd),
        reproduce: `npx vitest run ${t.file}`,
        rerun_passed: flaky,
      })
    }
  }

  const ran = { exhaustive: [...exhaustive].sort(), passed: [...passedFingerprints].sort() }
  return { errors, ran }
}

function markdownSummary(errors) {
  if (errors.length === 0) return '### CI result\n\nAll checks passed.\n'
  const rows = errors.map((e) => {
    const where = e.feature ?? e.area
    return `| ${e.type} | ${where} | ${e.summary.replace(/\|/g, '\\|')} | \`${e.reproduce}\` |`
  })
  return [
    '### CI result',
    '',
    '| Type | Where | What failed | Reproduce locally |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')
}

function main(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }

  if (argv.includes('--gate')) {
    const file = arg('--gate', 'ci-out/errors.json')
    const errors = readJson(file)
    if (errors === null) {
      console.error(`Gate: cannot read ${file}; treating as failure.`)
      process.exit(1)
    }
    const blocking = errors.filter((e) => e.type !== 'flaky')
    for (const e of blocking) console.error(`FAIL [${e.type}] ${e.test}: ${e.summary}`)
    console.log(blocking.length ? `Gate: ${blocking.length} failure(s).` : 'Gate: green.')
    process.exit(blocking.length ? 1 : 0)
  }

  const inDir = arg('--in', 'ci-out')
  const outFile = arg('--out', join(inDir, 'errors.json'))
  const { errors, ran } = buildReport({
    inDir,
    commit: process.env.COMMIT ?? '',
    runUrl: process.env.RUN_URL ?? '',
  })
  writeFileSync(outFile, JSON.stringify(errors, null, 2) + '\n')
  writeFileSync(join(dirname(outFile), 'ran.json'), JSON.stringify(ran, null, 2) + '\n')
  const md = markdownSummary(errors)
  console.log(md)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  if (!existsSync(join(inDir, 'steps.json')))
    console.error('Warning: steps.json not found, nothing was run?')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
