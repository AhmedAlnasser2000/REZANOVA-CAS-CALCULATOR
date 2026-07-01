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

describe('Risch-Norman depth-2 derivative substitutions', () => {
  it('handles derivative-present elementary depth-2 substitutions', () => {
    const nestedExp = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('e^x e^{e^x}'));
    expect(nestedExp.strategy).toBe('u-substitution');
    expect(nestedExp.exactLatex).toContain('e^');
    expect(nestedExp.exactLatex).toContain('e^{x}');
    expect(nestedExp.verification.status).toBe('verified-exact');

    const nestedSinExp = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('\\cos(x)e^{\\sin(x)}'));
    expect(nestedSinExp.strategy).toBe('u-substitution');
    expect(nestedSinExp.exactLatex).toContain('\\sin(x)');
    expect(nestedSinExp.verification.status).toBe('verified-exact');

    const expLogDerivative = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('e^x/(1+e^x)'));
    expect(expLogDerivative.strategy).toBe('u-substitution');
    expect(expLogDerivative.exactLatex).toContain('\\ln');
    expect(expLogDerivative.exactLatex).toContain('e^{x}');
    expect(expLogDerivative.verification.status).toBe('verified-exact');

    const logLogDerivative = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex('1/(x\\ln(x))'));
    expect(logLogDerivative.strategy).toBe('u-substitution');
    expect(logLogDerivative.exactLatex).toContain('\\ln\\left|\\ln\\left(x\\right)\\right|');
    expect(logLogDerivative.exactSupplementLatex?.join(' ')).toContain('x>0');
    expect(logLogDerivative.exactSupplementLatex?.join(' ')).toContain('\\ln\\left(x\\right)\\ne0');
    expect(logLogDerivative.verification.status).toBe('verified-exact');
  });
});
