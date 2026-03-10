import { describe, expect, it } from 'vitest'
import { runCalculateAlgebraTransform, runCalculateMode } from './calculate'

describe('runCalculateMode', () => {
  it('returns a prompt instead of solving equations', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '5x+6=3',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('prompt')
    if (result.kind !== 'prompt') {
      throw new Error('Expected a prompt outcome')
    }
    expect(result.message).toBe('Use Equation mode to solve this expression.')
    expect(result.targetMode).toBe('equation')
    expect(result.carryLatex).toBe('5x+6=3')
  })

  it('keeps factorization inside calculate mode', () => {
    const result = runCalculateMode({
      action: 'factor',
      latex: 'x^2+2x+1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toContain('x+1')
  })

  it('returns a controlled error for algebra relation operators', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: 'x\\le2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('error')
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome')
    }
    expect(result.error).toContain('Inequalities')
  })

  it('runs explicit algebra transforms without changing the broad simplify action', () => {
    const result = runCalculateAlgebraTransform({
      action: 'combineFractions',
      latex: '\\frac{1}{3}+\\frac{1}{6x}',
      angleUnit: 'deg',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}')
    expect(result.transformBadges).toEqual(['Combine Fractions'])
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0')
  })
})
