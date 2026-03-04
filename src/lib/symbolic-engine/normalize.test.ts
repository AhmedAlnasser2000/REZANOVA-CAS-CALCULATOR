import { describe, expect, it } from 'vitest'
import { normalizeNode } from './normalize'

describe('symbolic-engine normalization', () => {
  it('sorts additive and multiplicative children into a stable order', () => {
    const normalized = normalizeNode(['Add', ['Multiply', 'x', 3], 2])

    expect(normalized.ast).toEqual(['Add', 2, ['Multiply', 3, 'x']])
  })

  it('keeps grouped structures instead of flattening unlike operators', () => {
    const normalized = normalizeNode(['Multiply', ['Add', 1, 'x'], ['Add', 2, 'y']])

    expect(normalized.precedenceTrace).toContain('Multiply:multiply-divide')
    expect(JSON.stringify(normalized.ast)).toContain('"Add"')
  })
})
