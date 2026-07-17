import { describe, expect, it } from 'vitest';
import {
  renderCalculusAntiderivativeExpression,
  standardAntiderivativeExpression,
} from '../calculus/engine/antiderivative-expression';
import { resolveSymbolicIntegralFromAst, resolveSymbolicIntegralFromLatex } from './integration';

type IntegrationResult = ReturnType<typeof resolveSymbolicIntegralFromLatex>;
type IntegrationSuccess = Extract<IntegrationResult, { kind: 'success' }>;

function expectIntegrationSuccess(result: IntegrationResult): IntegrationSuccess {
  expect(result.kind).toBe('success');
  if (result.kind !== 'success') {
    throw new Error('Expected integration success');
  }
  return result;
}

describe('symbolic-engine trig IBP and formal-function integration', () => {
  it('integrates sec squared times csc squared through a bounded trig identity', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(
      String.raw`\sec^2(x)\csc^2(x)`,
    ));

    expect(result.strategy).toBe('integration-by-parts');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toBe(String.raw`-2\cot(2x)`);
    expect(result.antiderivativeExpression?.kind).toBe('standard-math-json');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration Trig Identity');
  });

  it('integrates polynomial times logarithm powers by bounded integration by parts', () => {
    const result = expectIntegrationSuccess(resolveSymbolicIntegralFromLatex(
      String.raw`x\ln(x)^2`,
    ));

    expect(result.strategy).toBe('integration-by-parts');
    expect(result.verification.status).toBe('verified-exact');
    expect(result.exactLatex).toBe(
      String.raw`\frac{1}{2}x^2\ln(x)^2-\frac{1}{2}x^2\ln(x)+\frac{1}{4}x^2`,
    );
    expect(result.exactSupplementLatex?.join(' ')).toContain('x>0');
    expect(result.detailSections?.map((section) => section.title))
      .toContain('Integration By Parts');
  });

  it('keeps malformed ln-power shorthand outside semantic adoption', () => {
    const result = resolveSymbolicIntegralFromLatex(String.raw`x\ln^2(x)`);

    expect(result.kind).toBe('error');
    if (result.kind !== 'error') {
      throw new Error('Expected malformed shorthand to remain unsupported');
    }
    expect(result.candidate.controlledFailureClass).toMatch(/unsupported-family|missing-derivative-factor/);
  });

  it('prints and integrates a formal function times its derivative from structured input', () => {
    const expression = standardAntiderivativeExpression({
      mathJson: ['Divide', ['Power', ['Apply', 'f', 'x'], 2], 2],
      source: 'test:formal-product',
    });
    expect(renderCalculusAntiderivativeExpression(expression)).toBe(String.raw`\frac{f\left(x\right)^2}{2}`);

    const structured = expectIntegrationSuccess(resolveSymbolicIntegralFromAst([
      'Multiply',
      ['Apply', 'f', 'x'],
      ['D', ['Apply', 'f', 'x'], 'x'],
    ], 'x'));
    expect(structured.strategy).toBe('integration-by-parts');
    expect(structured.verification.status).toBe('verified-exact');
    expect(structured.exactLatex).toBe(String.raw`\frac{f\left(x\right)^2}{2}`);

    const parserTuple = expectIntegrationSuccess(resolveSymbolicIntegralFromAst([
      'Tuple',
      'f',
      'x',
      ['D', ['f', 'x'], 'x'],
    ], 'x'));
    expect(parserTuple.exactLatex).toBe(String.raw`\frac{f\left(x\right)^2}{2}`);
  });
});
