import { describe, expect, it } from 'vitest'
import {
  addExactScalars,
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactPolynomials,
  multiplyExactScalars,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
} from './polynomial-core'

describe('polynomial-core', () => {
  it('normalizes and combines exact scalars correctly', () => {
    expect(readExactScalarNode(['Rational', 6, -8])).toEqual({ numerator: -3, denominator: 4 })
    expect(addExactScalars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 })).toEqual({
      numerator: 5,
      denominator: 6,
    })
    expect(multiplyExactScalars({ numerator: -2, denominator: 3 }, { numerator: 9, denominator: 10 })).toEqual({
      numerator: -3,
      denominator: 5,
    })
    expect(divideExactScalars({ numerator: 3, denominator: 4 }, { numerator: -9, denominator: 5 })).toEqual({
      numerator: -5,
      denominator: 12,
    })
    expect(buildExactScalarNode({ numerator: 4, denominator: 6 })).toEqual(['Rational', 2, 3])
  })

  it('parses exact integer and rational polynomials up to degree four', () => {
    const quartic = parseExactPolynomial(
      ['Add', ['Power', 'x', 4], ['Multiply', -3, ['Power', 'x', 2]], ['Multiply', ['Rational', 5, 2], 'x'], 7],
      'x',
      4,
    )

    expect(quartic).toBeDefined()
    expect(getExactPolynomialCoefficient(quartic!, 4)).toEqual({ numerator: 1, denominator: 1 })
    expect(getExactPolynomialCoefficient(quartic!, 2)).toEqual({ numerator: -3, denominator: 1 })
    expect(getExactPolynomialCoefficient(quartic!, 1)).toEqual({ numerator: 5, denominator: 2 })
    expect(getExactPolynomialCoefficient(quartic!, 0)).toEqual({ numerator: 7, denominator: 1 })
  })

  it('rejects decimal coefficients, multivariable inputs, and degree overflow', () => {
    expect(parseExactPolynomial(['Add', ['Multiply', 1.5, 'x'], 1], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Add', ['Multiply', 'x', 'y'], 1], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Power', 'x', 5], 'x', 4)).toBeNull()
  })

  it('rebuilds canonical node and latex output', () => {
    const polynomial = parseExactPolynomial(
      ['Add', ['Multiply', ['Rational', 3, 2], ['Power', 'x', 2]], ['Negate', 'x'], 1],
      'x',
      4,
    )

    expect(polynomial).toBeDefined()
    expect(exactPolynomialToNode(polynomial!)).toEqual([
      'Add',
      ['Multiply', ['Rational', 3, 2], ['Power', 'x', 2]],
      ['Negate', 'x'],
      1,
    ])

    const latex = exactPolynomialToLatex(polynomial!)
    expect(latex).toContain('\\frac{3x^2}{2}')
    expect(latex).toContain('x^2')
    expect(latex).toContain('-x')
  })

  it('multiplies bounded polynomials and stops past the degree cap', () => {
    const left = parseExactPolynomial(['Add', 'x', 1], 'x', 4)
    const right = parseExactPolynomial(['Add', 'x', -2], 'x', 4)

    expect(left).toBeDefined()
    expect(right).toBeDefined()

    const product = multiplyExactPolynomials(left!, right!, 4)
    expect(product).toBeDefined()
    expect(getExactPolynomialCoefficient(product!, 2)).toEqual({ numerator: 1, denominator: 1 })
    expect(getExactPolynomialCoefficient(product!, 1)).toEqual({ numerator: -1, denominator: 1 })
    expect(getExactPolynomialCoefficient(product!, 0)).toEqual({ numerator: -2, denominator: 1 })

    const quartic = parseExactPolynomial(['Power', 'x', 4], 'x', 4)
    const linear = parseExactPolynomial(['Add', 'x', 1], 'x', 4)
    expect(multiplyExactPolynomials(quartic!, linear!, 4)).toBeNull()
  })

  it('computes quadratic discriminants exactly', () => {
    const quadratic = parseExactPolynomial(['Add', ['Multiply', 2, ['Power', 'x', 2]], ['Multiply', -3, 'x'], 1], 'x', 4)
    expect(quadratic).toBeDefined()
    expect(quadraticDiscriminant(quadratic!)).toEqual({ numerator: 1, denominator: 1 })
  })
})
