import { describe, expect, it } from 'vitest'
import {
  buildTableOoeInputRevisionId,
  buildTableOoeSnapshot,
  runTableMode,
  type RunTableModeRequest,
} from './table'

describe('Table OOE snapshot helpers', () => {
  const baseRequest: RunTableModeRequest = {
    primaryLatex: 'a x^2+x',
    secondaryLatex: 'k+x',
    secondaryEnabled: true,
    start: 1,
    end: 2,
    step: 1,
    storedVariables: [
      { name: 'a', valueLatex: '4', numericValue: 4 },
      { name: 'k', valueLatex: '-2', numericValue: -2 },
    ],
    variableSubstitutionSnapshot: [
      { name: 'a', valueLatex: '3', numericValue: 3 },
    ],
  }

  it('builds stable snapshots and revisions for equivalent requests', () => {
    const equivalentRequest: RunTableModeRequest = {
      step: 1,
      end: 2,
      start: 1,
      secondaryEnabled: true,
      secondaryLatex: 'k+x',
      primaryLatex: 'a x^2+x',
      variableSubstitutionSnapshot: [
        { numericValue: 3, valueLatex: '3', name: 'a' },
      ],
      storedVariables: [
        { numericValue: 4, valueLatex: '4', name: 'a' },
        { numericValue: -2, valueLatex: '-2', name: 'k' },
      ],
    }

    expect(buildTableOoeSnapshot(baseRequest)).toEqual({
      request: baseRequest,
    })
    expect(buildTableOoeInputRevisionId(baseRequest)).toBe(
      buildTableOoeInputRevisionId(equivalentRequest),
    )
    expect(buildTableOoeInputRevisionId(baseRequest)).toMatch(
      /^input\.table\.build\.[a-z0-9]+$/u,
    )
  })

  it('changes revisions when table inputs change meaningfully', () => {
    const baseRevision = buildTableOoeInputRevisionId(baseRequest)

    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      primaryLatex: 'a x^3+x',
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      end: 3,
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      step: 0.5,
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      storedVariables: [
        { name: 'a', valueLatex: '5', numericValue: 5 },
        { name: 'k', valueLatex: '-2', numericValue: -2 },
      ],
    })).not.toBe(baseRevision)
    expect(buildTableOoeInputRevisionId({
      ...baseRequest,
      variableSubstitutionSnapshot: [
        { name: 'a', valueLatex: '6', numericValue: 6 },
      ],
    })).not.toBe(baseRevision)
  })
})

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
      lines: [
        'Used stored values: a=4, k=-2.',
        'Effective table expression: f(x)=4x^2+x,\\;g(x)=x-2.',
      ],
    })
    expect(result.outcome.detailSections?.[1]).toEqual({
      title: 'Variable Policy',
      lines: ['Kept x symbolic as the table variable.'],
    })
    expect(result.outcome.exactLatex).toContain('x')
    expect(result.outcome.exactLatex).not.toContain('9')
  })

  it('substitutes explicit named table parameters under the existing table policy', () => {
    const result = runTableMode({
      primaryLatex: '@rate x',
      secondaryLatex: 'var(offset)+x',
      secondaryEnabled: true,
      start: 1,
      end: 2,
      step: 1,
      storedVariables: [
        { name: 'rate', valueLatex: '4', numericValue: 4 },
        { name: 'offset', valueLatex: '-2', numericValue: -2 },
        { name: 'x', valueLatex: '9', numericValue: 9 },
      ],
    })

    expect(result.outcome.kind).toBe('success')
    expect(result.response.rows).toEqual([
      { x: '1', primary: '4', secondary: '-1' },
      { x: '2', primary: '8', secondary: '0' },
    ])
    expect(result.outcome.kind).toBe('success')
    if (result.outcome.kind !== 'success') {
      throw new Error('Expected success')
    }
    expect(result.outcome.variableSubstitutions).toEqual([
      { name: 'rate', valueLatex: '4', numericValue: 4 },
      { name: 'offset', valueLatex: '-2', numericValue: -2 },
    ])
    expect(result.outcome.detailSections?.[0]?.lines[0]).toBe(
      'Used stored values: rate=4, offset=-2.',
    )
  })
})
