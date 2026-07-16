import { describe, expect, it } from 'vitest';
import { historyEntrySchema } from '../app-state/schemas';
import {
  buildCanonicalResultDocumentV4,
  createCanonicalRuntimeResult,
  renderCanonicalSpecialFunctionExpressionV4,
  requireProvenCanonicalMathValueV2,
  resolveCanonicalResultForConsumer,
  validateCanonicalResultDocumentV4,
} from './index';
import { collectCanonicalMathLeaves } from './mathjson-coverage';
import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV4,
} from '../../types/calculator';
import type { CanonicalResultProducerInputV4 } from './producer-v4';

function standard(canonicalLatex: string, mathJson: unknown) {
  return requireProvenCanonicalMathValueV2({
    canonicalLatex,
    mathJson,
    owner: 'calculus',
    routeId: 'calculus.integrals',
    source: 'v4-special-function-contract-test',
  });
}

function ellipticExpression(): NonNullable<
  CanonicalResultProducerInputV4['primary']
>['expression'] {
  return {
    kind: 'sum',
    terms: [
      {
        kind: 'product',
        factors: [
          { kind: 'standard-math', value: standard('2', 2) },
          {
            kind: 'named-function',
            name: 'EllipticF',
            arguments: [
              { kind: 'standard-math', value: standard(String.raw`\arcsin(x)`, ['Arcsin', 'x']) },
              { kind: 'standard-math', value: standard('m', 'm') },
            ],
          },
        ],
      },
      {
        kind: 'negation',
        operand: {
          kind: 'named-function',
          name: 'EllipticE',
          arguments: [
            { kind: 'standard-math', value: standard('x', 'x') },
            { kind: 'standard-math', value: standard('m', 'm') },
          ],
        },
      },
    ],
  };
}

function document(): CanonicalResultDocumentV4 {
  return buildCanonicalResultDocumentV4({
    outcomeKind: 'success',
    title: 'Indefinite Integral',
    primary: {
      kind: 'special-function-expression',
      expression: ellipticExpression(),
    },
    request: {
      kind: 'math',
      value: standard(String.raw`\sqrt{x^3+x}`, ['Sqrt', ['Add', ['Power', 'x', 3], 'x']]),
    },
    warnings: [],
  });
}

describe('CanonicalResultDocumentV4 special-function expression', () => {
  it('validates, renders, normalizes, and resolves typed special expressions', () => {
    const canonicalResult = document();
    const expected = String.raw`2 \cdot \operatorname{EllipticF}\left(\arcsin(x),m\right) - \operatorname{EllipticE}\left(x,m\right)`;

    expect(renderCanonicalSpecialFunctionExpressionV4(
      canonicalResult.primary!.expression,
    )).toBe(expected);
    expect(validateCanonicalResultDocumentV4(structuredClone(canonicalResult))).toMatchObject({
      ok: true,
      validated: { mathValueCount: 6 },
    });

    const outcome = createCanonicalRuntimeResult(canonicalResult);
    expect(resolveCanonicalResultForConsumer(outcome)).toMatchObject({
      ok: true,
      sourceVersion: 4,
      presentation: { primaryLatex: expected },
      semantics: {
        primary: { kind: 'special-function-expression' },
      },
    });
    expect(collectCanonicalMathLeaves(canonicalResult)).toHaveLength(6);
  });

  it('survives the structured History schema without legacy result fields', () => {
    const canonicalResult = document();
    const parsed = historyEntrySchema.parse({
      id: 'v4-special-history',
      mode: 'calculus',
      inputLatex: String.raw`\sqrt{x^3+x}`,
      calculusScreen: 'indefiniteIntegral',
      resultDocument: canonicalResult,
      timestamp: '2026-07-16T00:00:00.000Z',
    });
    expect(parsed.resultDocument.version).toBe(4);
  });

  it.each([
    ['erfi', 1],
    ['Si', 1],
    ['Ci', 1],
    ['Ei', 1],
    ['li', 1],
    ['EllipticF', 2],
    ['EllipticE', 2],
    ['EllipticPi', 3],
  ] as const)('accepts only the fixed %s arity of %i', (name, arity) => {
    const argumentsList = Array.from({ length: arity }, () => ({
      kind: 'standard-math' as const,
      value: standard('x', 'x'),
    }));
    expect(validateCanonicalResultDocumentV4({
      version: 4,
      outcomeKind: 'success',
      title: 'Special function',
      primary: {
        kind: 'special-function-expression',
        expression: { kind: 'named-function', name, arguments: argumentsList },
      },
      warnings: [],
    })).toMatchObject({ ok: true });
  });

  it('rejects unknown functions, wrong arity, and V4 expressions without a special call', () => {
    const invalidName = structuredClone(document()) as unknown as Record<string, any>;
    invalidName.primary.expression.terms[0].factors[1].name = 'Gamma';
    expect(validateCanonicalResultDocumentV4(invalidName)).toMatchObject({
      ok: false,
      failure: { path: expect.stringContaining('.name') },
    });

    const wrongArity = structuredClone(document()) as unknown as Record<string, any>;
    wrongArity.primary.expression.terms[0].factors[1].arguments.pop();
    expect(validateCanonicalResultDocumentV4(wrongArity)).toMatchObject({
      ok: false,
      failure: { path: expect.stringContaining('.arguments') },
    });

    const ordinaryOnly = structuredClone(document()) as unknown as Record<string, any>;
    ordinaryOnly.primary.expression = {
      kind: 'standard-math',
      value: standard('x', 'x'),
    };
    expect(validateCanonicalResultDocumentV4(ordinaryOnly)).toMatchObject({
      ok: false,
      failure: { message: expect.stringContaining('reserved') },
    });
  });

  it('rejects non-standard MathJSON hidden inside an ordinary V4 leaf', () => {
    const invalid = structuredClone(document()) as unknown as Record<string, any>;
    invalid.primary.expression.terms[0].factors[0].value = {
      canonicalLatex: String.raw`\operatorname{EllipticF}(x,m)`,
      mathJson: ['EllipticF', 'x', 'm'],
    } satisfies CanonicalMathValueV2;
    expect(validateCanonicalResultDocumentV4(invalid)).toMatchObject({
      ok: false,
      failure: { message: expect.stringContaining('non-standard MathJSON operator') },
    });
  });
});
