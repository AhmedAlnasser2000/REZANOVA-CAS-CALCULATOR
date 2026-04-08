import { describe, expect, it } from 'vitest'
import {
  flattenAdd,
  flattenMultiply,
  parseAffine,
  toPolynomialTerms,
} from './patterns'

describe('symbolic-engine patterns', () => {
  it('flattens nested additive and multiplicative structures', () => {
    expect(flattenAdd(['Add', 1, ['Add', 2, 3]])).toEqual([1, 2, 3])
    expect(flattenMultiply(['Multiply', 2, ['Multiply', 'x', 'y']])).toEqual([2, 'x', 'y'])
  })

  it('parses simple affine forms in x', () => {
    const affine = parseAffine(['Add', ['Multiply', 3, 'x'], 2], 'x')

    expect(affine).toBeDefined()
    expect(affine?.a).toBe(3)
    expect(affine?.b).toBe(2)
  })

  it('extracts polynomial terms', () => {
    const terms = toPolynomialTerms(['Add', ['Power', 'x', 2], ['Multiply', 3, 'x'], 2], 'x')

    expect(terms).toEqual([
      { degree: 2, coefficient: 1 },
      { degree: 1, coefficient: 3 },
      { degree: 0, coefficient: 2 },
    ])
  })

  it('extracts exact rational polynomial terms through the shared polynomial core', () => {
    const terms = toPolynomialTerms(
      ['Add', ['Multiply', ['Rational', 3, 2], ['Power', 'x', 2]], ['Multiply', ['Rational', -1, 2], 'x'], 1],
      'x',
    )

    expect(terms).toEqual([
      { degree: 2, coefficient: 1.5 },
      { degree: 1, coefficient: -0.5 },
      { degree: 0, coefficient: 1 },
    ])
  })
})
