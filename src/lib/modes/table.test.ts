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

  it('keeps the table when some sampled rows leave the real domain', () => {
    const result = runTableMode({
      primaryLatex: '\\sqrt{x}',
      secondaryLatex: '',
      secondaryEnabled: false,
      start: -1,
      end: 1,
      step: 1,
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '-1', primary: 'undefined', secondary: undefined },
      { x: '0', primary: '0', secondary: undefined },
      { x: '1', primary: '1', secondary: undefined },
    ])
    expect(result.response.warnings).toContain(
      'Some sampled rows were outside the real domain and are shown as undefined.',
    )
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.outcome.detailSections?.[0]?.title).toBe('Domain Facts')
    expect(result.outcome.detailSections?.[1]?.title).toBe('Interval Safety')
    expect(result.outcome.detailSections?.[1]?.lines.join(' ')).toContain('1 sampled table row')
  })

  it('substitutes stored non-active variables without replacing x', () => {
    const result = runTableMode({
      primaryLatex: 'a x^2+x',
      secondaryLatex: 'k+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'a', valueLatex: '4', numericValue: 4 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '1', primary: '5', secondary: '-1' },
      { x: '2', primary: '18', secondary: '0' },
    ])
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected success')
    }
    expect(result.outcome.variableSubstitutions).toEqual([
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ])
    expect(result.outcome.detailSections?.[0]).toEqual({
      title: 'Stored Values',
      lines: ['Substituted a=4, k=-2 before evaluating this Table expression.'],
    })
    expect(result.outcome.exactLatex).toContain('x')
    expect(result.outcome.exactLatex).not.toContain('9')
  })
})
