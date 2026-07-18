import type {
  DisplayAnswerRowsReadback,
  DisplaySystemSolutionReadback,
  ResultProducerDraft,
} from '../../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  type CanonicalResultProducerMathValuesV1,
  type ProvenCanonicalMathValue,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import type { EquationOwnedMathJsonLeaf } from './math-values';
import { equationMathValuesFromOwnedLeaves as baseEquationMathValuesFromOwnedLeaves } from './math-values';

// Changed Equation producers use this bridge without widening frozen V1 adapters.
export {
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
} from './math-values';
export type {
  EquationMathJsonRouteId,
  EquationOwnedMathJsonLeaf,
} from './math-values';

type EquationOutcome = Omit<Exclude<ResultProducerDraft, { kind: 'prompt' }>, 'canonicalResult'>;
type EquationMathJsonRouteId = Extract<MathJsonRouteId, `equation.${string}`>;
type EquationSuccessWithReadback = EquationOutcome & {
  answerRows?: DisplayAnswerRowsReadback;
  systemReadback?: DisplaySystemSolutionReadback;
};

function provenLeaves(input: {
  outcome: EquationOutcome;
  routeId: EquationMathJsonRouteId;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}) {
  const values = new Map<string, ProvenCanonicalMathValue>();
  const primary = input.outcome.primaryMath?.mathJson === undefined
    ? undefined
    : tryProvenCanonicalMathValue({
      canonicalLatex: input.outcome.primaryMath.canonicalLatex,
      mathJson: input.outcome.primaryMath.mathJson,
      owner: 'equation',
      routeId: input.routeId,
      source: 'equation-readback-primary-authority',
    });
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'equation',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (!value) continue;
    const existing = values.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      if (primary && leaf.canonicalLatex === primary.canonicalLatex) {
        values.set(leaf.canonicalLatex, primary);
        continue;
      }
      throw new Error(`Equation producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    values.set(leaf.canonicalLatex, value);
  }
  if (primary) values.set(primary.canonicalLatex, primary);
  return values;
}

function unproven(canonicalLatex: string) {
  return { canonicalLatex };
}

export function equationMathValuesWithOwnedReadback(input: {
  outcome: EquationOutcome;
  routeId: EquationMathJsonRouteId;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const values = baseEquationMathValuesFromOwnedLeaves(input);
  const proven = provenLeaves(input);
  if (input.outcome.primaryMath?.mathJson !== undefined) {
    values.primaryMath = proven.get(input.outcome.primaryMath.canonicalLatex)
      ?? unproven(input.outcome.primaryMath.canonicalLatex);
  }
  if (input.outcome.kind !== 'success') return values;
  const success = input.outcome as EquationSuccessWithReadback;
  if (success.answerRows) {
    values.answerRows = {
      ...(success.answerRows.label ? { label: success.answerRows.label } : {}),
      rows: success.answerRows.rows.map((row) => ({
        math: proven.get(row.latex) ?? unproven(row.latex),
        ...(row.label ? { label: row.label } : {}),
      })),
    };
  }
  if (success.systemReadback) {
    values.systemReadback = {
      variables: success.systemReadback.variablesLatex.map((latex) => proven.get(latex) ?? unproven(latex)),
      rows: success.systemReadback.rows.map((row) => ({
        values: row.valuesLatex.map((latex) => proven.get(latex) ?? unproven(latex)),
        ...(row.approxText ? { approxText: row.approxText } : {}),
      })),
      ...(success.systemReadback.label ? { label: success.systemReadback.label } : {}),
      ...(success.systemReadback.source ? { source: success.systemReadback.source } : {}),
    };
  }
  return values;
}
