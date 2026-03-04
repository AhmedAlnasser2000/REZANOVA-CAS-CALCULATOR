import { describe, expect, it } from 'vitest'
import { runTableMode } from './table'

describe('runTableMode', () => {
  it('builds a table for a valid range', () => {
    const result = runTableMode({
      primaryLatex: 'x^2',
      secondaryLatex: 'x+1',
      secondaryEnabled: true,
      start: -2,
      end: 2,
      step: 1,
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toHaveLength(5)
    expect(result.response.headers).toEqual(['x', 'x^2', 'x+1'])
  })

  it('rejects invalid step sizes', () => {
    const result = runTableMode({
      primaryLatex: 'x^2',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -2,
      end: 2,
      step: 0,
    })

    expect(result.outcome.kind).toBe('error')
    if (result.outcome.kind !== 'error') {
      throw new Error('Expected an error outcome')
    }
    expect(result.outcome.error).toBe('Step size must be greater than zero.')
  })
})
