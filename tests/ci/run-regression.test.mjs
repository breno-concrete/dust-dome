import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runRegression } from '../../.github/scripts/run-regression.mjs'

const dirs = []
const sandbox = () => {
  const d = mkdtempSync(join(tmpdir(), 'runner-'))
  dirs.push(d)
  return d
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

/** Fake process runner: decides each step by what the command looks like. */
function fakeSpawn(plan = {}) {
  const calls = []
  const spawn = async (cmd, args, { cwd }) => {
    const line = [cmd, ...args].join(' ')
    calls.push(line)
    const key = Object.keys(plan).find((k) => new RegExp(k).test(line))
    const r = key ? plan[key] : { code: 0, output: 'ok' }
    const outFile = args.find((a) => a.startsWith('--outputFile='))
    if (outFile && r.vitest) {
      const path = join(cwd, outFile.split('=')[1])
      mkdirSync(join(path, '..'), { recursive: true })
      writeFileSync(path, JSON.stringify(r.vitest))
    }
    return { code: r.code, output: r.output ?? '', timedOut: r.timedOut ?? false }
  }
  return { spawn, calls }
}

const stepsOf = (cwd) => JSON.parse(readFileSync(join(cwd, 'ci-out', 'steps.json'), 'utf8')).steps
const statuses = (steps) => Object.fromEntries(steps.map((s) => [s.id, s.status]))

describe('runRegression', () => {
  it('runs every step and records them all as passed', async () => {
    const cwd = sandbox()
    const f = fakeSpawn()
    await runRegression({ cwd, spawn: f.spawn })
    expect(statuses(stepsOf(cwd))).toEqual({
      install: 'passed',
      format: 'passed',
      lint: 'passed',
      typecheck: 'passed',
      tests: 'passed',
      build: 'passed',
    })
    expect(existsSync(join(cwd, 'ci-out', 'steps', 'lint.log'))).toBe(true)
  })

  it('does not stop at the first failure', async () => {
    const cwd = sandbox()
    const f = fakeSpawn({ 'run lint$': { code: 1, output: 'lint broke' } })
    await runRegression({ cwd, spawn: f.spawn })
    const s = statuses(stepsOf(cwd))
    expect(s.lint).toBe('failed')
    expect(s.typecheck).toBe('passed')
    expect(s.build).toBe('passed')
  })

  it('skips everything that needs node_modules when install fails', async () => {
    const cwd = sandbox()
    const f = fakeSpawn({ ' ci$': { code: 1, output: 'ECONNRESET' } })
    await runRegression({ cwd, spawn: f.spawn })
    const s = statuses(stepsOf(cwd))
    expect(s.install).toBe('failed')
    expect([s.format, s.lint, s.typecheck, s.tests, s.build]).toEqual(Array(5).fill('skipped'))
  })

  it('--skip-install does not run npm ci', async () => {
    const cwd = sandbox()
    const f = fakeSpawn()
    await runRegression({ cwd, spawn: f.spawn, skipInstall: true })
    expect(statuses(stepsOf(cwd)).install).toBeUndefined()
  })

  it('re-runs only the failing test files once', async () => {
    const cwd = sandbox()
    const failing = {
      testResults: [
        { name: join(cwd, 'src/a.test.ts'), status: 'failed', assertionResults: [] },
        { name: join(cwd, 'src/b.test.ts'), status: 'passed', assertionResults: [] },
      ],
    }
    const f = fakeSpawn({ '--reporter=json': { code: 1, vitest: failing } })
    await runRegression({ cwd, spawn: f.spawn })
    const retries = f.calls.filter((c) => c.includes('src/a.test.ts'))
    expect(retries).toHaveLength(1)
    expect(retries[0]).not.toContain('src/b.test.ts')
    expect(statuses(stepsOf(cwd))['tests-retry']).toBe('failed')
  })

  it('records a timeout as its own status', async () => {
    const cwd = sandbox()
    const f = fakeSpawn({ 'run build$': { code: 1, timedOut: true } })
    await runRegression({ cwd, spawn: f.spawn })
    expect(statuses(stepsOf(cwd)).build).toBe('timeout')
  })
})
