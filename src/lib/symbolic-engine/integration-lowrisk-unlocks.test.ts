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

describe('symbolic-engine low-risk textbook integration unlocks', () => {
  it.each([
    [String.raw`\frac{\ln(x)^2}{x}`, String.raw`\ln`],
    [String.raw`\frac{1}{x\ln(x)^2}`, String.raw`\frac{1}{\ln`],
  ])('handles bounded log-power substitution %s', (latex, marker) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain(marker);
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Log-Power Substitution');
    expect(result.exactSupplementLatex?.join(' ')).toContain('x>0');
  });

  it.each([
    String.raw`\frac{2x^3-3x^2+1}{x^2-3x+1}`,
    String.raw`\frac{2x^3-4x^2+1}{x^2-4x+1}`,
    String.raw`\frac{2x^3-5x^2+1}{x^2-5x+1}`,
    String.raw`\frac{2x^3-6x^2+1}{x^2-6x+1}`,
    String.raw`\frac{2x^3-7x^2+1}{x^2-7x+1}`,
    String.raw`\frac{2x^3-8x^2+1}{x^2-8x+1}`,
  ])('handles improper rational quadratic-remainder case %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('partial-fractions');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\ln');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Polynomial Division');
  }, 60000);

  it.each([
    String.raw`\frac{1}{(4-x^2)^{3/2}}`,
    String.raw`\frac{1}{(x^2+4)^{3/2}}`,
    String.raw`\frac{1}{(9-x^2)^{3/2}}`,
    String.raw`\frac{1}{(x^2+9)^{3/2}}`,
    String.raw`\frac{1}{(16-x^2)^{3/2}}`,
    String.raw`\frac{1}{(x^2+16)^{3/2}}`,
    String.raw`\frac{1}{(25-x^2)^{3/2}}`,
    String.raw`\frac{1}{(x^2+25)^{3/2}}`,
    String.raw`\frac{1}{(36-x^2)^{3/2}}`,
    String.raw`\frac{1}{(x^2+36)^{3/2}}`,
    String.raw`\frac{1}{(4-(2x+1)^2)^{3/2}}`,
    String.raw`\frac{1}{((2x+1)^2+4)^{3/2}}`,
  ])('handles classic reciprocal trig-substitution radical %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\sqrt');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Radical Template');
  }, 60000);

  it.each([
    [String.raw`\sinh^2(x)`, String.raw`-\frac{1}{2}x`],
    [String.raw`\sinh^2(2x)`, String.raw`\sinh\left(2\left(2x\right)\right)`],
    [String.raw`\cosh^2(2x)`, String.raw`\sinh\left(2\left(2x\right)\right)`],
    [String.raw`\cosh^2(2x+1)`, '+'],
  ])('handles tiny hyperbolic table form %s', (latex, marker) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('direct-rule');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\sinh');
    expect(result.exactLatex).toContain(marker);
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Hyperbolic Table');
  }, 60000);

  it.each([
    String.raw`\frac{1}{x\sqrt{x^2-4}}`,
    String.raw`\frac{1}{x\sqrt{x^2-9}}`,
  ])('handles positive-branch inverse-secant radical form %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\arccos');
    expect(result.exactSupplementLatex?.join(' ')).toContain('>0');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Radical Template');
  });

  it.each([
    String.raw`\frac{\sqrt{x^2-4}}{x}`,
    String.raw`\frac{\sqrt{x^2-9}}{x}`,
  ])('keeps unresolved branch-heavy quotient-root forms controlled unsupported %s', (latex) => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex));
    expect(result.candidate.controlledFailureClass).toMatch(/unsupported-family|missing-derivative-factor/);
  });
});
