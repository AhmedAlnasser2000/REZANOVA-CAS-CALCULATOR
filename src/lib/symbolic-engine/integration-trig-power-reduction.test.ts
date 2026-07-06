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

describe('symbolic-engine bounded trig-power reductions', () => {
  it.each([
    [String.raw`\sin^2(x)\cos^2(x)`, String.raw`\sin`],
    [String.raw`\sin^5(x)\cos^6(x)`, String.raw`\cos`],
    [String.raw`\tan^4(x)\sec^5(x)`, String.raw`\sec`],
    [String.raw`\cot^4(x)\csc^5(x)`, String.raw`\csc`],
  ])('integrates bounded textbook trig-power product %s', (latex, marker) => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(latex));
    expect(result.strategy).toBe('direct-rule');
    expect(result.candidate.method).toBe('direct-rule');
    expect(['verified-exact', 'verified-numeric-confidence']).toContain(result.verification.status);
    expect(result.exactLatex).toContain(marker);
  });

  it.each([
    String.raw`\sin^9(x)\cos^4(x)`,
    String.raw`\tan^9(x)`,
    String.raw`\tan^8(x)\sec^5(x)`,
  ])('keeps over-cap trig-power products controlled %s', (latex) => {
    const result = expectIntegrationError(resolveSymbolicIntegralFromLatex(latex));
    expect(result.candidate.controlledFailureClass).toBe('unsupported-family');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Trig Power Boundary');
    expect(result.detailSections?.flatMap((section) => section.lines).join(' '))
      .toContain('No partial antiderivative');
  });
});
