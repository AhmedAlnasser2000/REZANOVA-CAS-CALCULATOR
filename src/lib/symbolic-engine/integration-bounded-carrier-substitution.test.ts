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

describe('symbolic-engine bounded carrier substitution integration', () => {
  it.each([
    [
      String.raw`x^3\sqrt{1-x^2}`,
      [String.raw`(-x^2+1)`, String.raw`\frac{3}{2}`, String.raw`\frac{5}{2}`],
    ],
    [
      String.raw`\frac{x}{\sqrt{1-x}}`,
      [String.raw`\sqrt{-x+1}`, String.raw`\frac{2}{3}`],
    ],
    [
      String.raw`\frac{x^3}{\sqrt{4x^2-1}}`,
      [String.raw`\sqrt{4x^2-1}`, String.raw`\frac{1}{48}`],
    ],
    [
      String.raw`(e^{x^2}+16)xe^{x^2}`,
      [String.raw`\frac{1}{4}`, String.raw`16`],
    ],
    [
      String.raw`\frac{\cos(3x)}{\sqrt{\sin(3x)}}`,
      [String.raw`\frac{2}{3}`, String.raw`\sqrt{\sin(3x)}`],
    ],
    [
      String.raw`(x^{3/2}+47)^3\sqrt{x}`,
      [String.raw`\frac{1}{6}`, String.raw`47`],
    ],
    [
      String.raw`\frac{x^3}{(2-x^2)^{5/2}}`,
      [String.raw`\frac{2}{3}`, String.raw`\frac{-3}{2}`],
    ],
  ])('integrates %s by bounded carrier substitution', (latex, fragments) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));

    expect(result.strategy).toBe('u-substitution');
    expect(['verified-exact', 'verified-numeric-confidence']).toContain(result.verification.status);
    expect(result.antiderivativeExpression?.kind).toBe('standard-math-json');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Carrier Substitution');
    for (const fragment of fragments) {
      expect(result.exactLatex).toContain(fragment);
    }
  });

  it('integrates bounded radical templates without slow symbolic fallback', () => {
    const moment = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(String.raw`x^2\sqrt{1-x^2}`));
    expect(moment.strategy).toBe('u-substitution');
    expect(moment.verification.status).toBe('verified-exact');
    expect(moment.exactLatex).toContain(String.raw`\arcsin(x)`);
    expect(moment.exactLatex).toContain(String.raw`\sqrt{-x^2+1}`);
    expect(moment.detailSections?.map((section) => section.title))
      .toContain('Integration Radical Template');

    const reciprocal = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(
      String.raw`\frac{1}{x^2\sqrt{1+x^2}}`,
    ));
    expect(reciprocal.strategy).toBe('u-substitution');
    expect(reciprocal.verification.status).toBe('verified-exact');
    expect(reciprocal.exactLatex).toContain(String.raw`-\frac{1}{x}\sqrt{x^2+1}`);
    expect(reciprocal.exactSupplementLatex?.join(' ')).toContain(String.raw`x\ne0`);
  });
});
