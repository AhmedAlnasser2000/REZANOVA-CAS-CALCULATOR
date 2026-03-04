import { describe, expect, it } from 'vitest'
import { resolveSymbolicIntegralFromLatex } from './integration'

describe('symbolic-engine integration', () => {
  it('handles supported substitution-friendly forms', () => {
    const first = resolveSymbolicIntegralFromLatex('2x\\cos(x^2)')
    const second = resolveSymbolicIntegralFromLatex('\\frac{1}{2x+1}')
    const third = resolveSymbolicIntegralFromLatex('(3x^2+2x)e^(x^3+x^2)')
    const fourth = resolveSymbolicIntegralFromLatex('(6x+3)(3x^2+3x+2)^5')

    expect(first.kind).toBe('success')
    if (first.kind === 'success') {
      expect(first.exactLatex).toContain('\\sin')
    }

    expect(second.kind).toBe('success')
    if (second.kind === 'success') {
      expect(second.exactLatex).toContain('\\ln')
    }

    expect(third.kind).toBe('success')
    if (third.kind === 'success') {
      expect(third.exactLatex).toContain('e^{')
      expect(third.exactLatex).toContain('x^3+x^2')
    }

    expect(fourth.kind).toBe('success')
    if (fourth.kind === 'success') {
      expect(fourth.exactLatex).toContain('3x^2+3x+2')
      expect(fourth.exactLatex).toContain('^{6}')
    }
  })

  it('handles supported integration-by-parts families', () => {
    const expCase = resolveSymbolicIntegralFromLatex('xe^x')
    const trigCase = resolveSymbolicIntegralFromLatex('x\\cos(x)')
    const expQuadratic = resolveSymbolicIntegralFromLatex('x^2e^x')
    const trigQuadratic = resolveSymbolicIntegralFromLatex('x^2\\sin(x)')
    const logCase = resolveSymbolicIntegralFromLatex('x\\ln(x)')

    expect(expCase.kind).toBe('success')
    expect(trigCase.kind).toBe('success')
    expect(expQuadratic.kind).toBe('success')
    expect(trigQuadratic.kind).toBe('success')
    expect(logCase.kind).toBe('success')
  })

  it('handles supported inverse-trig primitives', () => {
    const atanCase = resolveSymbolicIntegralFromLatex('\\frac{1}{1+x^2}')
    const asinCase = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{1-x^2}}')
    const atanScaled = resolveSymbolicIntegralFromLatex('\\frac{1}{9+x^2}')
    const asinScaled = resolveSymbolicIntegralFromLatex('\\frac{1}{\\sqrt{4-x^2}}')

    expect(atanCase.kind).toBe('success')
    if (atanCase.kind === 'success') {
      expect(atanCase.exactLatex).toContain('\\arctan')
    }

    expect(asinCase.kind).toBe('success')
    if (asinCase.kind === 'success') {
      expect(asinCase.exactLatex).toContain('\\arcsin')
    }

    expect(atanScaled.kind).toBe('success')
    if (atanScaled.kind === 'success') {
      expect(atanScaled.exactLatex).toContain('\\arctan')
      expect(atanScaled.exactLatex).toContain('\\frac')
    }

    expect(asinScaled.kind).toBe('success')
    if (asinScaled.kind === 'success') {
      expect(asinScaled.exactLatex).toContain('\\arcsin')
      expect(asinScaled.exactLatex).toContain('\\frac')
    }
  })

  it('fails cleanly on unsupported indefinite integrals', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{1+x^4}')

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error).toContain('could not be determined symbolically')
    }
  })
})
