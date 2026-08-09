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

const ambiguousCoefficientFactor = /\\frac\{1\}\{\d+\}\s*(?:\\left)?\(?\s*\d/u;
const doubleNegativeFractionGroup = /-\\(?:left\()?\\frac\{-/u;

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
      expect(result.verification.status, latex).toBe('verified-exact');
      expect(result.detailSections?.map((section) => section.title), latex)
        .toEqual(expect.arrayContaining([
          expect.stringMatching(/^Integration (Normal Form|Carrier Substitution)$/),
        ]));
    }
  });

  it('keeps root-power normal-form readback coefficients visually grouped', () => {
    const cases = [
      String.raw`\sqrt{x}+x^{1/3}`,
      String.raw`\frac{\sqrt{x}}{2}+\frac{2}{\sqrt{x}}`,
      String.raw`8x-\frac{2}{x^{1/4}}`,
    ];

    for (const latex of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.exactLatex, latex).not.toMatch(ambiguousCoefficientFactor);
    }

    const rootSum = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(String.raw`\sqrt{x}+x^{1/3}`));
    expect(rootSum.exactLatex).toContain(String.raw`\frac{2x^{\frac{3}{2}}}{3}`);
    expect(rootSum.exactLatex).toContain(String.raw`\frac{3x^{\frac{4}{3}}}{4}`);
  });

  it('recognizes scalar multiples of supported primitive atoms and sums', () => {
    const cases = [
      {
        latex: String.raw`-\pi\sin(\pi x)`,
        snippets: [String.raw`\cos(\pix)`],
      },
      {
        latex: String.raw`-\sec^2\left(\frac{3x}{2}\right)`,
        snippets: [String.raw`-\frac{2`, String.raw`\tan(\frac{3x}{2})`],
      },
      {
        latex: String.raw`\frac{1}{2}\left(\csc^2(x)-\csc(x)\cot(x)\right)`,
        snippets: [
          String.raw`\frac{\left(-\cot(x)+\csc(x)\right)}{2}`,
          String.raw`-\cot(x)`,
          String.raw`\csc(x)`,
        ],
      },
    ];

    for (const { latex, snippets } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.verification.status, latex).toBe('verified-exact');
      expect(result.detailSections?.map((section) => section.title), latex)
        .toContain('Integration Scalar Multiple');
      for (const snippet of snippets) {
        expect(result.exactLatex, latex).toContain(snippet);
      }
    }
  });

  it('fails closed for mixed additive forms when a term remains unsupported', () => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(String.raw`x^2+\sin(x^2)`));
    expect(result.candidate.method).toBe('unsupported');
    expect(result.detailSections?.map((section) => section.title)).toContain('Integration Term Plan');
    expect(result.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('does not present a partial antiderivative');
  });

  it('recognizes symbolic-affine trig derivative products', () => {
    const cases = [
      { latex: String.raw`\sec\left(\frac{\pi x}{2}\right)\tan\left(\frac{\pi x}{2}\right)`, answer: '\\sec' },
      { latex: String.raw`-\pi\csc\left(\frac{\pi x}{2}\right)\cot\left(\frac{\pi x}{2}\right)`, answer: '\\csc' },
      { latex: String.raw`\sin\left(\frac{\pi x}{2}\right)\cos\left(\frac{\pi x}{2}\right)`, answer: '\\sin' },
    ];

    for (const { latex, answer } of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.strategy, latex).toBe('u-substitution');
      expect(result.verification.status, latex).toBe('verified-exact');
      expect(result.exactLatex, latex).toContain(answer);
      expect(result.exactSupplementLatex?.join(' '), latex).toContain('\\ne0');
      expect(result.exactSupplementLatex?.join(' '), latex).toContain('\\pi');
    }
  });

  it('applies bounded textbook trig rewrites before routing', () => {
    const cases = [
      String.raw`(\sin(x)-\cos(x))^2`,
      String.raw`(1+2\cos(x))^2`,
      String.raw`\cos(x)(\tan(x)+\sec(x))`,
    ];

    for (const latex of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.verification.status, latex).toBe('verified-exact');
      expect(result.detailSections?.map((section) => section.title), latex)
        .toContain('Integration Trig Rewrite');
    }
  });

  it('combines normal form, affine trig products, and bounded trig rewrites in mixed sums', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(
      String.raw`\frac{3}{2}\sqrt{x}+\sec\left(\frac{\pi x}{2}\right)\tan\left(\frac{\pi x}{2}\right)+(\sin(x)-\cos(x))^2`,
    ));

    expect(result.verification.status).toBe('verified-exact');
    expect(result.detailSections?.map((section) => section.title))
      .toEqual(expect.arrayContaining(['Integration Carrier Substitution', 'Integration Trig Rewrite']));
    expect(result.exactSupplementLatex?.join(' ')).toContain('\\pi');
  });

  it('does not rewrite over-bound or branch-sensitive trig forms', () => {
    const highPower = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(String.raw`\sin(x)^8`));
    expect(highPower.detailSections?.map((section) => section.title) ?? [])
      .not.toContain('Integration Trig Rewrite');

    const branchSensitive = expectIntegrationError(resolveSymbolicIntegralFromLatex(String.raw`|\cos(x)|\sec(x)`));
    expect(branchSensitive.detailSections?.map((section) => section.title) ?? [])
      .not.toContain('Integration Trig Rewrite');

    const overBoundSquare = expectIntegrationError(resolveSymbolicIntegralFromLatex(
      String.raw`(\sin(x)+\cos(x)+\tan(x)+\sec(x))^2`,
    ));
    expect(overBoundSquare.detailSections?.map((section) => section.title) ?? [])
      .not.toContain('Integration Trig Rewrite');
  });

  it('keeps first-200 style negative primitive readback free of double-negative groups', () => {
    const cases = [
      String.raw`(\sin(x)-\cos(x))^2`,
      String.raw`\sin(7-3x)`,
    ];

    for (const latex of cases) {
      const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
      expect(result.exactLatex, latex).not.toMatch(doubleNegativeFractionGroup);
    }
  });
});
