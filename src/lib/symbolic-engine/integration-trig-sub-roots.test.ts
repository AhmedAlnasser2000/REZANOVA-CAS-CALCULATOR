import { describe, expect, it } from 'vitest';
import { resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>;

function expectIntegrationSuccess(result: IntegrationResult): IntegrationSuccess {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected integration success');
  }
  return result;
}

describe('symbolic-engine trig-substitution root templates', () => {
  it.each([
    String.raw`\sqrt{4-x^2}`,
    String.raw`(4-x^2)^{1/2}`,
    String.raw`\sqrt{(2x+1)^2+9}`,
    String.raw`((2x+1)^2+9)^{1/2}`,
    String.raw`\sqrt{(3x-2)^2-4}`,
    String.raw`((3x-2)^2-4)^{1/2}`,
  ])('handles direct radical and fractional-power root form %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toMatch(/\\sqrt|\\arcsin|\\ln/u);
  });

  it.each([
    String.raw`\frac{x^2}{\sqrt{4-x^2}}`,
    String.raw`\frac{x^2}{(4-x^2)^{1/2}}`,
    String.raw`\frac{x^2}{\sqrt{x^2+4}}`,
    String.raw`\frac{x^2}{(x^2+4)^{1/2}}`,
    String.raw`\frac{x^2}{\sqrt{x^2-4}}`,
    String.raw`\frac{x^2}{(x^2-4)^{1/2}}`,
    String.raw`\frac{(2x+1)^2}{\sqrt{(2x+1)^2+9}}`,
    String.raw`\frac{(2x+1)^2}{((2x+1)^2+9)^{1/2}}`,
    String.raw`\frac{(3x-2)^2}{\sqrt{(3x-2)^2-4}}`,
  ])('handles squared affine carrier over matching radical %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toMatch(/\\sqrt|\\arcsin|\\ln|arsinh|arcosh/u);
  });

  it.each([
    String.raw`\frac{1}{x\sqrt{x^2-16}}`,
    String.raw`\frac{1}{x(x^2-16)^{1/2}}`,
  ])('handles positive-branch inverse-secant root template %s', (latex) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('u-substitution');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toContain('\\arccos');
    expect(result.exactSupplementLatex?.join(' ')).toContain('>0');
  });
});
