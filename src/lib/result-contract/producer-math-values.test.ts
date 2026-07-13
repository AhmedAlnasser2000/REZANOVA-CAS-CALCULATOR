import { describe, expect, it } from 'vitest';
import { createCalculusResultOutcome } from '../calculus/workspace/result-document';
import { createEquationResultOutcome } from '../equation/equation-solve-result';
import { createGeometryResultOutcome } from '../geometry/result-document';
import { buildCalculateResultDocument } from '../modes/calculate/result-document';
import { createMatrixResultOutcome } from '../modes/matrix-result-document';
import { createTableResultOutcome } from '../modes/table-result-document';
import { createVectorResultOutcome } from '../modes/vector-result-document';
import { createStatisticsResultOutcome } from '../statistics/result-document';
import { createTrigonometryResultOutcome } from '../trigonometry/result-document';
import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import {
  canonicalMathValueFromProof,
  declareProducerOwnedAnswerMathJson,
  proveAnswerMathJson,
} from './proven-answer-mathjson';
import { resolveCanonicalResultForStorage } from './storage';

const proof = proveAnswerMathJson({
  canonicalLatex: 'x=1',
  candidate: declareProducerOwnedAnswerMathJson({
    mathJson: ['Equal', 'x', 1],
    owner: 'equation',
    routeId: 'equation.linear',
    source: 'workspace-adapter-test',
  }),
});
if (!proof.ok) throw new Error(proof.failure.message);
const primaryMath = canonicalMathValueFromProof(proof.evidence);
const options = { mathValues: { primaryMath } } as const;
const success = {
  kind: 'success' as const,
  title: 'Typed producer value',
  exactLatex: 'x=1',
  warnings: [],
};

function expectNativeProvenPrimary(
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
  tableResponse?: TableResponse,
) {
  expect(outcome.canonicalResult?.primaryMath).toEqual(primaryMath);
  expect(resolveCanonicalResultForStorage(outcome, { tableResponse }))
    .toMatchObject({ ok: true, source: 'native' });
}

describe('workspace canonical producer math values', () => {
  it('passes direct proven values through Calculate, Equation, and Calculus owners', () => {
    const calculate = buildCalculateResultDocument({
      outcomeKind: 'success',
      title: success.title,
      exactLatex: success.exactLatex,
      warnings: [],
    }, options);
    expect(calculate.primaryMath).toEqual(primaryMath);

    expectNativeProvenPrimary(createEquationResultOutcome(success, options));
    expectNativeProvenPrimary(createCalculusResultOutcome(success, options));
  });

  it('passes direct proven values through guided-domain owners', () => {
    expectNativeProvenPrimary(createTrigonometryResultOutcome(success, options));
    expectNativeProvenPrimary(createGeometryResultOutcome(success, options));
    expectNativeProvenPrimary(createStatisticsResultOutcome(success, options));

    const response: TableResponse = {
      headers: ['x', 'f(x)'],
      rows: [{ x: '1', primary: '1' }],
      warnings: [],
    };
    expectNativeProvenPrimary(createTableResultOutcome(success, response, options), response);
  });

  it('passes direct proven values through independent Matrix and Vector owners', () => {
    expectNativeProvenPrimary(createMatrixResultOutcome(success, options));
    expectNativeProvenPrimary(createVectorResultOutcome(success, options));
  });
});
