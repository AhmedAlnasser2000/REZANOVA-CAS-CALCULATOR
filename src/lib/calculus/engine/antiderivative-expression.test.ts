import { describe, expect, it } from 'vitest';
import {
  addAntiderivativeExpressions,
  calculusAntiderivativeExpressionToAst,
  renderCalculusAntiderivativeExpression,
  scaleAntiderivativeExpression,
  specialFunctionAntiderivativeExpression,
  standardAntiderivativeExpression,
  withIntegrationConstant,
} from './antiderivative-expression';
import { backcheckAntiderivativeAst } from './verification';
import { presentVerifiedIndefiniteAntiderivative } from '../../symbolic-engine/integration/presentation/antiderivative';
import { finishScalarMultipleRetry } from '../../symbolic-engine/integration/scalar-multiple';

describe('Calculus native antiderivative expression', () => {
  it('composes standard MathJSON without reparsing rendered LaTeX', () => {
    const squarePrimitive = standardAntiderivativeExpression({
      mathJson: ['Divide', ['Power', 'x', 2], 2],
      source: 'test:square-primitive',
    });
    const sinePrimitive = standardAntiderivativeExpression({
      mathJson: ['Negate', ['Cos', 'x']],
      source: 'test:sine-primitive',
    });
    const scaledSine = scaleAntiderivativeExpression({
      coefficient: 3,
      expression: sinePrimitive,
      source: 'test:scaled-sine',
    });
    expect(scaledSine).toBeDefined();

    const combined = addAntiderivativeExpressions({
      terms: [
        { expression: squarePrimitive },
        { expression: scaledSine! },
      ],
      source: 'test:additive-composition',
    });
    expect(combined).toMatchObject({
      kind: 'standard-math-json',
      mathJson: [
        'Add',
        ['Divide', ['Power', 'x', 2], 2],
        ['Multiply', 3, ['Negate', ['Cos', 'x']]],
      ],
    });
    expect(renderCalculusAntiderivativeExpression(combined!)).toContain('x');
  });

  it('lifts mixed standard and special-function terms into typed V4 structure', () => {
    const elliptic = specialFunctionAntiderivativeExpression({
      source: 'test:elliptic-first-kind',
      expression: {
        kind: 'named-function',
        name: 'EllipticF',
        arguments: [
          { kind: 'standard-math', value: { canonicalLatex: 'x', mathJson: 'x' } },
          { kind: 'standard-math', value: { canonicalLatex: 'm', mathJson: 'm' } },
        ],
      },
    });
    const correction = standardAntiderivativeExpression({
      mathJson: ['Multiply', 2, 'x'],
      source: 'test:elliptic-correction',
    });
    const combined = addAntiderivativeExpressions({
      terms: [
        { expression: correction },
        { expression: elliptic, sign: -1 },
      ],
      source: 'test:mixed-special-composition',
    });

    expect(combined?.kind).toBe('special-function-expression');
    expect(renderCalculusAntiderivativeExpression(combined!)).toContain('EllipticF');
    expect(calculusAntiderivativeExpressionToAst(combined!)).toEqual([
      'Add',
      ['Multiply', 2, 'x'],
      ['Negate', ['EllipticF', 'x', 'm']],
    ]);
  });

  it('adds the integration constant structurally on the right after backcheck', () => {
    const primitive = standardAntiderivativeExpression({
      mathJson: ['Divide', ['Power', 'x', 2], 2],
      source: 'test:verified-primitive',
    });
    const family = withIntegrationConstant(primitive, 'x');
    const familyAst = calculusAntiderivativeExpressionToAst(family);

    expect(renderCalculusAntiderivativeExpression(family)).toMatch(/\+C$/);
    expect(familyAst).toEqual([
      'Add',
      ['Divide', ['Power', 'x', 2], 2],
      'C',
    ]);
    expect(backcheckAntiderivativeAst({
      antiderivative: familyAst,
      integrand: 'x',
      variable: 'x',
    }).status).toBe('verified-exact');
  });

  it('presents a verified native expression without recovering meaning from LaTeX', () => {
    const primitive = standardAntiderivativeExpression({
      mathJson: ['Divide', ['Power', 'x', 2], 2],
      source: 'test:presentation-primitive',
    });
    const presented = presentVerifiedIndefiniteAntiderivative({
      exactLatex: 'legacy-placeholder',
      antiderivativeExpression: primitive,
      integrand: 'x',
      variable: 'x',
      verification: { status: 'verified-exact' },
    });

    expect(presented?.exactLatex).toMatch(/\+C$/);
    expect(presented?.exactLatex).not.toContain('legacy-placeholder');
    expect(presented?.answerRows?.rows).toEqual([{ latex: presented?.exactLatex }]);
    expect(presented?.antiderivativeExpression?.kind).toBe('indefinite-family');
  });

  it('preserves native authority through scalar-multiple adoption', () => {
    const primitive = standardAntiderivativeExpression({
      mathJson: ['Divide', ['Power', 'x', 2], 2],
      source: 'test:scalar-inner-primitive',
    });
    const result = finishScalarMultipleRetry(
      ['Multiply', 3, 'x'],
      'x',
      { coefficient: 3, body: 'x' },
      {
        kind: 'success',
        exactLatex: '\\frac{x^2}{2}',
        antiderivativeExpression: primitive,
        origin: 'rule-based-symbolic',
        strategy: 'direct-rule',
        verification: { status: 'verified-exact' },
        candidate: {
          method: 'direct-rule',
          requiredPrerequisites: ['derivative-backcheck'],
          blockedPrerequisites: [],
          verificationStatus: 'verified-exact',
          readinessNotes: [],
          domainHazards: [],
        },
      },
    );

    expect(result?.kind).toBe('success');
    if (result?.kind !== 'success') {
      throw new Error('Expected native scalar multiple success');
    }
    expect(result.antiderivativeExpression).toMatchObject({
      kind: 'standard-math-json',
      mathJson: ['Divide', ['Multiply', 3, ['Power', 'x', 2]], 2],
    });
    expect(result.verification.status).toBe('verified-exact');
  });
});
