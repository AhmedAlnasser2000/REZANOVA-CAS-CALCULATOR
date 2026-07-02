import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import {
  resolveFiniteLimitRule,
  resolveFiniteSqueezeOscillationLimit,
  resolveInfiniteIndeterminateTransformLimit,
} from './limits'

const ce = new ComputeEngine()

describe('symbolic-engine limits', () => {
  it('resolves removable singularity limits', () => {
    const rationalCases = [
      ['\\frac{x^2-1}{x-1}', 1, 2],
      ['\\frac{x^3-1}{x-1}', 1, 3],
      ['\\frac{x^2-2x+1}{x-1}', 1, 0],
      ['\\frac{x^2}{x}', 0, 0],
      ['\\frac{3x}{x+x^2}', 0, 3],
      ['\\frac{x^3-1}{x^2-1}', 1, 1.5],
      ['\\frac{x^2+x}{x}', 0, 1],
    ] as const
    const trig = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(x)}{x}').json, 0, 'x')

    for (const [latex, target, expected] of rationalCases) {
      const rational = resolveFiniteLimitRule(ce.parse(latex).json, target, 'x')
      expect(rational.kind).toBe('success')
      if (rational.kind === 'success' && typeof rational.value === 'number') {
        expect(rational.origin).toBe('rule-based-symbolic')
        expect(rational.value).toBeCloseTo(expected, 8)
        expect(rational.detailSections?.[0]?.title).toBe('Limit Method')
      }
    }

    expect(trig.kind).toBe('success')
    if (trig.kind === 'success') {
      expect(trig.origin).toBe('rule-based-symbolic')
      expect(trig.value).toBeCloseTo(1, 8)
    }
  })

  it('uses app-owned rules for bounded composed known forms', () => {
    const cases = [
      ['\\frac{\\sin(3x)}{3x}', 1],
      ['\\frac{\\tan(x)}{x}', 1],
      ['\\frac{1-\\cos(x)}{x^2}', 0.5],
      ['\\frac{e^x-1}{x}', 1],
      ['\\frac{\\ln(1+x)}{x}', 1],
      ['\\frac{\\sqrt{1+x}-1}{x}', 0.5],
      ['\\frac{\\sin(x^2)}{x^2}', 1],
      ['\\frac{\\ln(1+x^2)}{x^2}', 1],
    ] as const

    for (const [latex, expected] of cases) {
      const result = resolveFiniteLimitRule(ce.parse(latex).json, 0, 'x')
      expect(result.kind).toBe('success')
      if (result.kind === 'success') {
        expect(result.origin).toBe('rule-based-symbolic')
        expect(result.value).toBeCloseTo(expected, 8)
      }
    }
  })

  it('uses local equivalents before capped LHopital for bounded composed ratios', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(3x)}{x}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('rule-based-symbolic')
      expect(result.value).toBeCloseTo(3, 6)
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('local orders')
    }
  })

  it('resolves bounded elementary-equivalent products and powers', () => {
    const cases = [
      ['\\frac{\\ln(1+x)\\sin(x)}{x^2}', 1],
      ['\\frac{1-\\cos(2x)}{x^2}', 2],
      ['\\frac{\\cos(x)-1}{x^2}', -0.5],
      ['\\frac{e^{x^2}-1}{x^2}', 1],
      ['\\frac{1-e^x}{x}', -1],
      ['\\frac{\\arctan(3x)}{x}', 3],
      ['\\frac{\\arcsin(2x)}{x}', 2],
      ['\\frac{x-\\sin(x)}{x^3}', 1 / 6],
    ] as const

    for (const [latex, expected] of cases) {
      const result = resolveFiniteLimitRule(ce.parse(latex).json, 0, 'x')
      expect(result.kind).toBe('success')
      if (result.kind === 'success' && typeof result.value === 'number') {
        expect(result.origin).toBe('rule-based-symbolic')
        expect(result.value).toBeCloseTo(expected, 8)
        expect(result.detailSections?.[0]?.title).toBe('Limit Method')
      }
    }
  })

  it('shows readable local-equivalent method lines and exact small fractions', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{\\cos(x)-1}{x^2}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      const method = result.detailSections?.[0]?.lines.join(' ') ?? ''
      expect(result.exactLatex).toBe('-\\frac{1}{2}')
      expect(method).toContain('Form detected')
      expect(method).toContain('Rewrite/equivalent')
      expect(method).toContain('Key calculation')
      expect(method).toContain('Conclusion')
    }
  })

  it('does not apply known-form rules to unsafe compositions', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{\\ln(1+x)}{x^2}').json, 0, 'x')
    const oscillatory = resolveFiniteLimitRule(ce.parse('\\sin(1/x)').json, 0, 'x')

    if (result.kind === 'success') {
      expect(result.origin).not.toBe('rule-based-symbolic')
    } else {
      expect(result.kind).toBe('unhandled')
    }
    expect(oscillatory.kind).toBe('unhandled')
  })

  it('promotes former LHopital-only known forms to rule-based symbolic wins', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{1-\\cos(x)}{x^2}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('rule-based-symbolic')
      expect(result.value).toBeCloseTo(0.5, 6)
    }
  })

  it('resolves sign-aware one-sided and same-sign finite asymptotes', () => {
    const right = resolveFiniteLimitRule(ce.parse('\\frac{1}{x}').json, 0, 'x', 'right')
    const left = resolveFiniteLimitRule(ce.parse('\\frac{1}{x}').json, 0, 'x', 'left')
    const twoSidedSquare = resolveFiniteLimitRule(ce.parse('\\frac{1}{x^2}').json, 0, 'x', 'two-sided')
    const mismatched = resolveFiniteLimitRule(ce.parse('\\frac{1}{x}').json, 0, 'x', 'two-sided')

    expect(right.kind).toBe('success')
    if (right.kind === 'success') {
      expect(right.origin).toBe('rule-based-symbolic')
      expect(right.value).toBe('posInfinity')
    }

    expect(left.kind).toBe('success')
    if (left.kind === 'success') {
      expect(left.value).toBe('negInfinity')
    }

    const postCancelPole = resolveFiniteLimitRule(ce.parse('\\frac{x+1}{x^3}').json, 0, 'x', 'right')
    const mismatchAfterCancel = resolveFiniteLimitRule(ce.parse('\\frac{x}{x^2}').json, 0, 'x', 'two-sided')

    expect(postCancelPole.kind).toBe('success')
    if (postCancelPole.kind === 'success') {
      expect(postCancelPole.value).toBe('posInfinity')
      expect(postCancelPole.detailSections?.[0]?.lines.join(' ')).toContain('negative net order')
    }
    expect(mismatchAfterCancel.kind).toBe('unhandled')

    expect(twoSidedSquare.kind).toBe('success')
    if (twoSidedSquare.kind === 'success') {
      expect(twoSidedSquare.value).toBe('posInfinity')
    }

    expect(mismatched.kind).toBe('unhandled')
  })

  it('rewrites finite local algebra over a common denominator before leading-order comparison', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{1}{x}-\\frac{1}{\\sin(x)}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('rule-based-symbolic')
      expect(result.value).toBeCloseTo(0, 8)
      expect(result.exactLatex).toBe('0')
      expect(result.detailSections?.[0]?.lines.join(' ')).toContain('common denominator')
    }
  })

  it('resolves safe indeterminate transforms', () => {
    const product = resolveFiniteLimitRule(ce.parse('x\\ln(x)').json, 0, 'x', 'right')
    const power = resolveInfiniteIndeterminateTransformLimit(
      ce.parse('(1+1/x)^x').json,
      'posInfinity',
      'x',
    )

    expect(product.kind).toBe('success')
    if (product.kind === 'success') {
      expect(product.value).toBe(0)
      expect(product.exactLatex).toBe('0')
      expect(product.detailSections?.[0]?.lines.join(' ')).toContain('0 times infinity')
    }

    expect(power?.kind).toBe('success')
    if (power?.kind === 'success') {
      expect(power.exactLatex).toBe('e')
      expect(power.value).toBeCloseTo(Math.E, 8)
      expect(power.detailSections?.[0]?.lines.join(' ')).toContain('Rewrite/equivalent')
    }
  })

  it('uses capped Taylor leading terms for additive cancellations', () => {
    const tangent = resolveFiniteLimitRule(ce.parse('\\frac{\\tan(x)-x}{x^3}').json, 0, 'x')
    const exponential = resolveFiniteLimitRule(
      ce.parse('\\frac{e^x-1-x-x^2/2}{x^3}').json,
      0,
      'x',
    )

    expect(tangent.kind).toBe('success')
    if (tangent.kind === 'success') {
      expect(tangent.value).toBeCloseTo(1 / 3, 8)
      expect(tangent.exactLatex).toBe('\\frac{1}{3}')
      expect(tangent.detailSections?.[0]?.lines.join(' ')).toContain('Taylor leading term')
    }

    expect(exponential.kind).toBe('success')
    if (exponential.kind === 'success') {
      expect(exponential.value).toBeCloseTo(1 / 6, 8)
      expect(exponential.exactLatex).toBe('\\frac{1}{6}')
      expect(exponential.detailSections?.[0]?.lines.join(' ')).toContain('first nonzero derivative order 3')
    }
  })

  it('uses squeeze and oscillation proofs for bounded oscillation patterns', () => {
    const squeeze = resolveFiniteLimitRule(ce.parse('x\\sin(1/x)').json, 0, 'x')
    const secondOrder = resolveFiniteLimitRule(ce.parse('x^2\\cos(1/x)').json, 0, 'x')
    const oscillation = resolveFiniteSqueezeOscillationLimit(ce.parse('\\sin(1/x)').json, 0, 'x')

    expect(squeeze.kind).toBe('success')
    if (squeeze.kind === 'success') {
      expect(squeeze.value).toBe(0)
      expect(squeeze.detailSections?.[0]?.lines.join(' ')).toContain('squeeze theorem')
    }

    expect(secondOrder.kind).toBe('success')
    if (secondOrder.kind === 'success') {
      expect(secondOrder.value).toBe(0)
    }

    expect(oscillation?.kind).toBe('failure')
    if (oscillation?.kind === 'failure') {
      expect(oscillation.error).toContain('oscillates')
      expect(oscillation.detailSections?.[0]?.title).toBe('Why This Limit Fails')
    }
  })

  it('resolves supported one-sided log boundary behavior', () => {
    const right = resolveFiniteLimitRule(ce.parse('\\ln(x)').json, 0, 'x', 'right')
    const left = resolveFiniteLimitRule(ce.parse('\\ln(x)').json, 0, 'x', 'left')

    expect(right.kind).toBe('success')
    if (right.kind === 'success') {
      expect(right.value).toBe('negInfinity')
      expect(right.origin).toBe('rule-based-symbolic')
    }
    expect(left.kind).toBe('unhandled')
  })
})
