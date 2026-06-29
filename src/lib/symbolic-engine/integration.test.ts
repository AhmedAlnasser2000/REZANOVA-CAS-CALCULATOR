import { ComputeEngine } from '@cortex-js/compute-engine'
import { describe, expect, it } from 'vitest'
import { resolveSymbolicIntegralFromLatex } from './integration'
import { classifyIntegrandForm } from './integration/classifier'
import { normalizeIntegralLatexInput } from './integration/rules'

const ce = new ComputeEngine()

function classifyLatex(latex: string) {
  return classifyIntegrandForm(ce.parse(normalizeIntegralLatexInput(latex)).json)
}

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>
type IntegrationError = Extract<IntegrationResult, { kind: 'error' }>

function expectIntegrationSuccess(result: IntegrationResult): IntegrationSuccess {
  expect(result.kind).toBe('success')
  if (result.kind !== 'success') {
    throw new Error('Expected integration success')
  }
  return result
}

function expectIntegrationError(result: IntegrationResult): IntegrationError {
  expect(result.kind).toBe('error')
  if (result.kind !== 'error') {
    throw new Error('Expected integration error')
  }
  return result
}

describe('symbolic-engine integration', () => {
  it('classifies integrand forms into internal route plans', () => {
    const polynomial = classifyLatex('x^2')
    const inverseTrig = classifyLatex('\\frac{1}{1+x^2}')
    const scaledInverseTrig = classifyLatex('\\frac{3}{9+(2x+1)^2}')
    const completedSquareInverseTrig = classifyLatex('\\frac{1}{x^2+2x+3}')
    const derivativeRatio = classifyLatex('\\frac{2x+3}{x^2+3x+2}')
    const partialFractions = classifyLatex('\\frac{1}{x^2-1}')
    const substitution = classifyLatex('2x\\cos(x^2)')
    const byParts = classifyLatex('xe^x')
    const cot = classifyLatex('\\cot(2x+3)')
    const numericExponential = classifyLatex('2^{2x+3}')
    const radical = classifyLatex('\\sqrt{1+x^4}')
    const absoluteValue = classifyLatex('|x|\\cos(x^2)')

    expect(polynomial.primaryForm).toBe('polynomial')
    expect(polynomial.routes).toEqual(['direct-rule', 'affine-linear'])

    expect(inverseTrig.primaryForm).toBe('inverse-trig-candidate')
    expect(inverseTrig.forms).toEqual(expect.arrayContaining(['inverse-trig-candidate', 'rational']))
    expect(inverseTrig.routes.slice(0, 3)).toEqual([
      'inverse-trig',
      'derivative-ratio',
      'partial-fractions',
    ])
    expect(scaledInverseTrig.routes[0]).toBe('inverse-trig')
    expect(completedSquareInverseTrig.routes[0]).toBe('inverse-trig')

    expect(derivativeRatio.primaryForm).toBe('rational')
    expect(derivativeRatio.routes.slice(0, 2)).toEqual(['derivative-ratio', 'partial-fractions'])

    expect(partialFractions.primaryForm).toBe('rational')
    expect(partialFractions.routes.slice(0, 2)).toEqual(['derivative-ratio', 'partial-fractions'])

    expect(substitution.primaryForm).toBe('product')
    expect(substitution.forms).toEqual(expect.arrayContaining(['product', 'composition', 'transcendental']))
    expect(substitution.features).toEqual(expect.arrayContaining(['trig']))
    expect(substitution.routes.slice(0, 3)).toEqual([
      'u-substitution',
      'direct-rule',
      'integration-by-parts',
    ])

    expect(byParts.primaryForm).toBe('product')
    expect(byParts.features).toEqual(expect.arrayContaining(['exponential']))
    expect(byParts.routes.slice(0, 3)).toEqual([
      'u-substitution',
      'direct-rule',
      'integration-by-parts',
    ])

    expect(cot.forms).toContain('transcendental')
    expect(cot.features).toContain('trig')
    expect(cot.routes.slice(0, 2)).toEqual(['u-substitution', 'direct-rule'])

    expect(numericExponential.forms).toContain('transcendental')
    expect(numericExponential.features).toContain('exponential')
    expect(numericExponential.routes.slice(0, 2)).toEqual(['u-substitution', 'direct-rule'])

    expect(radical.primaryForm).toBe('algebraic-radical')
    expect(radical.forms).toEqual(expect.arrayContaining(['algebraic-radical', 'composition']))
    expect(radical.routes.slice(0, 2)).toEqual(['u-substitution', 'direct-rule'])

    expect(absoluteValue.primaryForm).toBe('branch-sensitive')
    expect(absoluteValue.features).toEqual(expect.arrayContaining(['absolute-value']))
    expect(absoluteValue.routes).toEqual([])
    expect(absoluteValue.allowCompatibilityFallback).toBe(false)
  })

  it('classifies existing supported strategies without changing outputs', () => {
    const direct = resolveSymbolicIntegralFromLatex('x^2')
    const inverseTrig = resolveSymbolicIntegralFromLatex('\\frac{1}{1+x^2}')
    const derivativeRatio = resolveSymbolicIntegralFromLatex('\\frac{2x+3}{x^2+3x+2}')
    const substitution = resolveSymbolicIntegralFromLatex('2x\\cos(x^2)')
    const byParts = resolveSymbolicIntegralFromLatex('xe^x')

    expect(direct.kind).toBe('success')
    if (direct.kind === 'success') {
      expect(direct.strategy).toBe('direct-rule')
      expect(direct.candidate.method).toBe('direct-rule')
      expect(direct.candidate.requiredPrerequisites).toContain('derivative-backcheck')
      expect(direct.candidate.blockedPrerequisites).toEqual([])
      expect(direct.exactLatex).toContain('x^{3}')
      expect(direct.verification.status).toBe('verified-exact')
      expect(direct.candidate.verificationStatus).toBe('verified-exact')
    }

    expect(inverseTrig.kind).toBe('success')
    if (inverseTrig.kind === 'success') {
      expect(inverseTrig.strategy).toBe('inverse-trig')
      expect(inverseTrig.candidate.method).toBe('inverse-trig')
      expect(inverseTrig.candidate.domainHazards).toContain('denominator-nonzero')
      expect(inverseTrig.exactLatex).toContain('\\arctan')
    }

    expect(derivativeRatio.kind).toBe('success')
    if (derivativeRatio.kind === 'success') {
      expect(derivativeRatio.strategy).toBe('derivative-ratio')
      expect(derivativeRatio.candidate.requiredPrerequisites).toContain('polynomial-core')
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
      expect(byParts.candidate.requiredPrerequisites).toContain('polynomial-core')
      expect(byParts.exactLatex).toContain('e^{x}')
    }
  })

  it('rejects equation-like relation roots before integration routing', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex('a x+b y=e'))
    expect(result.error).toBe(
      'Calculus integrals expect an expression f(x), not an equation or relation.',
    )
    expect(result.candidate.method).toBe('unsupported')
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family')

    const expression = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('x^2'))
    expect(expression.strategy).toBe('direct-rule')
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

  it('handles exact-rational affine derivative-present trig products through substitution', () => {
    const cases = [
      { latex: '\\sec(2x+3)\\tan(2x+3)', contains: '\\sec' },
      { latex: '\\tan(2x+3)\\sec(2x+3)', contains: '\\sec' },
      { latex: '5\\sec(2x+3)\\tan(2x+3)', contains: '\\frac{5' },
      { latex: '\\csc(2x+3)\\cot(2x+3)', contains: '\\csc' },
      { latex: '\\sin(2x+1)\\cos(2x+1)', contains: '\\sin' },
    ]

    for (const { latex, contains } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
      expect(result.strategy, latex).toBe('u-substitution')
      expect(result.verification.status, latex).toBe('verified-exact')
      expect(result.exactLatex, latex).toContain(contains)
    }

    const extraFactor = expectIntegrationError(resolveSymbolicIntegralFromLatex('x\\sec(x)\\tan(x)'))
    expect(extraFactor.candidate.method).not.toBe('u-substitution')
  })

  it('handles bounded exact-rational affine sin/cos parity powers through direct rules', () => {
    const cases = [
      { latex: '\\sin^{5}(x)', contains: ['\\cos', '5x'] },
      { latex: '\\sin^{6}(2x+1)', contains: ['2x+1', '6\\left(2x+1\\right)'] },
      { latex: '\\cos^{7}(x)', contains: ['\\sin', '7x'] },
      { latex: '\\cos^{12}(2x+3)', contains: ['2x+3', '12\\left(2x+3\\right)'] },
    ]

    for (const { latex, contains } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
      expect(result.strategy, latex).toBe('direct-rule')
      expect(result.candidate.method, latex).toBe('direct-rule')
      expect(result.verification.status, latex).toBe('verified-exact')
      for (const expected of contains) {
        expect(result.exactLatex, latex).toContain(expected)
      }
    }

    const overCap = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sin^{13}(x)'))
    expect(overCap.candidate.controlledFailureClass).toBe('unsupported-family')
  })

  it('handles bounded exact-rational affine tan/sec and cot/csc powers through direct rules', () => {
    const cases = [
      { latex: '\\tan^{3}(x)\\sec^{2}(x)', contains: '\\tan', strategies: ['u-substitution', 'direct-rule'] },
      { latex: '\\tan^{4}(2x+1)', contains: '2x+1', strategies: ['direct-rule'] },
      { latex: '\\sec^{4}(x)', contains: '\\tan', strategies: ['direct-rule'] },
      { latex: '\\cot^{3}(x)\\csc^{2}(x)', contains: '\\cot', strategies: ['u-substitution', 'direct-rule'] },
      { latex: '\\csc^{6}(2x+1)', contains: '\\cot', strategies: ['direct-rule'] },
    ]

    for (const { latex, contains, strategies } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
      expect(strategies, latex).toContain(result.strategy)
      expect(strategies, latex).toContain(result.candidate.method)
      expect(result.verification.status, latex).toBe('verified-exact')
      expect(result.exactLatex, latex).toContain(contains)
    }

    const overCap = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\tan^{7}(x)'))
    expect(overCap.candidate.controlledFailureClass).toBe('unsupported-family')

    const nonAffine = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\tan^{3}(x^2)\\sec^{2}(x^2)'))
    expect(nonAffine.candidate.method).not.toBe('direct-rule')
  })

  it('handles bounded Rubi Section 1 polynomial expansion through direct rules', () => {
    const cases = [
      { latex: '(x^2+1)^2', contains: ['x^{5}', 'x^{3}'] },
      { latex: '(x+1)(x+2)', contains: ['x^{3}', 'x^{2}'] },
      { latex: '(x+1)^2(x+2)', contains: ['x^{4}', 'x^{3}'] },
      { latex: '(x^2+x+1)^2', contains: ['x^{5}', 'x^{4}'] },
      { latex: '(x^2+x+1)^4', contains: ['x^{9}', 'x^{8}'] },
      { latex: 'x(1+x^3)^5', contains: ['x^{17}', 'x^{14}'] },
      { latex: '(x^3+1)^4', contains: ['x^{13}', 'x^{10}'] },
      { latex: 'x^2(1+x^2)^3', contains: ['x^{9}', 'x^{7}'] },
    ]

    for (const { latex, contains } of cases) {
      const result = resolveSymbolicIntegralFromLatex(latex)
      expect(result.kind, latex).toBe('success')
      if (result.kind === 'success') {
        expect(result.strategy, latex).toBe('direct-rule')
        expect(result.candidate.method, latex).toBe('direct-rule')
        expect(result.verification.status, latex).toBe('verified-exact')
        for (const expected of contains) {
          expect(result.exactLatex, latex).toContain(expected)
        }
      }
    }

    const substitutionOverlap = resolveSymbolicIntegralFromLatex('x(1+x^2)^3')
    expect(substitutionOverlap.kind).toBe('success')
    if (substitutionOverlap.kind === 'success') {
      expect(substitutionOverlap.strategy).toBe('u-substitution')
      expect(substitutionOverlap.verification.status).toBe('verified-exact')
    }
  })

  it('handles exact-rational affine powers through direct rules', () => {
    const cases = [
      { latex: '(2x+3)^5', contains: ['2x+3', '^{6}'] },
      { latex: '(\\frac{1}{2}x+3)^5', contains: ['\\frac{x}{2}+3', '^{6}'] },
      { latex: '\\frac{1}{2x+3}', contains: ['\\ln', '2x+3'] },
      { latex: '\\frac{1}{(2x+3)^3}', contains: ['2x+3', '^{2}'] },
      { latex: '(\\frac{2}{3}x-1)^{-2}', contains: ['\\frac{2x}{3}-1'] },
    ]

    for (const { latex, contains } of cases) {
      const result = resolveSymbolicIntegralFromLatex(latex)
      expect(result.kind, latex).toBe('success')
      if (result.kind === 'success') {
        expect(['direct-rule', 'u-substitution', 'derivative-ratio', 'partial-fractions'], latex)
          .toContain(result.strategy)
        expect(result.verification.status, latex).toBe('verified-exact')
        for (const expected of contains) {
          expect(result.exactLatex, latex).toContain(expected)
        }
      }
    }
  })

  it('handles target-free symbolic affine direct primitives with visible facts', () => {
    const cases = [
      { latex: '(a x+b)^5', contains: ['ax+b', '^{6}'], strategy: 'direct-rule' },
      { latex: '\\frac{1}{a x+b}', contains: ['\\ln', 'ax+b'], strategy: 'direct-rule' },
      { latex: '\\sin(a x+b)', contains: ['\\cos', 'ax+b'], strategy: 'direct-rule' },
      { latex: '\\cos(a x+b)', contains: ['\\sin', 'ax+b'], strategy: 'direct-rule' },
      { latex: '\\tan(a x+b)', contains: ['\\ln', '\\cos'], strategy: 'direct-rule' },
      { latex: 'e^{a x+b}', contains: ['e^{ax+b}'], strategy: 'direct-rule' },
      { latex: '\\sec(a x+b)^2', contains: ['\\tan', 'ax+b'], strategy: 'direct-rule' },
      { latex: '\\csc(a x+b)^2', contains: ['\\cot', 'ax+b'], strategy: 'direct-rule' },
    ] as const

    for (const { latex, contains, strategy } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
      expect(result.strategy, latex).toBe(strategy)
      expect(result.verification.status, latex).toBe('verified-exact')
      expect(result.exactSupplementLatex?.join(' '), latex).toContain('a\\ne0')
      for (const expected of contains) {
        expect(result.exactLatex, latex).toContain(expected)
      }
    }
  })

  it('handles positive symbolic-base affine exponentials with visible facts', () => {
    const direct = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('c^{a x+b}'))
    expect(direct.strategy).toBe('direct-rule')
    expect(direct.exactLatex).toContain('c^{ax+b}')
    expect(direct.exactSupplementLatex?.join(' ')).toContain('c>0')
    expect(direct.exactSupplementLatex?.join(' ')).toContain('c-1\\ne0')
    expect(direct.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const byParts = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('x\\cdot a^x'))
    expect(byParts.strategy).toBe('integration-by-parts')
    expect(byParts.exactLatex).toContain('a^{x}')
    expect(byParts.exactLatex).toContain('\\ln\\left(a\\right)')
    expect(byParts.exactSupplementLatex?.join(' ')).toContain('a>0')
  })

  it('handles exact-rational derivative-present binomial substitution', () => {
    const cases = [
      { latex: 'x^5(1+x^6)^2', contains: ['x^6+1', '^{3}'] },
      { latex: '\\frac{7}{2}x^5(3+\\frac{2}{3}x^6)^2', contains: ['\\frac{7}{24}', '\\frac{2x^6}{3}+3'] },
      { latex: '\\frac{x^5}{(1+x^6)^2}', contains: ['x^6+1', '^{-1}'] },
      { latex: 'x^5(1+x^6)^{-1}', contains: ['\\ln', 'x^6+1'] },
      { latex: 'x^{-3}(1+x^{-2})^2', contains: ['\\frac{1}{x^2}+1', '^{3}'] },
      { latex: '\\frac{x^{-3}}{1+x^{-2}}', contains: ['\\ln', '\\frac{1}{x^2}+1'] },
      { latex: '2x^{-3}(3+\\frac{1}{2}x^{-2})^{-2}', contains: ['\\frac{1}{', '+3'] },
      { latex: 'x^{-2}(1+x^{-1})^{-1}', contains: ['\\ln', '\\frac{1}{x}+1'] },
    ]

    for (const { latex, contains } of cases) {
      const result = resolveSymbolicIntegralFromLatex(latex)
      expect(result.kind, latex).toBe('success')
      if (result.kind === 'success') {
        expect(result.strategy, latex).toBe('u-substitution')
        expect(result.candidate.method, latex).toBe('u-substitution')
        expect(result.verification.status, latex).toBe('verified-exact')
        for (const expected of contains) {
          expect(result.exactLatex, latex).toContain(expected)
        }
      }
    }
  })

  it('handles target-free symbolic by-parts and rational Tier I catchup cases', () => {
    const trig = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('x^2\\sin(a x+b)'))
    expect(trig.strategy).toBe('integration-by-parts')
    expect(trig.exactLatex).toContain('\\cos\\left(ax+b\\right)')
    expect(trig.exactLatex).not.toContain('0.')
    expect(trig.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const exponential = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('x^3e^{a x+b}'))
    expect(exponential.strategy).toBe('integration-by-parts')
    expect(exponential.exactLatex).toContain('e^{ax+b}')
    expect(exponential.exactLatex).toContain('a^{4}')

    const log = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('x\\ln(a x+b)'))
    expect(log.strategy).toBe('integration-by-parts')
    expect(log.exactSupplementLatex?.join(' ')).toContain('ax+b>0')

    const symbolicBinomial = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('a x^{n-1}(b+c x^n)^p'))
    expect(symbolicBinomial.strategy).toBe('u-substitution')
    expect(symbolicBinomial.exactSupplementLatex?.join(' ')).toContain('cn\\ne0')
    expect(symbolicBinomial.exactSupplementLatex?.join(' ')).toContain('p+1\\ne0')

    const symbolicReciprocalBinomial = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(
      '\\frac{a x^{n-1}}{b+c x^n}'))
    expect(symbolicReciprocalBinomial.strategy).toBe('u-substitution'); expect(symbolicReciprocalBinomial.exactLatex).toContain('\\ln')
    expect(symbolicReciprocalBinomial.exactSupplementLatex?.join(' ')).toContain('cn\\ne0')

    const repeatedLinear = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A x+B}{(a x+b)^2(c x+d)}'),
    )
    expect(repeatedLinear.strategy).toBe('partial-fractions')
    expect(repeatedLinear.exactSupplementLatex?.join(' ')).toContain('ad-bc\\ne0')

    const quadratic = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{a x^2+b x+c}'))
    expect(quadratic.strategy).toBe('partial-fractions')
    expect(quadratic.exactLatex).toContain('\\begin{cases}')
    expect(quadratic.exactLatex).toContain('\\arctan')
    expect(quadratic.exactLatex).toContain('4ac-b^{2}=0')
    expect(quadratic.exactLatex).toContain('4ac-b^{2}<0')
    expect(quadratic.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const repeatedSymbolicQuadratic = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A x+B}{(a x^2+b x+c)^2}'),
    )
    expect(repeatedSymbolicQuadratic.strategy).toBe('partial-fractions')
    expect(repeatedSymbolicQuadratic.exactLatex).toContain('\\arctan')
    expect(repeatedSymbolicQuadratic.exactSupplementLatex?.join(' ')).toContain('4ac-b^{2}>0')

  })

  it('adopts guarded Risch-Norman exp and sin/cos ansatz results after Tier I misses', () => {
    const exp = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x^2+d x+g)e^{a x+b}'),
    )
    expect(exp.origin).toBe('rule-based-symbolic')
    expect(exp.strategy).toBe('integration-by-parts')
    expect(exp.candidate.method).toBe('integration-by-parts')
    expect(exp.verification.status).toBe('verified-exact')
    expect(exp.verification.reason).toContain('Risch-Norman exponential ansatz')
    expect(exp.exactLatex).toContain('e^{ax+b}')
    expect(exp.exactLatex).not.toContain('0.')
    expect(exp.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const positiveBase = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x+d)q^{a x+b}'),
    )
    expect(positiveBase.strategy).toBe('integration-by-parts')
    expect(positiveBase.verification.status).toBe('verified-exact')
    expect(positiveBase.verification.reason).toContain('Risch-Norman exponential ansatz')
    expect(positiveBase.exactLatex).toContain('q^{ax+b}')
    expect(positiveBase.exactSupplementLatex?.join(' ')).toContain('q>0')
    expect(positiveBase.exactSupplementLatex?.join(' ')).toContain('q-1\\ne0')
    expect(positiveBase.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const sin = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x^2+d)\\sin(a x+b)'),
    )
    expect(sin.strategy).toBe('integration-by-parts')
    expect(sin.verification.status).toBe('verified-exact')
    expect(sin.verification.reason).toContain('Risch-Norman sine-cosine ansatz')
    expect(sin.exactLatex).toContain('\\sin(ax+b)')
    expect(sin.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const cos = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x^2+d x+g)\\cos(a x+b)'),
    )
    expect(cos.strategy).toBe('integration-by-parts')
    expect(cos.verification.status).toBe('verified-exact')
    expect(cos.verification.reason).toContain('Risch-Norman sine-cosine ansatz')
    expect(cos.exactLatex).toContain('\\cos(ax+b)')
    expect(cos.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const naturalLog = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('x^2\\ln(a x+b)'),
    )
    expect(naturalLog.strategy).toBe('integration-by-parts')
    expect(naturalLog.verification.status).toBe('verified-exact')
    expect(naturalLog.verification.reason).toContain('Risch-Norman affine-log correction')
    expect(naturalLog.exactLatex).toContain('\\ln(ax+b)')
    expect(naturalLog.exactLatex).not.toContain('0.')
    expect(naturalLog.exactSupplementLatex?.join(' ')).toContain('a\\ne0')
    expect(naturalLog.exactSupplementLatex?.join(' ')).toContain('ax+b>0')

    const symbolicLog = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x^2+d x+g)\\log(a x+b)'),
    )
    expect(symbolicLog.strategy).toBe('integration-by-parts')
    expect(symbolicLog.verification.reason).toContain('Risch-Norman affine-log correction')
    expect(symbolicLog.exactLatex).toContain('\\ln(10)')
    expect(symbolicLog.exactSupplementLatex?.join(' ')).toContain('ax+b>0')
  })

  it('adopts guarded Risch-Norman linear combinations only when every term resolves', () => {
    const homogeneous = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('(c x^2+d x+g)e^{a x+b}+x^2\\sin(a x+b)'),
    )
    expect(homogeneous.strategy).toBe('integration-by-parts')
    expect(homogeneous.verification.status).toBe('verified-exact')
    expect(homogeneous.verification.reason).toContain('Risch-Norman linear-combination')
    expect(homogeneous.exactLatex).toContain('e^{ax+b}')
    expect(homogeneous.exactLatex).toContain('\\sin')
    expect(homogeneous.exactSupplementLatex?.join(' ')).toContain('a\\ne0')

    const mixed = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('x^2+(c x+d)e^{a x+b}'),
    )
    expect(mixed.strategy).toBe('integration-by-parts')
    expect(mixed.exactLatex).toContain('x^{3}')
    expect(mixed.exactLatex).toContain('e^{ax+b}')

    const unsupported = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('x^2+\\sin(x^2)'),
    )
    expect(unsupported.candidate.method).toBe('unsupported')
  })

  it('handles target-free polynomial direct integration in arbitrary selected variables', () => {
    const integrateA = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A x+B}{(a x+b)^2(c x+d)}', 'A'),
    )
    expect(integrateA.strategy).toBe('direct-rule')
    expect(integrateA.verification.status).toBe('verified-exact')
    expect(integrateA.exactLatex).toContain('A^2')
    expect(integrateA.exactLatex).toContain('B')
    expect(integrateA.exactSupplementLatex?.join(' ')).toContain('(cx+d)(ax+b)^2\\ne0')

    const integrateB = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A x+B}{(a x+b)^2(c x+d)}', 'B'),
    )
    expect(integrateB.strategy).toBe('direct-rule')
    expect(integrateB.verification.status).toBe('verified-exact')
    expect(integrateB.exactLatex).toContain('B^2')
    expect(integrateB.exactLatex).toContain('ABx')

    const polynomialOverTargetFree = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A^3+A}{m x+n}', 'A'),
    )
    expect(polynomialOverTargetFree.strategy).toBe('direct-rule')
    expect(polynomialOverTargetFree.exactLatex).toContain('A^4')
    expect(polynomialOverTargetFree.exactLatex).toContain('A^2')
    expect(polynomialOverTargetFree.exactSupplementLatex?.join(' ')).toContain('mx+n\\ne0')

    const targetDependentDenominator = expectIntegrationSuccess(
      resolveSymbolicIntegralFromLatex('\\frac{A}{A+x}', 'A'),
    )
    expect(targetDependentDenominator.strategy).toBe('partial-fractions')
  })

  it('keeps derivative-present binomial substitution bounded', () => {
    const branchSensitive = resolveSymbolicIntegralFromLatex('|x|x^5(1+x^6)^2')
    const missingDerivative = resolveSymbolicIntegralFromLatex('\\frac{x^4}{(1+x^6)^2}')
    const missingReciprocalDerivative = resolveSymbolicIntegralFromLatex('x^{-2}(1+x^{-2})^2')

    expect(branchSensitive.kind).toBe('error')
    if (branchSensitive.kind === 'error') {
      expect(branchSensitive.candidate.blockedPrerequisites).toContain('branch-analysis')
    }

    expect(missingDerivative.kind).toBe('error')
    if (missingDerivative.kind === 'error') {
      expect(missingDerivative.candidate.controlledFailureClass).toBe('blocked-polynomial-prerequisite')
    }

    if (missingReciprocalDerivative.kind === 'success') {
      expect(missingReciprocalDerivative.strategy).not.toBe('u-substitution')
    } else {
      expect(missingReciprocalDerivative.candidate.controlledFailureClass).toBeDefined()
    }
  })

  it('keeps expanded-direct algebraic widening bounded', () => {
    const radical = resolveSymbolicIntegralFromLatex('\\sqrt{x^4+1}')
    const negativePower = resolveSymbolicIntegralFromLatex('(x^2+1)^{-2}')
    const branchSensitive = resolveSymbolicIntegralFromLatex('|x|(x+1)^2')
    const overLimit = resolveSymbolicIntegralFromLatex('(x^2+x+1)^7')

    expect(radical.kind).toBe('error')
    if (radical.kind === 'error') {
      expect(radical.candidate.domainHazards).toContain('root-radicand-nonnegative')
    }

    if (negativePower.kind === 'success') {
      expect(negativePower.strategy).not.toBe('direct-rule')
    } else {
      expect(negativePower.candidate.controlledFailureClass).toBeDefined()
    }

    expect(branchSensitive.kind).toBe('error')
    if (branchSensitive.kind === 'error') {
      expect(branchSensitive.candidate.blockedPrerequisites).toContain('branch-analysis')
    }

    expect(overLimit.kind).toBe('error')
    if (overLimit.kind === 'error') {
      expect(overLimit.error).toContain('could not be determined symbolically')
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
    const affineExpHighDegree = resolveSymbolicIntegralFromLatex('x^5e^{2x+3}')
    const trigHighDegree = resolveSymbolicIntegralFromLatex('x^5\\cos(x)')
    const affineSinHighDegree = resolveSymbolicIntegralFromLatex('x^4\\sin(2x+1)')
    const affineCosHighDegree = resolveSymbolicIntegralFromLatex('x^4\\cos(3x-2)')
    const logCase = resolveSymbolicIntegralFromLatex('x\\ln(x)')
    const affineLogCase = resolveSymbolicIntegralFromLatex('x\\ln(2x+3)')
    const affineBaseTenLogCase = resolveSymbolicIntegralFromLatex('x\\log(2x+3)')
    const numericBaseExpCase = resolveSymbolicIntegralFromLatex('x\\cdot 2^x')
    const numericBaseExpQuadratic = resolveSymbolicIntegralFromLatex('x^2\\cdot 2^x')
    const numericBaseExpCubic = resolveSymbolicIntegralFromLatex('x^3\\cdot 2^{2x+1}')

    expect(expCase.kind).toBe('success')
    expect(trigCase.kind).toBe('success')
    expect(expQuadratic.kind).toBe('success')
    expect(trigQuadratic.kind).toBe('success')
    expect(expHighDegree.kind).toBe('success')
    expect(affineExpHighDegree.kind).toBe('success')
    expect(trigHighDegree.kind).toBe('success')
    expect(affineSinHighDegree.kind).toBe('success')
    expect(affineCosHighDegree.kind).toBe('success')
    expect(logCase.kind).toBe('success')
    expect(affineLogCase.kind).toBe('success')
    expect(affineBaseTenLogCase.kind).toBe('success')
    expect(numericBaseExpCase.kind).toBe('success')
    expect(numericBaseExpQuadratic.kind).toBe('success')
    expect(numericBaseExpCubic.kind).toBe('success')

    for (const result of [
      expHighDegree,
      affineExpHighDegree,
      trigHighDegree,
      affineSinHighDegree,
      affineCosHighDegree,
    ]) {
      if (result.kind === 'success') {
        expect(result.strategy).toBe('integration-by-parts')
        expect(result.verification.status).toMatch(/verified-/)
      }
    }

    if (affineLogCase.kind === 'success') {
      expect(affineLogCase.strategy).toBe('integration-by-parts')
      expect(affineLogCase.verification.status).toBe('verified-exact')
      expect(affineLogCase.exactLatex).toContain('\\ln')
    }

    if (affineBaseTenLogCase.kind === 'success') {
      expect(affineBaseTenLogCase.strategy).toBe('integration-by-parts')
      expect(affineBaseTenLogCase.verification.status).toMatch(/verified-/)
      expect(affineBaseTenLogCase.exactLatex).toContain('\\ln(10)')
    }

    for (const result of [numericBaseExpCase, numericBaseExpQuadratic, numericBaseExpCubic]) {
      if (result.kind === 'success') {
        expect(result.strategy).toBe('integration-by-parts')
        expect(result.verification.status).toBe('verified-exact')
        expect(result.exactLatex).toContain('\\ln')
      }
    }
  })

  it('feeds expanded polynomial factors into integration-by-parts', () => {
    const cases = [
      '(x+1)^2e^x',
      '(x^2+1)^2e^x',
      '(x+1)^2\\sin(x)',
      '(x+1)^2\\cos(2x+1)',
      '(x+1)^2\\ln(x)',
      '(x^2+1)^2\\ln(x)',
      '(x+1)^2\\ln(2x+3)',
      '(x+1)^2(\\frac{1}{2})^{3x-1}',
    ]

    for (const latex of cases) {
      const result = resolveSymbolicIntegralFromLatex(latex)
      expect(result.kind, latex).toBe('success')
      if (result.kind === 'success') {
        expect(result.strategy, latex).toBe('integration-by-parts')
        expect(result.candidate.method, latex).toBe('integration-by-parts')
        expect(result.verification.status, latex).toBe('verified-exact')
      }
    }
  })

  it.each([
    ['zero base', 'x\\cdot 0^x'],
    ['negative base', 'x\\cdot (-2)^x'],
  ])('keeps unsupported numeric-base by-parts stop: %s', (_label, latex) => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex))
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family')
  })

  it('keeps expanded integration-by-parts feeder bounded', () => {
    const branchSensitive = resolveSymbolicIntegralFromLatex('|x|(x+1)^2e^x')
    const overDegree = resolveSymbolicIntegralFromLatex('(x+1)^8e^x')
    const radical = resolveSymbolicIntegralFromLatex('\\sqrt{x^2+1}e^x')

    expect(branchSensitive.kind).toBe('error')
    if (branchSensitive.kind === 'error') {
      expect(branchSensitive.candidate.blockedPrerequisites).toContain('branch-analysis')
    }

    expect(overDegree.kind).toBe('error')
    if (overDegree.kind === 'error') {
      expect(overDegree.error).toContain('could not be determined symbolically')
    }

    expect(radical.kind).toBe('error')
    if (radical.kind === 'error') {
      expect(radical.candidate.domainHazards).toContain('root-radicand-nonnegative')
    }
  })

  it('handles supported inverse-trig primitives', () => {
    const cases = [
      ['atan base', '\\frac{1}{1+x^2}', '\\arctan'],
      ['asin base', '\\frac{1}{\\sqrt{1-x^2}}', '\\arcsin'],
      ['atan scaled square', '\\frac{1}{9+x^2}', '\\arctan'],
      ['asin scaled square', '\\frac{1}{\\sqrt{4-x^2}}', '\\arcsin'],
      ['atan affine scaled numerator', '\\frac{3}{9+(2x+1)^2}', '\\arctan'],
      ['atan completed square', '\\frac{1}{x^2+2x+3}', '\\arctan'],
      ['asin affine scaled numerator', '\\frac{2}{\\sqrt{4-(2x+1)^2}}', '\\arcsin'],
      ['asin rational square constant', '\\frac{1}{\\sqrt{\\frac{1}{4}-(2x+1)^2}}', '\\arcsin'],
    ] as const

    for (const [, latex, inverseTrig] of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
      expect(result.strategy).toBe('inverse-trig')
      expect(result.exactLatex).toContain(inverseTrig)
      expect(result.verification.status).toBe('verified-exact')
    }
  })

  it('keeps arcsec-style reciprocal-root forms outside Tier I without branch analysis', () => {
    const result = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{1}{(2x+1)\\sqrt{(2x+1)^2-4}}'),
    )
    expect(result.candidate.method).not.toBe('inverse-trig')
    expect(result.candidate.domainHazards).toContain('root-radicand-nonnegative')
  })

  it('handles the three exact-rational affine trig-substitution radical families', () => {
    const minus = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\sqrt{4-x^2}'))
    expect(minus.strategy).toBe('u-substitution')
    expect(minus.verification.status).toBe('verified-exact')
    expect(minus.exactLatex).toContain('\\arcsin')
    expect(minus.exactSupplementLatex?.join(' ')).toContain('4-x^{2}\\ge0')

    const shiftedMinus = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\sqrt{9-(2x+1)^2}'))
    expect(shiftedMinus.strategy).toBe('u-substitution')
    expect(shiftedMinus.exactLatex).toContain('2x+1')
    expect(shiftedMinus.exactLatex).toContain('\\arcsin')

    const plus = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\sqrt{4+x^2}'))
    expect(plus.strategy).toBe('u-substitution')
    expect(plus.verification.status).toBe('verified-exact')
    expect(plus.exactLatex).toContain('\\ln')
    expect(plus.exactLatex).toContain('\\sqrt{4+x^{2}}')

    const outside = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\sqrt{(2x+1)^2-9}'))
    expect(outside.strategy).toBe('u-substitution')
    expect(outside.verification.status).toBe('verified-exact')
    expect(outside.exactLatex).toContain('\\ln')
    expect(outside.exactSupplementLatex?.join(' ')).toContain('\\left(2x+1\\right)^{2}-9\\ge0')
  })

  it.each([
    ['sin affine', '\\sin(2x+3)', ['u-substitution', 'direct-rule']],
    ['cos affine', '\\cos(2x+3)', ['u-substitution', 'direct-rule']],
    ['tan affine', '\\tan(2x+3)', ['direct-rule']],
    ['cot affine', '\\cot(2x+3)', ['direct-rule']],
    ['sin squared affine', '\\sin(x)^2', ['direct-rule']],
    ['cos squared affine', '\\cos(2x+3)^2', ['direct-rule']],
    ['tan squared affine', '\\tan(x)^2', ['direct-rule']],
    ['cot squared affine', '\\cot(2x+3)^2', ['direct-rule']],
    ['sec squared affine', '\\sec(2x+3)^2', ['direct-rule']],
    ['csc squared affine', '\\csc(2x+3)^2', ['direct-rule']],
    ['sec squared rational affine', '\\sec(\\frac{1}{2}x+1)^2', ['direct-rule']],
  ])('handles exact-rational affine trig primitive: %s', (_label, latex, strategies) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(strategies).toContain(result.strategy)
    expect(result.verification.status).toBe('verified-exact')
  })

  it('keeps over-cap trig powers outside the bounded parity reduction slice', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sin^{13}(x)'))
    expect(result.candidate.method).not.toBe('direct-rule')
  })

  it.each([
    ['sin cos affine', '\\sin(2x)\\cos(3x)'],
    ['scaled sin cos affine', '3\\sin(2x)\\cos(5x)'],
    ['reordered cos sin affine', '\\cos(3x)\\sin(2x)'],
    ['sin sin affine', '\\sin(2x+1)\\sin(3x-2)'],
    ['cos cos affine', '\\cos(2x)\\cos(3x)'],
  ])('handles exact-rational affine trig product-to-sum: %s', (_label, latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(result.strategy).toBe('direct-rule')
    expect(result.verification.status).toBe('verified-exact')
  })

  it('keeps broader trig products outside the product-to-sum slice', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex('\\sin(x)\\cos(x)\\tan(x)'))
    expect(result.candidate.method).not.toBe('direct-rule')
  })

  it('keeps symbolic scalar trig products outside the product-to-sum slice', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex('a\\sin(x)\\cos(2x)'))
    expect(result.candidate.method).not.toBe('direct-rule')
  })

  it.each([
    ['e affine rational slope', '\\exponentialE^{\\frac{1}{2}x+1}'],
    ['integer numeric base', '2^{2x+3}'],
    ['rational numeric base', '(\\frac{1}{2})^{3x-1}'],
  ])('handles exact-rational affine exponential primitive: %s', (_label, latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(['u-substitution', 'direct-rule']).toContain(result.strategy)
    expect(result.verification.status).toBe('verified-exact')
  })

  it.each([
    ['zero base', '0^x'],
    ['negative base', '(-2)^x'],
  ])('keeps unsupported numeric-base exponential stop: %s', (_label, latex) => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex))
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family')
  })

  it('fails cleanly on unsupported indefinite integrals', () => {
    const result = resolveSymbolicIntegralFromLatex('\\sqrt{1+x^4}')
    const substitutionGap = resolveSymbolicIntegralFromLatex('\\sin(x^2)')
    const missingExpDerivative = resolveSymbolicIntegralFromLatex('e^{x^2}')
    const missingLogDerivative = resolveSymbolicIntegralFromLatex('\\ln(x^2+1)')
    const absSubstitutionGap = resolveSymbolicIntegralFromLatex('|x|\\cos(x^2)')
    const rationalGap = resolveSymbolicIntegralFromLatex('\\frac{1}{x^4+1}')

    expect(result.kind).toBe('error')
    if (result.kind === 'error') {
      expect(result.error).toContain('could not be determined symbolically')
      expect(result.candidate.controlledFailureClass).toBe('missing-derivative-factor')
      expect(result.candidate.domainHazards).toContain('root-radicand-nonnegative')
    }

    expect(substitutionGap.kind).toBe('error')
    if (substitutionGap.kind === 'error') {
      expect(substitutionGap.candidate.controlledFailureClass).toBe('missing-derivative-factor')
      expect(substitutionGap.candidate.readinessNotes.join(' ')).toContain('no bounded derivative factor')
    }

    expect(missingExpDerivative.kind).toBe('error')
    if (missingExpDerivative.kind === 'error') {
      expect(missingExpDerivative.candidate.controlledFailureClass).toBe('missing-derivative-factor')
    }

    expect(missingLogDerivative.kind).toBe('error')
    if (missingLogDerivative.kind === 'error') {
      expect(missingLogDerivative.candidate.controlledFailureClass).toBe('missing-derivative-factor')
      expect(missingLogDerivative.candidate.domainHazards).toContain('log-argument-positive')
    }

    expect(absSubstitutionGap.kind).toBe('error')
    if (absSubstitutionGap.kind === 'error') {
      expect(absSubstitutionGap.candidate.blockedPrerequisites).toContain('branch-analysis')
    }

    expect(rationalGap.kind).toBe('error')
    if (rationalGap.kind === 'error') {
      expect(rationalGap.candidate.controlledFailureClass).toBe('blocked-polynomial-prerequisite')
      expect(rationalGap.candidate.blockedPrerequisites).toContain('partial-fractions')
      expect(rationalGap.candidate.readinessNotes.join(' ')).toContain('supported bounded INT-RAT2')
    }
  })
})
