import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildReport } from '../../.github/scripts/report.mjs'

const NOW = () => new Date('2026-11-14T15:00:00Z')
const dirs = []

function suite(cwd, file, tests) {
  return {
    name: join(cwd, file),
    status: tests.some((t) => t[1] === 'failed') ? 'failed' : 'passed',
    assertionResults: tests.map(([title, status, msg]) => ({
      title,
      fullName: `suite ${title}`,
      status,
      failureMessages: msg ? [msg] : [],
    })),
  }
}

/** Builds a fake ci-out/ folder. */
function ciOut({ steps, first, retry }) {
  const cwd = mkdtempSync(join(tmpdir(), 'report-'))
  dirs.push(cwd)
  const out = join(cwd, 'ci-out')
  mkdirSync(join(out, 'steps'), { recursive: true })
  const all = steps ?? [
    {
      id: 'tests',
      command: 'npm test',
      status: first ? 'failed' : 'passed',
      exitCode: first ? 1 : 0,
      log: 'steps/tests.log',
    },
  ]
  writeFileSync(join(out, 'steps.json'), JSON.stringify({ steps: all }))
  for (const s of all) if (s.log) writeFileSync(join(out, s.log), s.output ?? '')
  if (first) writeFileSync(join(out, 'vitest.json'), JSON.stringify({ testResults: first(cwd) }))
  if (retry)
    writeFileSync(join(out, 'vitest-retry.json'), JSON.stringify({ testResults: retry(cwd) }))
  return cwd
}

afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

const run = (cwd) =>
  buildReport({ cwd, commit: 'abcdef1234567', runUrl: 'https://x/run/1', now: NOW })

describe('buildReport', () => {
  it('reports nothing when everything passed', () => {
    const cwd = ciOut({ first: null })
    expect(run(cwd).errors).toEqual([])
  })

  it('turns a failing test into a regression with area, excerpt and reproduce command', () => {
    const cwd = ciOut({
      first: (c) => [
        suite(c, 'src/engine/time.test.ts', [
          ['a', 'passed'],
          ['b', 'failed', 'AssertionError: expected 1 to be 2\n at x'],
        ]),
      ],
    })
    const { errors, ran } = run(cwd)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      type: 'regression',
      area: 'engine',
      feature: 'specs/001-engine-core',
      test: 'src/engine/time.test.ts::suite b',
      reproduce: 'npx vitest run src/engine/time.test.ts',
      commit: 'abcdef1234567',
      run_url: 'https://x/run/1',
      first_seen: '2026-11-14T15:00:00.000Z',
      rerun_passed: false,
    })
    expect(errors[0].excerpt.split('\n').length).toBeLessThanOrEqual(40)
    expect(ran.passed).toHaveLength(1) // only the passing test "a"
  })

  it('keeps the same fingerprint on another day, commit and temp directory', () => {
    const mk = () =>
      ciOut({ first: (c) => [suite(c, 'src/engine/time.test.ts', [['b', 'failed', 'boom']])] })
    const a = buildReport({
      cwd: mk(),
      commit: 'aaa',
      runUrl: 'u1',
      now: () => new Date('2026-11-14T10:00:00Z'),
    })
    const b = buildReport({
      cwd: mk(),
      commit: 'bbb',
      runUrl: 'u2',
      now: () => new Date('2026-11-15T10:00:00Z'),
    })
    expect(a.errors[0].fingerprint).toBe(b.errors[0].fingerprint)
  })

  it('marks a test that fails and then passes on the re-run as flaky', () => {
    const cwd = ciOut({
      first: (c) => [suite(c, 'src/app/store.test.ts', [['x', 'failed', 'timing']])],
      retry: (c) => [suite(c, 'src/app/store.test.ts', [['x', 'passed']])],
    })
    const [e] = run(cwd).errors
    expect(e).toMatchObject({ type: 'flaky', rerun_passed: true })
  })

  it('keeps a test that fails again on the re-run as a regression', () => {
    const cwd = ciOut({
      first: (c) => [suite(c, 'src/app/store.test.ts', [['x', 'failed', 'bad']])],
      retry: (c) => [suite(c, 'src/app/store.test.ts', [['x', 'failed', 'bad']])],
    })
    expect(run(cwd).errors[0].type).toBe('regression')
  })

  it('reports a suite that crashed before running any test', () => {
    const cwd = ciOut({
      first: (c) => [
        {
          name: join(c, 'src/engine/game.test.ts'),
          status: 'failed',
          message: 'SyntaxError: Unexpected token',
          assertionResults: [],
        },
      ],
    })
    expect(run(cwd).errors[0].test).toBe('src/engine/game.test.ts::<suite>')
  })

  it('classifies network problems as infra, not as a code regression', () => {
    const cwd = ciOut({
      steps: [
        {
          id: 'install',
          command: 'npm ci',
          status: 'failed',
          exitCode: 1,
          log: 'steps/install.log',
          output: 'npm error code ECONNRESET',
        },
      ],
    })
    expect(run(cwd).errors[0]).toMatchObject({ type: 'infra', test: 'step:install' })
  })

  it('classifies a step timeout as infra', () => {
    const cwd = ciOut({
      steps: [
        {
          id: 'build',
          command: 'npm run build',
          status: 'timeout',
          exitCode: 1,
          log: 'steps/build.log',
        },
      ],
    })
    expect(run(cwd).errors[0]).toMatchObject({ type: 'infra', test: 'step:build' })
  })

  it('reports a failed step (lint, typecheck, build) as a regression and records the step as exhaustive', () => {
    const cwd = ciOut({
      steps: [
        {
          id: 'lint',
          command: 'npm run lint',
          status: 'passed',
          exitCode: 0,
          log: 'steps/lint.log',
        },
        {
          id: 'typecheck',
          command: 'npm run typecheck',
          status: 'failed',
          exitCode: 2,
          log: 'steps/typecheck.log',
          output: 'src/a.ts(3,1): error TS2322',
        },
      ],
    })
    const { errors, ran } = run(cwd)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({
      type: 'regression',
      test: 'step:typecheck',
      reproduce: 'npm run typecheck',
    })
    expect(ran.exhaustive).toEqual(expect.arrayContaining(['step:lint', 'step:typecheck']))
  })

  it('never reports green when the runner left no results', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'report-'))
    dirs.push(cwd)
    mkdirSync(join(cwd, 'ci-out'))
    expect(run(cwd).errors[0]).toMatchObject({ type: 'infra', test: 'step:runner' })
  })

  it('does not count skipped steps as having run', () => {
    const cwd = ciOut({
      steps: [
        { id: 'lint', command: 'npm run lint', status: 'skipped', exitCode: null, log: null },
      ],
    })
    expect(run(cwd).ran.exhaustive).toEqual([])
  })

  it('redacts secrets and limits the excerpt to 40 lines', () => {
    const long = Array.from(
      { length: 80 },
      (_, i) => `row ${i} token=supersecretvalue99 mail me@x.com`,
    ).join('\n')
    const cwd = ciOut({
      first: (c) => [suite(c, 'src/engine/time.test.ts', [['b', 'failed', long]])],
    })
    const [e] = run(cwd).errors
    expect(e.excerpt.split('\n').length).toBeLessThanOrEqual(40)
    expect(e.excerpt).not.toMatch(/supersecretvalue99|me@x\.com/)
  })
})

describe('stack traces', () => {
  it('drops frames inside node_modules from the excerpt', () => {
    const trace =
      'AssertionError: nope\n    at src/a.test.ts:5:15\n    at file://node_modules/vitest/dist/run.js:1:1\n    at new Promise (<anonymous>)'
    const cwd = ciOut({
      first: (c) => [suite(c, 'src/engine/time.test.ts', [['b', 'failed', trace]])],
    })
    const [e] = buildReport({ cwd, now: NOW }).errors
    expect(e.excerpt).toContain('src/a.test.ts:5:15')
    expect(e.excerpt).not.toMatch(/node_modules|Promise/)
  })
})
