import { describe, expect, it } from 'vitest'
import { runCalculateAlgebraTransform, runCalculateMode } from './calculate'

describe('runCalculateMode', () => {
  it('returns a prompt instead of solving equations', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '5x+6=3',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('prompt')
    if (result.kind !== 'prompt') {
      throw new Error('Expected a prompt outcome')
    }
    expect(result.message).toBe('Use Equation mode to solve this expression.')
    expect(result.targetMode).toBe('equation')
    expect(result.carryLatex).toBe('5x+6=3')
  })

  it('keeps factorization inside calculate mode', () => {
    const result = runCalculateMode({
      action: 'factor',
      latex: 'x^2+2x+1',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toContain('x+1')
  })

  it('labels free-form Calculate integrals as integrals instead of numeric results', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\int_{}^{} 2x ln\\left(x^2+1\\right)\\,dx',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.title).toBe('Integral')
    expect(result.resultOrigin).toBe('rule-based-symbolic')
    expect(result.calculusStrategy).toBe('u-substitution')
    expect(result.resolvedInputLatex).toContain('\\ln')
    expect(result.resolvedInputLatex).not.toContain('_{}^{}')
  })

  it('labels free-form Calculate derivatives and exposes derivative strategy metadata', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\frac{d}{dx}\\sin^2\\left(\\cos^3\\left(x\\right)\\right)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.title).toBe('Derivative')
    expect(result.calculusDerivativeStrategies).toContain('function-power')
    expect(result.calculusDerivativeStrategies).toContain('chain-rule')
    expect(result.calculusDerivativeStrategies).not.toContain('compute-engine')
    expect(result.exactLatex).toContain('\\sin(x)')
    expect(result.exactLatex).toContain('\\cos(x)^2')
  })

  it('keeps guided derivative strategy metadata aligned with the shared derivative core', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\frac{d}{dx}\\left(\\cos^{2x}\\left(x\\right)\\right)',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.title).toBe('Derivative')
    expect(result.calculusDerivativeStrategies).toContain('function-power')
    expect(result.calculusDerivativeStrategies).toContain('general-power')
    expect(result.calculusDerivativeStrategies).not.toContain('compute-engine')
    expect(result.exactLatex).toContain('\\ln')
  })

  it('normalizes free-form directional limit targets before planning', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\lim_{x\\to 0^+}\\frac{1}{x}',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.title).toBe('Limit')
    expect(result.resultOrigin).toBe('rule-based-symbolic')
    expect(result.exactLatex).toBe('\\infty')
  })

  it('carries accurate limit detail notes through Calculate mode', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: '\\lim_{x\\to 0^-}\\frac{3x}{x+x^2}',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toBe('3')
    expect(result.detailSections?.[0]?.title).toBe('Limit Method')
    expect(result.detailSections?.[0]?.lines.join(' ')).toContain('rational normalizer')
  })

  it('returns a controlled error for algebra relation operators', () => {
    const result = runCalculateMode({
      action: 'evaluate',
      latex: 'x\\le2',
      angleUnit: 'deg',
      outputStyle: 'both',
      ansLatex: '0',
    })

    expect(result.kind).toBe('error')
    if (result.kind !== 'error') {
      throw new Error('Expected an error outcome')
    }
    expect(result.error).toContain('Inequalities')
    expect(result.runtimeAdvisories?.stopReason).toEqual({
      kind: 'invalid-request',
      source: 'host',
    })
  })

  it('runs explicit algebra transforms without changing the broad simplify action', () => {
    const result = runCalculateAlgebraTransform({
      action: 'combineFractions',
      latex: '\\frac{1}{3}+\\frac{1}{6x}',
      angleUnit: 'deg',
    })

    expect(result.kind).toBe('success')
    if (result.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(result.exactLatex).toBe('\\frac{2x+1}{6x}')
    expect(result.transformBadges).toEqual(['Combine Fractions'])
    expect(result.exactSupplementLatex?.[0]).toContain('x\\ne0')
  })

  it('runs PRL3 symbolic algebra transforms explicitly in Calculate', () => {
    const asPower = runCalculateAlgebraTransform({
      action: 'rewriteAsPower',
      latex: '\\sqrt[3]{\\sqrt{x}}',
      angleUnit: 'deg',
    })
    const asRoot = runCalculateAlgebraTransform({
      action: 'rewriteAsRoot',
      latex: 'x^{1/6}',
      angleUnit: 'deg',
    })
    const changedBase = runCalculateAlgebraTransform({
      action: 'changeBase',
      latex: '\\log_{4}(x)',
      angleUnit: 'deg',
    })

    expect(asPower.kind).toBe('success')
    if (asPower.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(asPower.exactLatex).toBe('x^{\\frac{1}{6}}')
    expect(asPower.transformBadges).toEqual(['Rewrite as Power'])

    expect(asRoot.kind).toBe('success')
    if (asRoot.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(asRoot.exactLatex).toBe('\\sqrt[6]{x}')
    expect(asRoot.transformBadges).toEqual(['Rewrite as Root'])

    expect(changedBase.kind).toBe('success')
    if (changedBase.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(changedBase.exactLatex).toBe('\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}')
    expect(changedBase.transformBadges).toEqual(['Change Base'])
  })

  it('runs widened bounded conjugate and rationalize transforms explicitly in Calculate', () => {
    const affineConjugate = runCalculateAlgebraTransform({
      action: 'conjugate',
      latex: '\\frac{1}{2+\\sqrt{x}}',
      angleUnit: 'deg',
    })
    const threeTermRationalize = runCalculateAlgebraTransform({
      action: 'rationalize',
      latex: '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}',
      angleUnit: 'deg',
    })

    expect(affineConjugate.kind).toBe('success')
    if (affineConjugate.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(affineConjugate.exactLatex).toBe('\\frac{2-\\sqrt{x}}{4-x}')
    expect(affineConjugate.transformBadges).toEqual(['Conjugate'])
    expect(affineConjugate.exactSupplementLatex).toEqual([
      '\\text{Exclusions: } \\sqrt{x}+2\\ne0',
      '\\text{Conditions: } x\\ge0',
    ])

    expect(threeTermRationalize.kind).toBe('success')
    if (threeTermRationalize.kind !== 'success') {
      throw new Error('Expected a success outcome')
    }
    expect(threeTermRationalize.exactLatex).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})')
    expect(threeTermRationalize.transformBadges).toEqual(['Rationalize'])
  })
})
