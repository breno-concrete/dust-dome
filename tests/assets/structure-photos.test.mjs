// The build menu shows a photo of every structure (public/structures/<id>.webp).
// A structure added to the config without its photo would show a broken image.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const structures = JSON.parse(readFileSync(join(root, 'src/config/structures.json'), 'utf8'))

describe('structure photos', () => {
  it.each(structures.map((s) => s.id))('%s has a photo for the build menu', (id) => {
    expect(existsSync(join(root, 'public/structures', `${id}.webp`))).toBe(true)
  })
})
