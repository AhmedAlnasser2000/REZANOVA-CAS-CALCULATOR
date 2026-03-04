import { describe, expect, it } from 'vitest'
import { buildPrecedenceTrace, getPrecedenceClass } from './precedence'

describe('symbolic-engine precedence', () => {
  it('classifies operator precedence correctly', () => {
    expect(getPrecedenceClass(['Multiply', 3, 'x'])).toBe('multiply-divide')
    expect(getPrecedenceClass(['Power', 'x', 2])).toBe('power')
    expect(getPrecedenceClass(['Add', 2, 3])).toBe('add-subtract')
    expect(getPrecedenceClass(['Equal', 'x', 1])).toBe('relations')
  })

  it('builds a precedence trace that respects nested operators', () => {
    const trace = buildPrecedenceTrace(['Add', 2, ['Multiply', 3, ['Power', 'x', 2]]])

    expect(trace[0]).toBe('Add:add-subtract')
    expect(trace).toContain('Multiply:multiply-divide')
    expect(trace).toContain('Power:power')
  })
})
