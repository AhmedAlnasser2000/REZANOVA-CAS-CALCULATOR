import type { ResultProducerDraft } from '../../../types/calculator';
import type { EquationAlgebraicIsolationSuccess } from '../../equation/equation-algebraic-isolation';
import type { ParameterizedCarrierSolveSuccess } from '../../equation/parameterized/carrier';
import type { ParameterizedExpLogSolveSuccess } from '../../equation/parameterized/exp-log';
import type { ParameterizedTrigSolveSuccess } from '../../equation/parameterized/trig';
import {
  createEquationFiniteRootSuccessOutcome,
  createEquationResultOutcome,
  equationMathValuesWithOwnedReadback,
} from '../../equation/equation-solve-result';

export function createBoundedComplexEquationOutcome(
  result: EquationAlgebraicIsolationSuccess,
  source: string,
): ResultProducerDraft {
  const input = {
    title: 'Solve',
    exactLatex: result.exactLatex,
    branchReadback: result.branchReadback,
    approxText: result.approxText,
    exactSupplementLatex: result.exactSupplementLatex,
    detailSections: result.detailSections,
    warnings: [],
    resultOrigin: 'symbolic' as const,
    answerDomain: 'complex' as const,
  };
  return result.primaryMath
    ? createEquationFiniteRootSuccessOutcome({
        ...input,
        primaryMath: result.primaryMath,
        mathJsonRouteId: 'equation.domain-boundary',
        mathJsonSource: source,
      })
    : createEquationResultOutcome({ kind: 'success', ...input });
}

export function createParameterizedCarrierOutcome(
  result: ParameterizedCarrierSolveSuccess,
  sourceEquationLatex: string,
): ResultProducerDraft {
  const input = {
    title: 'Solve',
    exactLatex: result.exactLatex,
    branchReadback: result.branchReadback,
    exactSupplementLatex: result.exactSupplementLatex,
    detailSections: result.detailSections,
    warnings: [],
    resultOrigin: 'symbolic' as const,
  };
  return result.primaryMath
    ? createEquationFiniteRootSuccessOutcome({
        ...input,
        primaryMath: result.primaryMath,
        mathJsonRouteId: /\\vert|\\left\|/u.test(sourceEquationLatex)
          ? 'equation.absolute-value'
          : 'equation.rational-radical',
        mathJsonSource: 'equation-parameterized-carrier-branches',
      })
    : createEquationResultOutcome({ kind: 'success', ...input });
}

function createExpLogOrTrigOutcome(
  result: ParameterizedExpLogSolveSuccess | ParameterizedTrigSolveSuccess,
  source: string,
): ResultProducerDraft {
  const input = {
    kind: 'success' as const,
    title: 'Solve',
    exactLatex: result.exactLatex,
    branchReadback: result.branchReadback,
    exactSupplementLatex: result.exactSupplementLatex,
    detailSections: result.detailSections,
    warnings: [],
    resultOrigin: 'symbolic' as const,
    ...(result.answerDomain ? { answerDomain: result.answerDomain } : {}),
    ...('approxText' in result ? { approxText: result.approxText } : {}),
  };
  const supplemental = equationMathValuesWithOwnedReadback({
    outcome: input,
    routeId: 'equation.trig-exp-log',
    leaves: result.mathJsonLeaves ?? [],
  });
  return result.primaryMath
    ? createEquationFiniteRootSuccessOutcome({
        ...input,
        primaryMath: result.primaryMath,
        mathJsonRouteId: 'equation.trig-exp-log',
        mathJsonSource: source,
      }, {
        mathValues: supplemental.supplements
          ? { supplements: supplemental.supplements }
          : undefined,
      })
    : createEquationResultOutcome(input);
}

export function createParameterizedExpLogOutcome(result: ParameterizedExpLogSolveSuccess) {
  return createExpLogOrTrigOutcome(result, 'equation-parameterized-exp-log-answer');
}

export function createParameterizedTrigOutcome(result: ParameterizedTrigSolveSuccess) {
  return createExpLogOrTrigOutcome(result, 'equation-parameterized-trig-answer');
}
