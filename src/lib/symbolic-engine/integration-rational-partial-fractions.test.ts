import { describe, expect, it } from 'vitest'
import { resolveSymbolicIntegralFromLatex } from './integration'

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

describe('symbolic-engine rational partial-fraction integration', () => {
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
    expect(linearFactors.exactLatex).toContain('\\frac{8}{3}\\ln')
    expect(linearFactors.exactLatex).toContain('x-1')
    expect(linearFactors.exactLatex).toContain('\\frac{1}{3}\\ln')
    expect(linearFactors.exactLatex).toContain('x+2')
    expect(linearFactors.verification.status).toMatch(/verified-/)

    const improper = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x^2+1}{x+1}'))
    expect(improper.strategy).toBe('partial-fractions')
    expect(improper.exactLatex).toContain('x^2')
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
    expect(irreducibleQuadratic.exactLatex).toContain('\\frac{1}{2}\\ln')
    expect(irreducibleQuadratic.exactLatex).toContain('\\arctan')
    expect(irreducibleQuadratic.verification.status).toMatch(/verified-/)

    const mixedQuadratic = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\frac{x+3}{(x-1)(x^2+1)}'))
    expect(mixedQuadratic.strategy).toBe('partial-fractions')
    expect(mixedQuadratic.exactLatex).toContain('2\\ln')
    expect(mixedQuadratic.exactLatex).toContain('x-1')
    expect(mixedQuadratic.exactLatex).toContain('x^2+1')
    expect(mixedQuadratic.exactLatex).toContain('\\arctan')
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
})
