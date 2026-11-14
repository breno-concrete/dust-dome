import { describe, expect, it } from 'vitest'
import {
  areaOf,
  excerpt,
  fingerprint,
  looksLikeInfra,
  redact,
  repoPath,
} from '../../.github/scripts/ci-lib.mjs'

describe('redact', () => {
  it('masks tokens, keys, emails and formatted CPF/CNPJ', () => {
    const text = [
      'token ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'url https://api.nasa.gov/DONKI/FLR?api_key=SECRETKEY123&x=1',
      'Authorization: Bearer abcdefghijklmnop',
      'mail maria@example.com',
      'cpf 123.456.789-09 cnpj 12.345.678/0001-95',
    ].join('\n')
    const out = redact(text)
    expect(out).not.toMatch(/ghp_abc|SECRETKEY123|abcdefghijklmnop|maria@|123\.456|12\.345/)
    expect(out).toContain('[REDACTED')
  })

  it('keeps plain numbers such as seeds and timestamps readable', () => {
    expect(redact('seed 12345678909 at 1763132400000')).toBe('seed 12345678909 at 1763132400000')
  })

  it('removes ANSI colors and absolute repo paths', () => {
    const out = redact('\u001b[31mFAIL\u001b[0m /work/repo/src/a.ts:3', '/work/repo')
    expect(out).toBe('FAIL src/a.ts:3')
  })
})

describe('excerpt', () => {
  it('keeps at most 40 lines and says when it cut', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}`).join('\n')
    const out = excerpt(lines).split('\n')
    expect(out).toHaveLength(40)
    expect(out.at(-1)).toMatch(/truncated/)
  })

  it('does not touch short output', () => {
    expect(excerpt('a\nb\n')).toBe('a\nb')
  })
})

describe('fingerprint', () => {
  it('is stable and depends only on type, spec id and test', () => {
    const a = fingerprint('regression', null, 'src/a.test.ts::x')
    expect(a).toBe(fingerprint('regression', null, 'src/a.test.ts::x'))
    expect(a).not.toBe(fingerprint('regression', 'FR-001', 'src/a.test.ts::x'))
    expect(a).not.toBe(fingerprint('infra', null, 'src/a.test.ts::x'))
    expect(a).toMatch(/^[a-f0-9]{40}$/)
  })
})

describe('repoPath', () => {
  it('turns an absolute path into a repo-relative one with forward slashes', () => {
    expect(repoPath('/work/repo/src/engine/time.test.ts', '/work/repo')).toBe(
      'src/engine/time.test.ts',
    )
  })

  it('handles Windows paths: forward slashes from vitest, backslashes and drive case from cwd', () => {
    expect(repoPath('C:/Users/dev/repo/src/engine/time.test.ts', 'c:\\Users\\dev\\repo')).toBe(
      'src/engine/time.test.ts',
    )
  })

  it('leaves an already relative path alone', () => {
    expect(repoPath('src/engine/time.test.ts', '/work/repo')).toBe('src/engine/time.test.ts')
  })
})

describe('looksLikeInfra', () => {
  it('flags network and registry problems', () => {
    expect(looksLikeInfra('npm error code ECONNRESET')).toBe(true)
    expect(looksLikeInfra('getaddrinfo EAI_AGAIN registry.npmjs.org')).toBe(true)
  })

  it('does not hide a real test timeout or assertion error', () => {
    expect(looksLikeInfra('Error: Test timed out in 5000ms.')).toBe(false)
    expect(looksLikeInfra('AssertionError: expected 1 to be 2')).toBe(false)
  })
})

describe('areaOf', () => {
  it('maps paths to the owning area like CLAUDE.md', () => {
    expect(areaOf('src/engine/time.test.ts')).toBe('engine')
    expect(areaOf('src/engine/events/events.test.ts')).toBe('data')
    expect(areaOf('src/config/events.json')).toBe('content')
    expect(areaOf('src/config/config.test.ts')).toBe('engine')
    expect(areaOf('src/features/decisions/BuildMenu.test.tsx')).toBe('ui')
    expect(areaOf('src/features/scene/iso.test.ts')).toBe('scene')
    expect(areaOf('package.json')).toBe('shared')
  })
})
