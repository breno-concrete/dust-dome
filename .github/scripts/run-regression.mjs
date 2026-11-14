// Owner: Breno. Runs every verification step WITHOUT stopping at the first failure and records
// the results in ci-out/ for report.mjs. Same steps as `npm run check`.
// Usage: node .github/scripts/run-regression.mjs [--out ci-out] [--skip-install]
import { spawn as nodeSpawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoPath } from './ci-lib.mjs'

const MINUTE = 60_000
const MAX_CAPTURE = 2_000_000 // characters kept per step, enough for any real log

/** Real process runner. Tests inject a fake with the same shape. */
export function realSpawn(cmd, args, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    // Windows cannot start .cmd shims without a shell; the arguments are fixed strings or repo paths.
    const useShell = process.platform === 'win32' && cmd !== process.execPath
    const child = nodeSpawn(cmd, args, {
      cwd,
      shell: useShell,
      timeout: timeoutMs,
      killSignal: 'SIGKILL',
    })
    let output = ''
    const keep = (d) => {
      output += d.toString()
      if (output.length > MAX_CAPTURE) output = output.slice(-MAX_CAPTURE)
    }
    child.stdout.on('data', keep)
    child.stderr.on('data', keep)
    child.on('error', (e) =>
      resolve({ code: 127, output: `${output}\n${e.message}`, timedOut: false }),
    )
    child.on('close', (code, signal) =>
      resolve({ code: code ?? 1, output, timedOut: signal === 'SIGKILL' }),
    )
  })
}

function npmCommand(args) {
  // `npm run ...` sets npm_execpath, which lets us start npm without a shell on any OS.
  if (process.env.npm_execpath) return [process.execPath, [process.env.npm_execpath, ...args]]
  return [process.platform === 'win32' ? 'npm.cmd' : 'npm', args]
}

function vitestCommand(cwd, files, outputFile) {
  const bin = join(cwd, 'node_modules', 'vitest', 'vitest.mjs')
  const base = ['run', ...files, '--reporter=json', `--outputFile=${outputFile}`]
  return existsSync(bin)
    ? [process.execPath, [bin, ...base]]
    : npmCommand(['exec', '--', 'vitest', ...base])
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function failedFiles(vitestJson, cwd) {
  return (vitestJson?.testResults ?? [])
    .filter((r) => r.status === 'failed')
    .map((r) => repoPath(r.name, cwd))
}

export async function runRegression({
  cwd = process.cwd(),
  outDir = 'ci-out',
  skipInstall = false,
  spawn = realSpawn,
  now = () => new Date(),
} = {}) {
  const out = join(cwd, outDir)
  mkdirSync(join(out, 'steps'), { recursive: true })
  const steps = []

  async function step(id, command, [cmd, args], timeoutMin) {
    const started = now().getTime()
    const r = await spawn(cmd, args, { cwd, timeoutMs: timeoutMin * MINUTE })
    const status = r.timedOut ? 'timeout' : r.code === 0 ? 'passed' : 'failed'
    writeFileSync(join(out, 'steps', `${id}.log`), r.output)
    const record = {
      id,
      command,
      status,
      exitCode: r.code,
      durationMs: now().getTime() - started,
      log: `steps/${id}.log`,
    }
    steps.push(record)
    console.log(`${status.toUpperCase().padEnd(7)} ${id} (${record.command})`)
    return record
  }
  const skip = (id, command, reason) => {
    steps.push({ id, command, status: 'skipped', exitCode: null, durationMs: 0, log: null, reason })
    console.log(`SKIPPED ${id} (${reason})`)
  }

  let installed = true
  if (!skipInstall) {
    const r = await step('install', 'npm ci', npmCommand(['ci']), 10)
    installed = r.status === 'passed'
  }

  const scripts = [
    ['format', 'format:check', 3],
    ['lint', 'lint', 3],
    ['typecheck', 'typecheck', 5],
  ]
  for (const [id, script, minutes] of scripts) {
    if (!installed) skip(id, `npm run ${script}`, 'install failed')
    else await step(id, `npm run ${script}`, npmCommand(['run', script]), minutes)
  }

  if (!installed) {
    skip('tests', 'npm test', 'install failed')
  } else {
    const first = await step(
      'tests',
      'npm test',
      vitestCommand(cwd, [], join(outDir, 'vitest.json')),
      10,
    )
    const json = readJson(join(out, 'vitest.json'))
    const files = failedFiles(json, cwd)
    // One automatic re-run of only the failing files: passing the 2nd time means "flaky".
    if (first.status === 'failed' && files.length > 0) {
      await step(
        'tests-retry',
        `npm test (retry ${files.join(' ')})`,
        vitestCommand(cwd, files, join(outDir, 'vitest-retry.json')),
        10,
      )
    }
  }

  if (!installed) skip('build', 'npm run build', 'install failed')
  else await step('build', 'npm run build', npmCommand(['run', 'build']), 8)

  writeFileSync(
    join(out, 'steps.json'),
    JSON.stringify({ finishedAt: now().toISOString(), steps }, null, 2) + '\n',
  )
  return steps
}

function main(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
  }
  // Always exits 0: failures are data for report.mjs. Run `report.mjs --gate` to turn them into an exit code.
  runRegression({
    outDir: arg('--out', 'ci-out'),
    skipInstall: argv.includes('--skip-install'),
  }).then(() => process.exit(0))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
