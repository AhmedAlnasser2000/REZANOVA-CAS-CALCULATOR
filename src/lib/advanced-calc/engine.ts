import {
  evaluateAdvancedDefiniteIntegral,
  evaluateAdvancedImproperIntegral,
  evaluateAdvancedIndefiniteIntegral,
  type AdvancedCalcEvaluation,
} from './integrals';
import {
  evaluateAdvancedFiniteLimit,
  evaluateAdvancedInfiniteLimit,
} from './limits';
import {
  solveFirstOrderOde,
  solveNumericIvp,
  solveSecondOrderOde,
} from './ode';
import { evaluateAdvancedPartialDerivative } from './partials';
import {
  evaluateMaclaurinSeries,
  evaluateTaylorSeries,
} from './series';
import type {
  AdvancedCalcScreen,
  AdvancedDefiniteIntegralState,
  AdvancedFiniteLimitState,
  AdvancedInfiniteLimitState,
  AdvancedImproperIntegralState,
  AdvancedIndefiniteIntegralState,
  DisplayOutcome,
  FirstOrderOdeState,
  NumericIvpState,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
} from '../../types/calculator';

type RunAdvancedCalcModeRequest = {
  screen: AdvancedCalcScreen;
  indefiniteIntegral: AdvancedIndefiniteIntegralState;
  definiteIntegral: AdvancedDefiniteIntegralState;
  improperIntegral: AdvancedImproperIntegralState;
  finiteLimit: AdvancedFiniteLimitState;
  infiniteLimit: AdvancedInfiniteLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  partialDerivative: PartialDerivativeWorkbenchState;
  firstOrderOde: FirstOrderOdeState;
  secondOrderOde: SecondOrderOdeState;
  numericIvp: NumericIvpState;
};

function toOutcome(title: string, evaluation: AdvancedCalcEvaluation): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      approxText: evaluation.approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
  };
}

export async function runAdvancedCalcMode(
  request: RunAdvancedCalcModeRequest,
): Promise<DisplayOutcome> {
  switch (request.screen) {
    case 'indefiniteIntegral':
      return toOutcome('Indefinite Integral', evaluateAdvancedIndefiniteIntegral(request.indefiniteIntegral));
    case 'definiteIntegral':
      return toOutcome('Definite Integral', evaluateAdvancedDefiniteIntegral(request.definiteIntegral));
    case 'improperIntegral':
      return toOutcome('Improper Integral', evaluateAdvancedImproperIntegral(request.improperIntegral));
    case 'finiteLimit':
      return toOutcome('Finite Limit', evaluateAdvancedFiniteLimit(request.finiteLimit));
    case 'infiniteLimit':
      return toOutcome('Infinite Limit', evaluateAdvancedInfiniteLimit(request.infiniteLimit));
    case 'maclaurin':
      return toOutcome('Maclaurin Series', evaluateMaclaurinSeries(request.maclaurin));
    case 'taylor':
      return toOutcome('Taylor Series', evaluateTaylorSeries(request.taylor));
    case 'partialDerivative':
      return toOutcome('Partial Derivative', evaluateAdvancedPartialDerivative(request.partialDerivative));
    case 'odeFirstOrder':
      return toOutcome('First-Order ODE', solveFirstOrderOde(request.firstOrderOde));
    case 'odeSecondOrder':
      return toOutcome('Second-Order ODE', solveSecondOrderOde(request.secondOrderOde));
    case 'odeNumericIvp':
      return toOutcome('Numeric IVP', await solveNumericIvp(request.numericIvp));
    default:
      return {
        kind: 'error',
        title: 'Advanced Calc',
        error: 'Choose an Advanced Calc tool before evaluating.',
        warnings: [],
      };
  }
}
