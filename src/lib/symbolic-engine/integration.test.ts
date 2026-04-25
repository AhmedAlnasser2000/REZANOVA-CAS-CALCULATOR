import { describe, expect, it } from 'vitest'
import { resolveSymbolicIntegralFromLatex } from './integration'

describe('symbolic-engine integration', () => {
  it('classifies existing supported strategies without changing outputs', () => {
    const direct = resolveSymbolicIntegralFromLatex('x^2')
    const inverseTrig = resolveSymbolicIntegralFromLatex('\\frac{1}{1+x^2}')
    const derivativeRatio = resolveSymbolicIntegralFromLatex('\\frac{2x+3}{x^2+3x+2}')
    const substitution = resolveSymbolicIntegralFromLatex('2x\\cos(x^2)')
    const byParts = resolveSymbolicIntegralFromLatex('xe^x')

    expect(direct.kind).toBe('success')
    if (direct.kind === 'success') {
      expect(direct.strategy).toBe('direct-rule')
      expect(direct.exactLatex).toContain('x^{3}')
      expect(direct.verification.status).toBe('verified-exact')
    }

    expect(inverseTrig.kind).toBe('success')
    if (inverseTrig.kind === 'success') {
      expect(inverseTrig.strategy).toBe('inverse-trig')
      expect(inverseTrig.exactLatex).toContain('\\arctan')
    }

    expect(derivativeRatio.kind).toBe('success')
    if (derivativeRatio.kind === 'success') {
      expect(derivativeRatio.strategy).toBe('derivative-ratio')
      expect(derivativeRatio.exactLatex).toContain('\\ln')
    }

    expect(substitution.kind).toBe('success')
    if (substitution.kind === 'success') {
      expect(substitution.strategy).toBe('u-substitution')
      expect(substitution.exactLatex).toContain('\\sin')
    }

    expect(byParts.kind).toBe('success')
    if (byParts.kind === 'success') {
      expect(byParts.strategy).toBe('integration-by-parts')
      expect(byParts.exactLatex).toContain('e^{x}')
    }
  })

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

  it('handles CALC-COMP1 bounded composition antiderivatives', () => {
    const cases = [
      { latex: '\\cos(3x+2)', contains: '\\sin' },
      { latex: '5\\cos(3x+2)', contains: '\\frac{5' },
      { latex: '2x e^{x^2+1}', contains: 'e^{x^2+1}' },
      { latex: '2x\\ln(x^2+1)', contains: '\\ln' },
      { latex: '2x\\log(x^2+1)', contains: '\\ln(10)' },
      { latex: '2x\\sqrt{x^2+1}', contains: '\\frac{2' },
      { latex: '\\frac{2x}{\\sqrt{x^2+1}}', contains: '\\frac{1}{2}' },
      { latex: '\\cos(\\sin(x))\\cos(x)', contains: '\\sin' },
    ]

    for (const { latex, contains } of cases) {
      const result = resolveSymbolicIntegralFromLatex(latex)
      expect(result.kind, latex).toBe('success')
      if (result.kind === 'success') {
        expect(result.strategy, latex).toBe('u-substitution')
        expect(result.verification.status, latex).toMatch(/verified-/)
        expect(result.exactLatex, latex).toContain(contains)
      }
    }
  })

  it('handles supported integration-by-parts families', () => {
    const expCase = resolveSymbolicIntegralFromLatex('xe^x')
    const trigCase = resolveSymbolicIntegralFromLatex('x\\cos(x)')
    const expQuadratic = resolveSymbolicIntegralFromLatex('x^2e^x')
    const trigQuadratic = resolveSymbolicIntegralFromLatex('x^2\\sin(x)')
    const expHighDegree = resolveSymbolicIntegralFromLatex('x^5e^x')
    const trigHighDegree = resolveSymbolicIntegralFromLatex('x^5\\cos(x)')
    const logCase = resolveSymbolicIntegralFromLatex('x\\ln(x)')

    expect(expCase.kind).toBe('success')
    expect(trigCase.kind).toBe('success')
    expect(expQuadratic.kind).toBe('success')
    expect(trigQuadratic.kind).toBe('success')
    expect(expHighDegree.kind).toBe('success')
    expect(trigHighDegree.kind).toBe('success')
    expect(logCase.kind).toBe('success')

    if (expHighDegree.kind === 'success') {
      expect(expHighDegree.strategy).toBe('integration-by-parts')
      expect(expHighDegree.verification.status).toMatch(/verified-/)
    }
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
    const substitutionGap = resolveSymbolicIntegralFromLatex('\\sin(x^2)')
    const missingExpDerivative = resolveSymbolicIntegralFromLatex('e^{x^2}')
    const missingLogDerivative = resolveSymbolicIntegralFromLatex('\\ln(x^2+1)')
    const absSubstitutionGap = resolveSymbolicIntegralFromLatex('|x|\\cos(x^2)')

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error).toContain('could not be determined symbolically')
    }

    expect(substitutionGap.kind).toBe('error')
    expect(missingExpDerivative.kind).toBe('error')
    expect(missingLogDerivative.kind).toBe('error')
    expect(absSubstitutionGap.kind).toBe('error')
  })
})
