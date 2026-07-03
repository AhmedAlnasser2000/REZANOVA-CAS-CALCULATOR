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

describe('symbolic-engine integration recognition gates', () => {
  it('normalizes early textbook root and quotient power forms before routing', () => {
    const cases = [
      String.raw`\frac{3}{2}\sqrt{x}`,
      String.raw`\frac{1}{2\sqrt{x}}`,
      String.raw`\frac{1}{3x^{1/3}}`,
      String.raw`\sqrt{x}+x^{1/3}`,
      String.raw`\frac{\sqrt{x}}{2}+\frac{2}{\sqrt{x}}`,
      String.raw`8x-\frac{2}{x^{1/4}}`,
    ];

    for (const latex of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.strategy, latex).toBe('direct-rule');
      expect(result.verification.status, latex).toBe('verified-exact');
      expect(result.detailSections?.map((section) => section.title), latex)
        .toContain('Integration Normal Form');
    }
  });

  it('fails closed for mixed additive forms when a term remains unsupported', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(String.raw`x^2+\sin(x^2)`));
    expect(result.candidate.method).toBe('unsupported');
    expect(result.detailSections?.map((section) => section.title)).toContain('Integration Term Plan');
    expect(result.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('does not present a partial antiderivative');
  });
});
