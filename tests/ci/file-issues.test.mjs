import { describe, expect, it } from 'vitest'
import { fileIssues, issueBody } from '../../.github/scripts/file-issues.mjs'

const NOW = () => new Date('2026-11-14T15:00:00Z')

function err(n, over = {}) {
  return {
    fingerprint: `fp${n}`,
    type: 'regression',
    spec_id: null,
    feature: 'specs/001-engine-core',
    area: 'engine',
    source: 'tests',
    test: `src/engine/t${n}.test.ts::case`,
    summary: `case ${n} failed`,
    excerpt: 'AssertionError: expected 1 to be 2',
    reproduce: `npx vitest run src/engine/t${n}.test.ts`,
    commit: 'abcdef1234567',
    run_url: 'https://x/run/9',
    first_seen: '2026-11-14T15:00:00.000Z',
    rerun_passed: false,
    ...over,
  }
}

/** Fake gh CLI: records every call, answers `issue list` with the given open issues. */
function fakeGh(open = []) {
  const calls = []
  const gh = (args) => {
    calls.push(args)
    return args[0] === 'issue' && args[1] === 'list' ? JSON.stringify(open) : ''
  }
  const of = (sub) => calls.filter((c) => c[0] === 'issue' && c[1] === sub)
  return {
    gh,
    calls,
    created: () => of('create'),
    commented: () => of('comment'),
    closed: () => of('close'),
  }
}

const openIssue = (number, fp, source = 'tests') => ({
  number,
  body: `<!-- ci-fingerprint: ${fp} -->\n<!-- ci-source: ${source} -->\nbody`,
})
const run = (fake, errors, ran = { passed: [], exhaustive: [] }, extra = {}) =>
  fileIssues({
    errors,
    ran,
    gh: fake.gh,
    now: NOW,
    commit: 'abcdef1234567',
    runUrl: 'https://x/run/9',
    ...extra,
  })

describe('fileIssues', () => {
  it('creates one issue with labels, hidden marker and a reproduce command', () => {
    const f = fakeGh()
    run(f, [err(1)])
    expect(f.created()).toHaveLength(1)
    const args = f.created()[0]
    const body = args[args.indexOf('--body') + 1]
    expect(body).toContain('<!-- ci-fingerprint: fp1 -->')
    expect(body).toContain('npx vitest run src/engine/t1.test.ts')
    expect(body).toContain('How to fix')
    const labels = args.flatMap((a, i) => (args[i - 1] === '--label' ? [a] : []))
    expect(labels).toEqual(['ci-failure', 'regression', 'area:engine'])
  })

  it('creates the labels idempotently on every run', () => {
    const f = fakeGh()
    run(f, [])
    const label = f.calls.filter((c) => c[0] === 'label')
    expect(label.length).toBeGreaterThanOrEqual(6)
    expect(label.every((c) => c.includes('--force'))).toBe(true)
  })

  it('comments instead of duplicating when the same failure is already open', () => {
    const f = fakeGh([openIssue(7, 'fp1')])
    run(f, [err(1)])
    expect(f.created()).toHaveLength(0)
    expect(f.commented()).toHaveLength(1)
    expect(f.commented()[0]).toContain('7')
    expect(f.commented()[0].join(' ')).toContain('abcdef1')
  })

  it('uses the commit and run link of this run when the log has none', () => {
    const f = fakeGh()
    run(f, [err(1, { commit: '', run_url: '' })])
    const args = f.created()[0]
    expect(args[args.indexOf('--body') + 1]).toContain('abcdef1')
  })

  it('does not open issues for flaky or infra failures', () => {
    const f = fakeGh()
    run(f, [err(1, { type: 'flaky' }), err(2, { type: 'infra' })])
    expect(f.created()).toHaveLength(0)
    expect(f.commented()).toHaveLength(0)
  })

  it('opens ONE summary issue when more than 10 new failures appear', () => {
    const f = fakeGh()
    run(
      f,
      Array.from({ length: 25 }, (_, i) => err(i)),
    )
    expect(f.created()).toHaveLength(1)
    expect(f.created()[0].join(' ')).toContain('25 new failures')
  })

  it('opens up to 10 individual issues, no summary', () => {
    const f = fakeGh()
    run(
      f,
      Array.from({ length: 10 }, (_, i) => err(i)),
    )
    expect(f.created()).toHaveLength(10)
  })

  it('comments on the existing summary instead of opening another one', () => {
    const f = fakeGh([openIssue(3, 'summary', 'summary')])
    run(
      f,
      Array.from({ length: 25 }, (_, i) => err(i)),
    )
    expect(f.created()).toHaveLength(0)
    expect(f.commented()[0]).toContain('3')
  })

  it('closes a fixed issue only when its test ran and passed this time', () => {
    const f = fakeGh([openIssue(5, 'fp1')])
    run(f, [], { passed: ['fp1'], exhaustive: [] })
    expect(f.closed()).toHaveLength(1)
    expect(f.closed()[0]).toEqual(expect.arrayContaining(['5', '--reason', 'completed']))
  })

  it('never closes an issue whose test was skipped or did not run', () => {
    const f = fakeGh([openIssue(5, 'fp1')])
    run(f, [], { passed: ['other'], exhaustive: ['step:lint'] })
    expect(f.closed()).toHaveLength(0)
  })

  it('closes a step issue when that step ran to the end and the finding is gone', () => {
    const f = fakeGh([openIssue(8, 'fpa', 'step:typecheck'), openIssue(9, 'fpb', 'step:build')])
    run(f, [], { passed: [], exhaustive: ['step:typecheck', 'step:build'] })
    expect(f.closed()).toHaveLength(2)
  })

  it('does not close an issue that is now reported as flaky', () => {
    const f = fakeGh([openIssue(5, 'fp1')])
    run(f, [err(1, { type: 'flaky' })], { passed: ['fp1'], exhaustive: [] })
    expect(f.closed()).toHaveLength(0)
  })

  it('never closes when nothing is known about what ran', () => {
    const f = fakeGh([openIssue(5, 'fp1')])
    run(f, [], null)
    expect(f.closed()).toHaveLength(0)
  })

  it('same failure on two runs: one issue, then one comment', () => {
    const run1 = fakeGh()
    run(run1, [err(1)])
    const body = run1.created()[0][run1.created()[0].indexOf('--body') + 1]
    const run2 = fakeGh([{ number: 11, body }])
    run(run2, [err(1)])
    expect(run2.created()).toHaveLength(0)
    expect(run2.commented()).toHaveLength(1)
  })
})

describe('issueBody', () => {
  it('cannot break out of its code fence', () => {
    const body = issueBody(err(1, { excerpt: 'bad ``` fence' }))
    expect(body.match(/```/g).length % 2).toBe(0)
    expect(body).toContain("bad ''' fence")
  })
})
