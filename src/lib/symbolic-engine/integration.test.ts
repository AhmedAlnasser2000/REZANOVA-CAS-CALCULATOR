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
      { latex: '(a x+b)^2', contains: ['a^2', 'b^2'] },
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
    const radical = resolveSymbolicIntegralFromLatex('\\sqrt{x^2+1}')
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
    const trigHighDegree = resolveSymbolicIntegralFromLatex('x^5\\cos(x)')
    const logCase = resolveSymbolicIntegralFromLatex('x\\ln(x)')
    const affineLogCase = resolveSymbolicIntegralFromLatex('x\\ln(2x+3)')
    const affineBaseTenLogCase = resolveSymbolicIntegralFromLatex('x\\log(2x+3)')

    expect(expCase.kind).toBe('success')
    expect(trigCase.kind).toBe('success')
    expect(expQuadratic.kind).toBe('success')
    expect(trigQuadratic.kind).toBe('success')
    expect(expHighDegree.kind).toBe('success')
    expect(trigHighDegree.kind).toBe('success')
    expect(logCase.kind).toBe('success')
    expect(affineLogCase.kind).toBe('success')
    expect(affineBaseTenLogCase.kind).toBe('success')

    if (expHighDegree.kind === 'success') {
      expect(expHighDegree.strategy).toBe('integration-by-parts')
      expect(expHighDegree.verification.status).toMatch(/verified-/)
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

  it.each([
    ['sin affine', '\\sin(2x+3)', ['u-substitution', 'direct-rule']],
    ['cos affine', '\\cos(2x+3)', ['u-substitution', 'direct-rule']],
    ['tan affine', '\\tan(2x+3)', ['direct-rule']],
    ['cot affine', '\\cot(2x+3)', ['direct-rule']],
    ['sec squared affine', '\\sec(2x+3)^2', ['direct-rule']],
    ['csc squared affine', '\\csc(2x+3)^2', ['direct-rule']],
    ['sec squared rational affine', '\\sec(\\frac{1}{2}x+1)^2', ['direct-rule']],
  ])('handles exact-rational affine trig primitive: %s', (_label, latex, strategies) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(strategies).toContain(result.strategy)
    expect(result.verification.status).toBe('verified-exact')
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
    ['symbolic base', 'a^{2x+1}'],
  ])('keeps unsupported numeric-base exponential stop: %s', (_label, latex) => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex))
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family')
  })

  it('handles linear rational partial-fraction primitives', () => {
    const reciprocalDifference = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{x^2-1}'))
    expect(reciprocalDifference.strategy).toBe('partial-fractions')
    expect(reciprocalDifference.candidate.requiredPrerequisites).toContain('rational-function-core')
    expect(reciprocalDifference.candidate.requiredPrerequisites).toContain('partial-fractions')
    expect(reciprocalDifference.exactLatex).toContain('\\ln')
    expect(reciprocalDifference.exactLatex).toContain('x-1')
    expect(reciprocalDifference.exactLatex).toContain('x+1')
    expect(reciprocalDifference.verification.status).toMatch(/verified-/)

    const linearFactors = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{3x+5}{(x-1)(x+2)}'))
    expect(linearFactors.strategy).toBe('partial-fractions')
    expect(linearFactors.exactLatex).toBe('\\frac{8}{3}\\ln\\left|x-1\\right|+\\frac{1}{3}\\ln\\left|x+2\\right|')
    expect(linearFactors.verification.status).toMatch(/verified-/)

    const improper = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x^2+1}{x+1}'))
    expect(improper.strategy).toBe('partial-fractions')
    expect(improper.exactLatex).toContain('x^{2}')
    expect(improper.exactLatex).toContain('\\ln')
    expect(improper.exactLatex).toContain('x+1')
  }, 60000)

  it('handles repeated-linear rational partial-fraction primitives', () => {
    const repeatedLinear = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{(x-1)^2}'))
    expect(repeatedLinear.strategy).toBe('partial-fractions')
    expect(repeatedLinear.exactLatex).toBe('-\\frac{1}{x-1}')
    expect(repeatedLinear.verification.status).toMatch(/verified-/)

    const mixedRepeatedLinear = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x+2}{(x-1)^2(x+3)}'))
    expect(mixedRepeatedLinear.strategy).toBe('partial-fractions')
    expect(mixedRepeatedLinear.exactLatex).toContain('\\ln')
    expect(mixedRepeatedLinear.exactLatex).toContain('x-1')
    expect(mixedRepeatedLinear.exactLatex).toContain('x+3')
    expect(mixedRepeatedLinear.verification.status).toMatch(/verified-/)

    for (const repeated of [
      resolveSymbolicIntegralFromLatex('\\frac{1}{(2x+3)^9}'),
      resolveSymbolicIntegralFromLatex('\\frac{3}{(\\frac{1}{2}x+1)^4}'),
    ]) {
      expect(repeated.kind).toBe('success')
      if (repeated.kind === 'success') {
        expect(repeated.strategy).toBe('partial-fractions')
        expect(repeated.verification.status).toBe('verified-exact')
      }
    }

    for (const repeatedProduct of [
      resolveSymbolicIntegralFromLatex('\\frac{x+1}{(2x-1)^2(3x+2)}'),
      resolveSymbolicIntegralFromLatex('\\frac{\\frac{1}{3}x+2}{(\\frac{1}{2}x-1)^2(x+3)}'),
    ]) {
      expect(repeatedProduct.kind).toBe('success')
      if (repeatedProduct.kind === 'success') {
        expect(repeatedProduct.strategy).toBe('partial-fractions')
        expect(repeatedProduct.exactLatex).toContain('\\ln')
        expect(repeatedProduct.verification.status).toBe('verified-exact')
      }
    }

    const overDegreeRepeatedProduct = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{x+1}{(x-2)^5(x+3)^4}'),
    )
    expect(overDegreeRepeatedProduct.candidate.controlledFailureClass).toBe('blocked-polynomial-prerequisite')
  }, 60000)

  it('handles mixed linear and quadratic partial-fraction primitives', () => {
    const irreducibleQuadratic = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x+1}{x^2+1}'))
    expect(irreducibleQuadratic.strategy).toBe('partial-fractions')
    expect(irreducibleQuadratic.exactLatex).toBe('\\frac{1}{2}\\ln\\left(x^2+1\\right)+\\arctan\\left(x\\right)')
    expect(irreducibleQuadratic.verification.status).toMatch(/verified-/)

    const mixedQuadratic = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x+3}{(x-1)(x^2+1)}'))
    expect(mixedQuadratic.strategy).toBe('partial-fractions')
    expect(mixedQuadratic.exactLatex).toBe('2\\ln\\left|x-1\\right|-\\ln\\left(x^2+1\\right)-\\arctan\\left(x\\right)')
    expect(mixedQuadratic.verification.status).toMatch(/verified-/)

    for (const mixed of [
      resolveSymbolicIntegralFromLatex('\\frac{2x+1}{(x+2)^2(x^2+4)}'),
      resolveSymbolicIntegralFromLatex('\\frac{x+1}{(2x-1)(x^2+4)}'),
      resolveSymbolicIntegralFromLatex('\\frac{x+1}{(x-1)(x+2)(x^2+1)}'),
      resolveSymbolicIntegralFromLatex('\\frac{x+1}{(x-2)(x^2+1)^3}'),
    ]) {
      expect(mixed.kind).toBe('success')
      if (mixed.kind === 'success') {
        expect(mixed.strategy).toBe('partial-fractions')
        expect(mixed.exactLatex).toContain('\\ln')
        expect(mixed.exactLatex).toContain('\\arctan')
        expect(mixed.verification.status).toBe('verified-exact')
      }
    }

    for (const mixed of [
      resolveSymbolicIntegralFromLatex('\\frac{1}{(x^2+1)(x^2+4)}'),
      resolveSymbolicIntegralFromLatex('\\frac{1}{(x^2+1)^2(x^2+4)}'),
    ]) {
      expect(mixed.kind).toBe('success')
      if (mixed.kind === 'success') {
        expect(mixed.strategy).toBe('partial-fractions')
        expect(mixed.exactLatex).toContain('\\arctan')
        expect(mixed.verification.status).toBe('verified-exact')
      }
    }
  }, 90000)

  it.each([
    ['exact-square p2', '\\frac{1}{(1+x^2)^2}'],
    ['scaled exact-square p2', '\\frac{1}{(4+x^2)^2}'],
    ['exact-square p3', '\\frac{1}{(1+x^2)^3}'],
    ['exact-square p4', '\\frac{1}{(1+x^2)^4}'],
    ['scaled exact-square p3', '\\frac{1}{(4+x^2)^3}'],
    ['scaled exact-square p4', '\\frac{1}{(4+x^2)^4}'],
    ['nonsquare p2', '\\frac{1}{(2+x^2)^2}'],
    ['nonsquare p3', '\\frac{1}{(3+x^2)^3}'],
    ['nonsquare affine p4', '\\frac{1}{(\\frac{1}{2}+(2x+1)^2)^4}'],
    ['completed-square p2', '\\frac{1}{(x^2+2x+3)^2}'],
    ['scaled completed-square p3', '\\frac{1}{(2x^2+4x+5)^3}'],
  ])('handles repeated quadratic reciprocal partial fractions: %s', (_label, latex) => {
    const repeated = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(repeated.strategy).toBe('partial-fractions')
    expect(repeated.exactLatex).toContain('\\arctan')
    expect(repeated.verification.status).toBe('verified-exact')
  }, 90000)

  it.each([
    ['unit quadratic p2', '\\frac{x+1}{(1+x^2)^2}'],
    ['scaled quadratic p2', '\\frac{2x+3}{(4+x^2)^2}'],
    ['constant numerator p2', '\\frac{3}{(1+x^2)^2}'],
    ['nonsquare quadratic p3', '\\frac{x+1}{(2+x^2)^3}'],
    ['completed-square quadratic p4', '\\frac{2x+3}{(x^2+2x+3)^4}'],
    ['scaled completed-square quadratic p3', '\\frac{x+5}{(2x^2+4x+5)^3}'],
  ])('handles numerator-over-quadratic partial fractions: %s', (_label, latex) => {
    const numeratorCase = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex))
    expect(numeratorCase.strategy).toBe('partial-fractions')
    expect(numeratorCase.exactLatex).toContain('\\arctan')
    expect(numeratorCase.verification.status).toBe('verified-exact')
  }, 90000)

  it('preserves rational partial-fraction stops and overlap precedence', () => {
    const tooManyQuadraticFactors = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{1}{(x^2+1)(x^2+4)(x^2+9)}'),
    )
    expect(tooManyQuadraticFactors.candidate.blockedPrerequisites).toContain('partial-fractions')

    const cubicQuadraticWithAnotherQuadratic = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{1}{(x^2+1)^3(x^2+4)}'),
    )
    expect(cubicQuadraticWithAnotherQuadratic.candidate.blockedPrerequisites).toContain('partial-fractions')

    const derivativeRatio = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{2x+3}{x^2+3x+2}'))
    expect(derivativeRatio.strategy).toBe('derivative-ratio')

    const inverseTrig = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{1}{1+x^2}'))
    expect(inverseTrig.strategy).toBe('inverse-trig')

    for (const substitutionOverlap of [
      resolveSymbolicIntegralFromLatex('\\frac{x}{(1+x^2)^2}'),
      resolveSymbolicIntegralFromLatex('\\frac{x}{(1+x^2)^3}'),
      resolveSymbolicIntegralFromLatex('\\frac{2x+2}{(x^2+2x+3)^4}'),
    ]) {
      expect(substitutionOverlap.kind).toBe('success')
      if (substitutionOverlap.kind === 'success') {
        expect(substitutionOverlap.strategy).toBe('u-substitution')
        expect(substitutionOverlap.verification.status).toBe('verified-exact')
      }
    }

    const higherRepeatedQuadraticPower = expectIntegrationError(
      resolveSymbolicIntegralFromLatex('\\frac{1}{(1+x^2)^5}'),
    )
    expect(higherRepeatedQuadraticPower.error).toContain('could not be determined symbolically')
  }, 60000)

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
