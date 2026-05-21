import { describe, expect, it } from 'vitest'
import {
  addExactPolynomials,
  addExactScalars,
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  divideExactPolynomials,
  divideExactScalars,
  exactPolynomialCoefficientArray,
  exactPolynomialConstantTerm,
  exactPolynomialDegree,
  exactPolynomialGcd,
  exactPolynomialLeadingCoefficient,
  exactPolynomialContent,
  exactPolynomialIsZero,
  exactPolynomialToLatex,
  exactPolynomialToNode,
  exactScalarEquals,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  makeMonicExactPolynomial,
  multiplyExactPolynomials,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  primitiveExactPolynomial,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  scaleExactPolynomial,
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

  it('keeps exact scalar edge cases explicit', () => {
    expect(normalizeExactScalar({ numerator: 0, denominator: -5 })).toEqual({ numerator: 0, denominator: 1 })
    expect(normalizeExactScalar({ numerator: 3, denominator: 0 })).toEqual({ numerator: 3, denominator: 0 })
    expect(negateExactScalar({ numerator: 2, denominator: 3 })).toEqual({ numerator: -2, denominator: 3 })
    expect(exactScalarToNumber({ numerator: 3, denominator: 2 })).toBe(1.5)
    expect(divideExactScalars({ numerator: 1, denominator: 1 }, { numerator: 0, denominator: 1 })).toBeNull()
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

  it('parses shipped subtraction, division-by-scalar, and negation forms', () => {
    const subtraction = parseExactPolynomial(['Subtract', ['Power', 'x', 2], ['Multiply', 3, 'x'], 2], 'x', 4)
    const divided = parseExactPolynomial(['Divide', ['Add', 'x', 1], 2], 'x', 4)
    const negated = parseExactPolynomial(['Negate', ['Add', 'x', 1]], 'x', 4)

    expect(subtraction).toBeDefined()
    expect(getExactPolynomialCoefficient(subtraction!, 2)).toEqual({ numerator: 1, denominator: 1 })
    expect(getExactPolynomialCoefficient(subtraction!, 1)).toEqual({ numerator: -3, denominator: 1 })
    expect(getExactPolynomialCoefficient(subtraction!, 0)).toEqual({ numerator: -2, denominator: 1 })

    expect(divided).toBeDefined()
    expect(getExactPolynomialCoefficient(divided!, 1)).toEqual({ numerator: 1, denominator: 2 })
    expect(getExactPolynomialCoefficient(divided!, 0)).toEqual({ numerator: 1, denominator: 2 })

    expect(negated).toBeDefined()
    expect(getExactPolynomialCoefficient(negated!, 1)).toEqual({ numerator: -1, denominator: 1 })
    expect(getExactPolynomialCoefficient(negated!, 0)).toEqual({ numerator: -1, denominator: 1 })
  })

  it('rejects decimal coefficients, multivariable inputs, degree overflow, and non-polynomial forms', () => {
    expect(parseExactPolynomial(['Add', ['Multiply', 1.5, 'x'], 1], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Add', ['Multiply', 'x', 'y'], 1], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Power', 'x', 5], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Power', 'x', ['Rational', 3, 2]], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Power', 'x', -1], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Divide', 'x', 'x'], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Divide', 'x', 0], 'x', 4)).toBeNull()
    expect(parseExactPolynomial(['Sin', 'x'], 'x', 4)).toBeNull()
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

  it('adds, subtracts, scales, and queries exact polynomials', () => {
    const left = parseExactPolynomial(['Add', ['Power', 'x', 2], ['Multiply', 2, 'x'], 1], 'x', 4)
    const right = parseExactPolynomial(['Add', 'x', 3], 'x', 4)

    expect(left).toBeDefined()
    expect(right).toBeDefined()

    const sum = addExactPolynomials(left!, right!)
    expect(exactPolynomialDegree(sum)).toBe(2)
    expect(exactPolynomialLeadingCoefficient(sum)).toEqual({ numerator: 1, denominator: 1 })
    expect(getExactPolynomialCoefficient(sum, 1)).toEqual({ numerator: 3, denominator: 1 })
    expect(exactPolynomialConstantTerm(sum)).toEqual({ numerator: 4, denominator: 1 })

    const difference = addExactPolynomials(left!, right!, -1)
    expect(getExactPolynomialCoefficient(difference, 1)).toEqual({ numerator: 1, denominator: 1 })
    expect(exactPolynomialConstantTerm(difference)).toEqual({ numerator: -2, denominator: 1 })

    const zero = scaleExactPolynomial(left!, { numerator: 0, denominator: 1 })
    expect(exactPolynomialDegree(zero)).toBe(0)
    expect(exactPolynomialToNode(zero)).toBe(0)

    const otherVariable = parseExactPolynomial('y', 'y', 4)
    expect(otherVariable).toBeDefined()
    expect(() => addExactPolynomials(left!, otherVariable!)).toThrow('Cannot add polynomials with different variables.')
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

    const linear = parseExactPolynomial(['Add', 'x', 1], 'x', 4)
    expect(linear).toBeDefined()
    expect(quadraticDiscriminant(linear!)).toBeNull()
  })

  it('builds coefficient arrays and primitive integer forms', () => {
    const polynomial = buildExactPolynomialFromCoefficients('x', [
      { numerator: -2, denominator: 3 },
      { numerator: 4, denominator: 3 },
      { numerator: -2, denominator: 3 },
    ])

    expect(exactPolynomialCoefficientArray(polynomial)).toEqual([
      { numerator: -2, denominator: 3 },
      { numerator: 4, denominator: 3 },
      { numerator: -2, denominator: 3 },
    ])
    expect(exactPolynomialContent(polynomial)).toEqual({ numerator: -2, denominator: 3 })

    const primitive = primitiveExactPolynomial(polynomial)
    expect(primitive).not.toBeNull()
    expect(primitive?.scalar).toEqual({ numerator: -2, denominator: 3 })
    expect(exactPolynomialToNode(primitive!.polynomial)).toEqual([
      'Add',
      ['Power', 'x', 2],
      ['Multiply', -2, 'x'],
      1,
    ])
  })

  it('makes nonzero polynomials monic and leaves zero explicit', () => {
    const polynomial = parseExactPolynomial(['Add', ['Multiply', 3, ['Power', 'x', 2]], ['Multiply', 6, 'x']], 'x', 4)
    const zero = parseExactPolynomial(0, 'x', 4)

    expect(polynomial).toBeDefined()
    expect(zero).toBeDefined()
    expect(exactPolynomialIsZero(zero!)).toBe(true)
    expect(makeMonicExactPolynomial(zero!)).toBeNull()

    const monic = makeMonicExactPolynomial(polynomial!)
    expect(monic).not.toBeNull()
    expect(getExactPolynomialCoefficient(monic!, 2)).toEqual({ numerator: 1, denominator: 1 })
    expect(getExactPolynomialCoefficient(monic!, 1)).toEqual({ numerator: 2, denominator: 1 })
  })

  it('divides exact polynomials with quotient and remainder', () => {
    const dividend = parseExactPolynomial(['Add', ['Power', 'x', 3], ['Negate', 1]], 'x', 4)
    const divisor = parseExactPolynomial(['Add', 'x', ['Negate', 1]], 'x', 4)
    const nonFactor = parseExactPolynomial(['Add', 'x', 2], 'x', 4)

    expect(dividend).toBeDefined()
    expect(divisor).toBeDefined()
    expect(nonFactor).toBeDefined()

    const exact = divideExactPolynomials(dividend!, divisor!)
    expect(exact).not.toBeNull()
    expect(exactPolynomialIsZero(exact!.remainder)).toBe(true)
    expect(exactPolynomialToNode(exact!.quotient)).toEqual([
      'Add',
      ['Power', 'x', 2],
      'x',
      1,
    ])

    const withRemainder = divideExactPolynomials(dividend!, nonFactor!)
    expect(withRemainder).not.toBeNull()
    expect(exactPolynomialIsZero(withRemainder!.remainder)).toBe(false)
    expect(getExactPolynomialCoefficient(withRemainder!.remainder, 0)).toEqual({ numerator: -9, denominator: 1 })
  })

  it('computes monic polynomial gcds over rational coefficients', () => {
    const left = parseExactPolynomial(['Add', ['Power', 'x', 2], ['Negate', 1]], 'x', 4)
    const right = parseExactPolynomial(['Add', ['Power', 'x', 2], ['Multiply', -3, 'x'], 2], 'x', 4)
    const coprime = parseExactPolynomial(['Add', ['Power', 'x', 2], 1], 'x', 4)
    const otherVariable = parseExactPolynomial(['Add', 'y', 1], 'y', 4)

    expect(left).toBeDefined()
    expect(right).toBeDefined()
    expect(coprime).toBeDefined()
    expect(otherVariable).toBeDefined()

    const gcd = exactPolynomialGcd(left!, right!)
    expect(gcd).not.toBeNull()
    expect(exactPolynomialToNode(gcd!)).toEqual(['Add', 'x', -1])

    const unit = exactPolynomialGcd(left!, coprime!)
    expect(unit).not.toBeNull()
    expect(exactScalarEquals(getExactPolynomialCoefficient(unit!, 0), { numerator: 1, denominator: 1 })).toBe(true)
    expect(exactPolynomialGcd(left!, otherVariable!)).toBeNull()
  })
})
