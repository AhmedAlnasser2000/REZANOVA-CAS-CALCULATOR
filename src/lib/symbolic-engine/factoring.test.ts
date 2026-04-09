import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import { factorAst } from './factoring'

const ce = new ComputeEngine()

function factorLatex(latex: string) {
  const parsed = ce.parse(latex)
  return ce.box(factorAst(parsed.json).node as Parameters<typeof ce.box>[0]).latex
}

function normalizedLatex(latex: string) {
  return latex.replaceAll('\\left', '').replaceAll('\\right', '').replaceAll(' ', '')
}

describe('symbolic-engine factoring', () => {
  it('prefers symbolic grouping before numeric factoring', () => {
    const factored = factorLatex('56u+27xu+27')

    expect(factored).toContain('u')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')
    expect(normalized).toContain('u(')
    expect(normalized).toContain('27x')
    expect(normalized).toContain('56')
  })

  it('factors symbolic common terms', () => {
    expect(factorLatex('ab+ac')).toContain('b+c')
    expect(factorLatex('3xy+5x')).toContain('3y+5')
  })

  it('falls back to numeric gcd factoring when symbolic grouping is not primary', () => {
    const factored = factorLatex('14x+21')

    expect(factored).toContain('7')
    expect(factored).toContain('2x+3')
  })

  it('keeps integer quadratic factoring working through the shared polynomial core', () => {
    const factored = factorLatex('x^2-5x+6')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')

    expect(normalized).toContain('x-2')
    expect(normalized).toContain('x-3')
  })

  it('adds bounded cubic factorization through the shared polynomial factor engine', () => {
    const factored = factorLatex('x^3-6x^2+11x-6')
    const normalized = factored.replaceAll('\\left', '').replaceAll('\\right', '')

    expect(normalized).toContain('x-1')
    expect(normalized).toContain('x^2-5x+6')
  })

  it('adds bounded quartic factorization for supported biquadratic and quadratic-pair families', () => {
    const biquadratic = factorLatex('x^4-5x^2+4').replaceAll('\\left', '').replaceAll('\\right', '')
    const quadraticPair = factorLatex('x^4+3x^3-x^2-4x+2').replaceAll('\\left', '').replaceAll('\\right', '')

    expect(biquadratic).toContain('x^2-1')
    expect(biquadratic).toContain('x^2-4')
    expect(quadraticPair).toContain('x^2+x-1')
    expect(quadraticPair).toContain('x^2+2x-2')
  })

  it('factors bounded mixed square-root carrier families through the shared carrier recognizer', () => {
    const perfectSquare = normalizedLatex(factorLatex('x+2\\sqrt{x}+1'))
    const mixedRoots = normalizedLatex(factorLatex('x-5\\sqrt{x}+6'))
    const cubicLike = normalizedLatex(factorLatex('x^{3/2}-3x+2\\sqrt{x}'))

    expect(perfectSquare).toBe('(\\sqrt{x}+1)^2')
    expect(mixedRoots).toContain('\\sqrt{x}-2')
    expect(mixedRoots).toContain('\\sqrt{x}-3')
    expect(cubicLike).toContain('\\sqrt{x}')
    expect(cubicLike).toContain('\\sqrt{x}-1')
    expect(cubicLike).toContain('\\sqrt{x}-2')
  })

  it('factors bounded same-base rational-power sibling families with one shared denominator', () => {
    const factored = normalizedLatex(factorLatex('x^{2/3}-5x^{1/3}+6'))

    expect(factored).toContain('\\sqrt[3]{x}-2')
    expect(factored).toContain('\\sqrt[3]{x}-3')
  })

  it('keeps unrelated radical bases and mixed denominator families unchanged', () => {
    const unrelated = normalizedLatex(factorLatex('\\sqrt{x}+\\sqrt{x+1}'))
    const mixedDenominators = normalizedLatex(factorLatex('x^{1/2}+x^{1/3}'))

    expect(unrelated).toBe('\\sqrt{x}+\\sqrt{x+1}')
    expect(mixedDenominators).toBe('\\sqrt{x}+\\sqrt[3]{x}')
  })
})
