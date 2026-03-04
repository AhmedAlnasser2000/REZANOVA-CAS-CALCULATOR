import { describe, expect, it } from 'vitest'
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities'
import { getActiveGuideSymbols } from './symbols'

describe('guide symbols', () => {
  it('keeps sigma and summation as separate active symbols', () => {
    const symbols = getActiveGuideSymbols(ACTIVE_CAPABILITIES)
    const sigma = symbols.find((symbol) => symbol.id === 'symbol-greek-sigma')
    const sum = symbols.find((symbol) => symbol.id === 'symbol-sum')

    expect(sigma?.label).toBe('Σ')
    expect(sum?.label).toBe('∑')
    expect(sigma?.meaning).not.toBe(sum?.meaning)
  })

  it('exposes active keyboard metadata for discrete and calculus operators', () => {
    const symbols = getActiveGuideSymbols(ACTIVE_CAPABILITIES)
    const ncr = symbols.find((symbol) => symbol.id === 'symbol-ncr')
    const integral = symbols.find((symbol) => symbol.id === 'symbol-integral')
    const matrix = symbols.find((symbol) => symbol.id === 'symbol-matrix-template')

    expect(ncr?.keyboardPageId).toBe('combinatorics')
    expect(ncr?.supportLevel).toBe('numeric')
    expect(integral?.keyboardPageId).toBe('calculus')
    expect(matrix?.keyboardPageId).toBe('matrixVec')
  })
})
