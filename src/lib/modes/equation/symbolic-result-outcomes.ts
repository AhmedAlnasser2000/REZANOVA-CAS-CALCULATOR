import type { ResultProducerDraft } from '../../../types/calculator';
import type { SelectedTargetIsolationSuccess } from '../../equation/equation-selected-target-isolation';
import type { PolynomialCarrierSolveAttempt } from '../../equation/polynomial-carrier-follow-on';
import {
  createExactFiniteRoot,
  createRootSet,
  rootSetToCanonicalMath,
} from '../../equation/roots/representation';
import {
  createEquationResultOutcome,
  equationMathValuesWithOwnedReadback,
} from '../../equation/equation-solve-result';
import { solutionsToLatex } from '../../display/format';

export function createSelectedTargetIsolationOutcome(
  isolated: SelectedTargetIsolationSuccess,
): ResultProducerDraft {
  const input = {
    kind: 'success' as const,
    title: 'Solve',
    exactLatex: isolated.exactLatex,
    exactSupplementLatex: isolated.exactSupplementLatex,
    detailSections: isolated.detailSections,
    warnings: [],
    resultOrigin: 'symbolic' as const,
  };
  return createEquationResultOutcome(input, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome: input,
      routeId: 'equation.answer-mode',
      leaves: isolated.mathJsonLeaves ?? [],
    }),
  });
}

export function createSymbolicPolynomialCarrierOutcome(
  attempt: Extract<PolynomialCarrierSolveAttempt, { kind: 'solved' }>,
): ResultProducerDraft {
  const exactSolutions = attempt.roots.map((root) => root.latex);
  const exactLatex = exactSolutions.length > 0 ? solutionsToLatex('x', exactSolutions) : undefined;
  const rootSet = createRootSet({
    target: 'x',
    source: 'equation-polynomial-carrier',
    entries: attempt.roots.map((root) => createExactFiniteRoot(root.latex, {
      source: 'equation-polynomial-carrier',
      ...(root.node !== undefined ? { node: root.node } : {}),
    })),
  });
  const renderedCanonicalMath = rootSetToCanonicalMath(rootSet);
  const primaryMath = exactLatex && renderedCanonicalMath?.mathJson !== undefined
    ? { ...renderedCanonicalMath, canonicalLatex: exactLatex }
    : undefined;
  return createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex,
    ...(primaryMath ? { primaryMath } : {}),
    exactSupplementLatex: attempt.exactSupplementLatex?.length
      ? attempt.exactSupplementLatex
      : undefined,
    approxText: attempt.roots.length > 0
      ? `x \\approx ${attempt.roots.map((root) => root.numeric.toPrecision(8)).join(', ')}`
      : undefined,
    warnings: [],
    resultOrigin: 'symbolic',
  });
}
