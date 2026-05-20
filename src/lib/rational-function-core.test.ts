import { ComputeEngine } from '@cortex-js/compute-engine'
import { describe, expect, it } from 'vitest'
import {
  decomposeDistinctLinearPartialFractions,
  normalizeExactRationalFunctionNode,
} from './rational-function-core'

const ce = new ComputeEngine()

function parse(latex: string) {
  return ce.parse(latex).json
}

describe('rational-function-core', () => {
  it('normalizes and cancels exact polynomial quotients', () => {
    const result = normalizeExactRationalFunctionNode(parse('\\frac{x^2-1}{x-1}'))

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.normalizedLatex).toBe('x+1')
      expect(result.denominatorLatex).toBeUndefined()
      expect(result.exclusionConstraints).toEqual([])
    }
  })

  it('combines rational sums while preserving denominator constraints', () => {
    const result = normalizeExactRationalFunctionNode(parse('\\frac{1}{x-1}+\\frac{1}{x+1}'))

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.normalizedLatex).toContain('2x')
      expect(result.denominatorLatex).toContain('x^2')
      expect(result.denominatorLatex).toContain('-1')
      expect(result.exclusionConstraints).toEqual([
        { kind: 'nonzero', expressionLatex: result.denominatorLatex },
      ])
    }
  })

  it('stops cleanly for unsupported exact rational inputs', () => {
    expect(normalizeExactRationalFunctionNode(parse('\\frac{1}{x}+\\frac{1}{y}')).kind).toBe('stop')
    expect(normalizeExactRationalFunctionNode(parse('0.5+\\frac{1}{x}')).kind).toBe('stop')
    expect(normalizeExactRationalFunctionNode(parse('\\frac{x^9+1}{x+1}'), { maxDegree: 4 }).kind).toBe('stop')
    expect(normalizeExactRationalFunctionNode(['Divide', 1, 0]).kind).toBe('stop')
  })

  it('decomposes proper rational functions over distinct rational linear factors internally', () => {
    const normalized = normalizeExactRationalFunctionNode(parse('\\frac{3x+5}{(x-1)(x+2)}'))

    expect(normalized.kind).toBe('success')
    if (normalized.kind !== 'success') {
      return
    }

    const partialFractions = decomposeDistinctLinearPartialFractions(normalized.rational)

    expect(partialFractions.kind).toBe('success')
    if (partialFractions.kind === 'success') {
      expect(partialFractions.terms.map((term) => term.coefficient)).toEqual([
        { numerator: 8, denominator: 3 },
        { numerator: 1, denominator: 3 },
      ])
      expect(partialFractions.reconstructedLatex).toContain('x-1')
      expect(partialFractions.reconstructedLatex).toContain('x+2')
    }
  })

  it('keeps bounded partial-fraction readiness honest for blocked shapes', () => {
    const repeated = normalizeExactRationalFunctionNode(parse('\\frac{x+1}{(x-1)^2}'))
    const quadratic = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^2+1}'))
    const improper = normalizeExactRationalFunctionNode(parse('\\frac{x^2+1}{x-1}'))

    expect(repeated.kind).toBe('success')
    expect(quadratic.kind).toBe('success')
    expect(improper.kind).toBe('success')

    if (repeated.kind === 'success') {
      expect(decomposeDistinctLinearPartialFractions(repeated.rational)).toEqual({
        kind: 'stop',
        reason: 'repeated-linear-factor',
      })
    }
    if (quadratic.kind === 'success') {
      expect(decomposeDistinctLinearPartialFractions(quadratic.rational)).toEqual({
        kind: 'stop',
        reason: 'denominator-not-distinct-linear',
      })
    }
    if (improper.kind === 'success') {
      expect(decomposeDistinctLinearPartialFractions(improper.rational)).toEqual({
        kind: 'stop',
        reason: 'not-proper',
      })
    }
  })
})
