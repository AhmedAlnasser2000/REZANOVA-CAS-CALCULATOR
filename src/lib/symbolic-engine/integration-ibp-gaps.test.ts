import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>;
type IntegrationError = Extract<IntegrationResult, { kind: 'error' }>;

function expectIntegrationSuccess(result: IntegrationResult): IntegrationSuccess {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected integration success');
  }
  return result;
}

function expectIntegrationError(result: IntegrationResult): IntegrationError {
  expect(result.kind).toBe('error');
  if (result.kind !== 'error') {
    throw new Error('Expected integration error');
  }
  return result;
}

describe('symbolic-engine integration by-parts textbook gap unlocks', () => {
  it.each([
    String.raw`x\arctan(x)`,
    String.raw`x\arcsin(x)`,
    String.raw`x^2\arcsin(x)`,
    String.raw`x^3\arctan(x)`,
    String.raw`x^3\arcsin(x)`,
    String.raw`x^4\arcsin(x)`,
    String.raw`x\arctan(2x)`,
  ])('handles bounded polynomial-times-inverse-trig IBP %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('integration-by-parts');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toMatch(/\\arc(?:tan|sin)/u);
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration By Parts');
  }, 60000);

  it.each([
    String.raw`x\sec^2(2x)`,
    String.raw`x\csc^2(2x)`,
    String.raw`x\sec^2(3x)`,
    String.raw`x\csc^2(3x)`,
    String.raw`x\sec^2(4x)`,
    String.raw`x\csc^2(4x)`,
    String.raw`x\sec^2(5x)`,
    String.raw`x\csc^2(5x)`,
  ])('handles affine-polynomial times affine trig derivative IBP %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('integration-by-parts');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.exactLatex).toMatch(/\\(?:tan|cot)/u);
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration By Parts');
  }, 60000);

  it('keeps affine trig derivative IBP bounded to affine polynomial factors', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(String.raw`x^2\sec^2(2x)`));
    expect(result.candidate.controlledFailureClass).toBeDefined();
  });

  it('keeps high-degree affine arcsin IBP capped until the recurrence builder is optimized', () => {
    for (const latex of [
      String.raw`x\arcsin(x/2)`,
      String.raw`x^6\arcsin(x/2)`,
    ]) {
      const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex));
      expect(result.candidate.controlledFailureClass).toBeDefined();
    }
  });
});
