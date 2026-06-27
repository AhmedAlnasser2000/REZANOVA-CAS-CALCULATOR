import { ComputeEngine } from '@cortex-js/compute-engine'
import { describe, expect, it } from 'vitest'
import {
  decomposeDistinctLinearPartialFractions,
  decomposeRationalPartialFractionReadiness,
  factorSupportedRationalDenominator,
  normalizeExactRationalFunctionNode,
} from '../rational-function-core'

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
      expect(result.assumptionFacts).toEqual([])
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
      expect(result.assumptionFacts).toMatchObject([
        {
          kind: 'domain-exclusion',
          source: 'rational-function-core',
          trust: 'proved',
          scope: 'result',
          expressionLatex: result.denominatorLatex,
        },
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

  it('classifies supported denominator factor families with multiplicity facts', () => {
    const repeated = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x-1)^2}'))
    const cubicPower = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x+2)^3}'))
    const mixed = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x-1)^2(x+3)}'))
    const quadratic = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^2+1}'))
    const quadraticWithLinear = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^2+x+1}'))
    const twoQuadratics = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x^2+1)(x^2+4)}'))
    const repeatedQuadraticPair = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x^2+1)^2(x^2+4)}'))
    const tooManyQuadratics = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x^2+1)(x^2+4)(x^2+9)}'))
    const reducibleQuadratic = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^2-1}'))
    const algebraicRoots = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^2-2}'))

    expect(repeated.kind).toBe('success')
    expect(cubicPower.kind).toBe('success')
    expect(mixed.kind).toBe('success')
    expect(quadratic.kind).toBe('success')
    expect(quadraticWithLinear.kind).toBe('success')
    expect(twoQuadratics.kind).toBe('success')
    expect(repeatedQuadraticPair.kind).toBe('success')
    expect(tooManyQuadratics.kind).toBe('success')
    expect(reducibleQuadratic.kind).toBe('success')
    expect(algebraicRoots.kind).toBe('success')

    if (repeated.kind === 'success') {
      const factors = factorSupportedRationalDenominator(repeated.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.squareFree).toBe(false)
        expect(factors.factors).toMatchObject([
          { kind: 'linear', root: { numerator: 1, denominator: 1 }, multiplicity: 2 },
        ])
      }
    }

    if (cubicPower.kind === 'success') {
      const factors = factorSupportedRationalDenominator(cubicPower.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'linear', root: { numerator: -2, denominator: 1 }, multiplicity: 3 },
        ])
      }
    }

    if (mixed.kind === 'success') {
      const factors = factorSupportedRationalDenominator(mixed.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'linear', root: { numerator: 1, denominator: 1 }, multiplicity: 2 },
          { kind: 'linear', root: { numerator: -3, denominator: 1 }, multiplicity: 1 },
        ])
      }
    }

    if (quadratic.kind === 'success') {
      const factors = factorSupportedRationalDenominator(quadratic.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'irreducible-quadratic', discriminant: { numerator: -4, denominator: 1 } },
        ])
      }
    }

    if (quadraticWithLinear.kind === 'success') {
      const factors = factorSupportedRationalDenominator(quadraticWithLinear.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'irreducible-quadratic', discriminant: { numerator: -3, denominator: 1 } },
        ])
      }
    }

    if (twoQuadratics.kind === 'success') {
      const factors = factorSupportedRationalDenominator(twoQuadratics.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'irreducible-quadratic', multiplicity: 1, constantCoefficient: { numerator: 1, denominator: 1 } },
          { kind: 'irreducible-quadratic', multiplicity: 1, constantCoefficient: { numerator: 4, denominator: 1 } },
        ])
      }
    }

    if (repeatedQuadraticPair.kind === 'success') {
      const factors = factorSupportedRationalDenominator(repeatedQuadraticPair.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors).toMatchObject([
          { kind: 'irreducible-quadratic', multiplicity: 2, constantCoefficient: { numerator: 1, denominator: 1 } },
          { kind: 'irreducible-quadratic', multiplicity: 1, constantCoefficient: { numerator: 4, denominator: 1 } },
        ])
      }
    }

    if (tooManyQuadratics.kind === 'success') {
      expect(factorSupportedRationalDenominator(tooManyQuadratics.rational.denominator)).toEqual({
        kind: 'stop',
        reason: 'unsupported-factorization',
      })
    }

    if (reducibleQuadratic.kind === 'success') {
      const factors = factorSupportedRationalDenominator(reducibleQuadratic.rational.denominator)
      expect(factors.kind).toBe('success')
      if (factors.kind === 'success') {
        expect(factors.factors.every((factor) => factor.kind === 'linear')).toBe(true)
      }
    }

    if (algebraicRoots.kind === 'success') {
      expect(factorSupportedRationalDenominator(algebraicRoots.rational.denominator)).toEqual({
        kind: 'stop',
        reason: 'algebraic-root-required',
      })
    }

    const overCap = normalizeExactRationalFunctionNode(parse('\\frac{1}{x^9+1}'), { maxDegree: 12 })
    expect(overCap.kind).toBe('success')
    if (overCap.kind === 'success') {
      expect(factorSupportedRationalDenominator(overCap.rational.denominator, { maxDegree: 4 })).toEqual({
        kind: 'stop',
        reason: 'factorization-degree-limit',
      })
    }
  })

  it('builds repeated-linear and quadratic partial-fraction readiness envelopes internally', () => {
    const repeated = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x-1)^2}'))
    const mixedRepeated = normalizeExactRationalFunctionNode(parse('\\frac{x+2}{(x-1)^2(x+3)}'))
    const quadratic = normalizeExactRationalFunctionNode(parse('\\frac{2x+1}{x^2+x+1}'))
    const mixedQuadratic = normalizeExactRationalFunctionNode(parse('\\frac{x+3}{(x-1)(x^2+1)}'))
    const twoQuadratics = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x^2+1)(x^2+4)}'))
    const repeatedQuadraticPair = normalizeExactRationalFunctionNode(parse('\\frac{1}{(x^2+1)^2(x^2+4)}'))

    expect(repeated.kind).toBe('success')
    expect(mixedRepeated.kind).toBe('success')
    expect(quadratic.kind).toBe('success')
    expect(mixedQuadratic.kind).toBe('success')
    expect(twoQuadratics.kind).toBe('success')
    expect(repeatedQuadraticPair.kind).toBe('success')

    if (repeated.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(repeated.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms).toMatchObject([
          {
            kind: 'linear-power',
            coefficient: { numerator: 1, denominator: 1 },
            root: { numerator: 1, denominator: 1 },
            power: 2,
          },
        ])
      }
    }

    if (mixedRepeated.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(mixedRepeated.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms.filter((term) => term.kind === 'linear-power').map((term) => term.power)).toEqual([
          1,
          2,
          1,
        ])
        expect(readiness.factorization.squareFree).toBe(false)
      }
    }

    if (quadratic.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(quadratic.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms).toMatchObject([
          {
            kind: 'irreducible-quadratic',
            linearCoefficient: { numerator: 2, denominator: 1 },
            constantCoefficient: { numerator: 1, denominator: 1 },
            derivativeCoefficient: { numerator: 1, denominator: 1 },
            residualConstant: { numerator: 0, denominator: 1 },
          },
        ])
      }
    }

    if (mixedQuadratic.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(mixedQuadratic.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms).toMatchObject([
          {
            kind: 'linear-power',
            coefficient: { numerator: 2, denominator: 1 },
            root: { numerator: 1, denominator: 1 },
            power: 1,
          },
          {
            kind: 'irreducible-quadratic',
            linearCoefficient: { numerator: -2, denominator: 1 },
            constantCoefficient: { numerator: -1, denominator: 1 },
          },
        ])
      }
    }

    if (twoQuadratics.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(twoQuadratics.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms.filter((term) => term.kind === 'irreducible-quadratic')).toHaveLength(2)
        expect(readiness.terms.every((term) => term.kind !== 'irreducible-quadratic' || term.power === 1)).toBe(true)
      }
    }

    if (repeatedQuadraticPair.kind === 'success') {
      const readiness = decomposeRationalPartialFractionReadiness(repeatedQuadraticPair.rational)
      expect(readiness.kind).toBe('success')
      if (readiness.kind === 'success') {
        expect(readiness.terms
          .filter((term) => term.kind === 'irreducible-quadratic')
          .map((term) => term.power)).toEqual([1, 2, 1])
      }
    }
  })

  it('keeps wider rational readiness controlled for unsupported inputs', () => {
    const decimal = normalizeExactRationalFunctionNode(parse('0.5+\\frac{1}{x}'))
    const multivariable = normalizeExactRationalFunctionNode(parse('\\frac{1}{x}+\\frac{1}{y}'))
    const overCap = normalizeExactRationalFunctionNode(parse('\\frac{x^9+1}{x+1}'), { maxDegree: 4 })
    const improper = normalizeExactRationalFunctionNode(parse('\\frac{x^2+1}{x-1}'))

    expect(decimal.kind).toBe('stop')
    expect(multivariable.kind).toBe('stop')
    expect(overCap.kind).toBe('stop')
    expect(improper.kind).toBe('success')

    if (improper.kind === 'success') {
      expect(decomposeRationalPartialFractionReadiness(improper.rational)).toEqual({
        kind: 'stop',
        reason: 'not-proper',
      })
    }
  })
})
