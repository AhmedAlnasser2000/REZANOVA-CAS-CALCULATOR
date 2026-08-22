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
import {
  equationMathValuesFromOwnedLeaves as baseEquationMathValuesFromOwnedLeaves,
  inferEquationMathJsonRoute as inferBaseEquationMathJsonRoute,
} from './math-values';

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
type EquationSuccessWithReadback = Omit<
  Extract<ResultProducerDraft, { kind: 'success' }>,
  'canonicalResult'
> & {
  answerRows?: DisplayAnswerRowsReadback;
  systemReadback?: DisplaySystemSolutionReadback;
};
type EquationSuccessReadback = Omit<
  EquationSuccessWithReadback,
  'kind' | 'title' | 'warnings'
>;

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

function successReadbackMathValues(input: {
  readback: EquationSuccessReadback;
  routeId: EquationMathJsonRouteId;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const outcome = input.readback as unknown as EquationOutcome;
  const values = baseEquationMathValuesFromOwnedLeaves({
    outcome,
    routeId: input.routeId,
    leaves: input.leaves,
  });
  const proven = provenLeaves({ outcome, routeId: input.routeId, leaves: input.leaves });
  if (input.readback.primaryMath?.mathJson !== undefined) {
    values.primaryMath = proven.get(input.readback.primaryMath.canonicalLatex)
      ?? unproven(input.readback.primaryMath.canonicalLatex);
  }
  if (input.readback.answerRows) {
    values.answerRows = {
      ...(input.readback.answerRows.label ? { label: input.readback.answerRows.label } : {}),
      rows: input.readback.answerRows.rows.map((row) => ({
        math: proven.get(row.latex) ?? unproven(row.latex),
        ...(row.label ? { label: row.label } : {}),
      })),
    };
  }
  if (input.readback.systemReadback) {
    values.systemReadback = {
      variables: input.readback.systemReadback.variablesLatex.map((latex) =>
        proven.get(latex) ?? unproven(latex)),
      rows: input.readback.systemReadback.rows.map((row) => ({
        values: row.valuesLatex.map((latex) => proven.get(latex) ?? unproven(latex)),
        ...(row.approxText ? { approxText: row.approxText } : {}),
      })),
      ...(input.readback.systemReadback.label ? { label: input.readback.systemReadback.label } : {}),
      ...(input.readback.systemReadback.source ? { source: input.readback.systemReadback.source } : {}),
    };
  }
  return values;
}

export function equationMathValuesForOwnedSuccessReadback(input: {
  readback: EquationSuccessReadback;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const routeId = inferBaseEquationMathJsonRoute(input.readback as unknown as EquationOutcome);
  return successReadbackMathValues({ ...input, routeId });
}

export function equationMathValuesWithOwnedReadback(input: {
  outcome: EquationOutcome;
  routeId: EquationMathJsonRouteId;
  leaves: readonly EquationOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  if (input.outcome.kind === 'success') {
    const { kind: _kind, title: _title, warnings: _warnings, ...readback } = input.outcome;
    return successReadbackMathValues({
      readback,
      routeId: input.routeId,
      leaves: input.leaves,
    });
  }
  const values = baseEquationMathValuesFromOwnedLeaves(input);
  const proven = provenLeaves(input);
  if (input.outcome.primaryMath?.mathJson !== undefined) {
    values.primaryMath = proven.get(input.outcome.primaryMath.canonicalLatex)
      ?? unproven(input.outcome.primaryMath.canonicalLatex);
  }
  return values;
}
