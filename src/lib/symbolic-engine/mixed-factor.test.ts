import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import { factorMixedCarrierAst } from './mixed-factor'

const ce = new ComputeEngine()

function parse(latex: string) {
  return ce.parse(latex).json
}

function factorLatex(latex: string) {
  const result = factorMixedCarrierAst(parse(latex))
  return result
    ? {
        ...result,
        latex: normalizeLatex(ce.box(result.node as Parameters<typeof ce.box>[0]).latex),
        carrierLatex: normalizeLatex(ce.box(result.carrierNode as Parameters<typeof ce.box>[0]).latex),
        polynomialLatex: normalizeLatex(ce.box(result.polynomialNode as Parameters<typeof ce.box>[0]).latex),
      }
    : null
}

function normalizeLatex(latex: string) {
  return latex.replaceAll('\\left', '').replaceAll('\\right', '').replaceAll(' ', '')
}

describe('factorMixedCarrierAst', () => {
  it('factors bounded square-root carrier perfect squares directly', () => {
    const result = factorLatex('x+2\\sqrt{x}+1')

    expect(result).not.toBeNull()
    expect(result?.strategy).toBe('mixed-carrier-factorization')
    expect(result?.carrierLatex).toBe('\\sqrt{x}')
    expect(result?.polynomialLatex).toBe('u^2+2u+1')
    expect(result?.latex).toBe('(\\sqrt{x}+1)^2')
  })

  it('factors split square-root carrier roots directly', () => {
    const result = factorLatex('x-5\\sqrt{x}+6')

    expect(result).not.toBeNull()
    expect(result?.strategy).toBe('mixed-carrier-factorization')
    expect(result?.polynomialLatex).toBe('u^2-5u+6')
    expect(result?.latex).toContain('\\sqrt{x}-2')
    expect(result?.latex).toContain('\\sqrt{x}-3')
  })

  it('factors cubic-like square-root carrier families directly', () => {
    const result = factorLatex('x^{3/2}-3x+2\\sqrt{x}')

    expect(result).not.toBeNull()
    expect(result?.strategy).toBe('mixed-carrier-factorization')
    expect(result?.polynomialLatex).toBe('u^3-3u^2+2u')
    expect(result?.latex).toContain('\\sqrt{x}')
    expect(result?.latex).toContain('\\sqrt{x}-1')
    expect(result?.latex).toContain('\\sqrt{x}-2')
  })

  it('factors same-base rational-power sibling families directly', () => {
    const result = factorLatex('x^{2/3}-5x^{1/3}+6')

    expect(result).not.toBeNull()
    expect(result?.strategy).toBe('mixed-carrier-factorization')
    expect(result?.carrierLatex).toBe('\\sqrt[3]{x}')
    expect(result?.polynomialLatex).toBe('u^2-5u+6')
    expect(result?.latex).toContain('\\sqrt[3]{x}-2')
    expect(result?.latex).toContain('\\sqrt[3]{x}-3')
  })

  it('rejects unrelated radical bases and mixed denominator carrier families', () => {
    expect(factorMixedCarrierAst(parse('\\sqrt{x}+\\sqrt{x+1}'))).toBeNull()
    expect(factorMixedCarrierAst(parse('x^{1/2}+x^{1/3}'))).toBeNull()
  })

  it('rejects multivariable and coefficient-contaminated carrier shapes', () => {
    expect(factorMixedCarrierAst(parse('x+y\\sqrt{x}+1'))).toBeNull()
    expect(factorMixedCarrierAst(parse('\\sin(x)\\sqrt{x}+1'))).toBeNull()
  })
})
