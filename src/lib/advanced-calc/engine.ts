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
import {
  applyStoredVariableSubstitutions,
  storedValuesDetailSection,
} from '../algebra/variable-memory';
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
  StoredVariableValue,
  VariableSubstitutionSnapshot,
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
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
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
      detailSections: evaluation.detailSections,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
    calculusStrategy: evaluation.integrationStrategy,
    detailSections: evaluation.detailSections,
  };
}

function appendUniqueSubstitutions(
  target: VariableSubstitutionSnapshot[],
  substitutions: readonly VariableSubstitutionSnapshot[],
) {
  for (const substitution of substitutions) {
    if (!target.some((entry) => entry.name === substitution.name)) {
      target.push(substitution);
    }
  }
}

function substituteLatexField(
  latex: string,
  substitutions: VariableSubstitutionSnapshot[],
  source: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
) {
  const result = applyStoredVariableSubstitutions(latex, source, { protectedNames });
  appendUniqueSubstitutions(substitutions, result.substitutions);
  return result.latex;
}

function withStoredValueDetails(
  outcome: DisplayOutcome,
  substitutions: readonly VariableSubstitutionSnapshot[],
): DisplayOutcome {
  const storedValuesDetail = storedValuesDetailSection(substitutions, 'Advanced Calc expression');
  if (!storedValuesDetail) {
    return outcome;
  }

  const nextOutcome = {
    ...outcome,
    detailSections: [
      storedValuesDetail,
      ...((outcome.kind === 'prompt' ? [] : outcome.detailSections) ?? []),
    ],
  };

  return nextOutcome.kind === 'success'
    ? { ...nextOutcome, variableSubstitutions: [...substitutions] }
    : nextOutcome;
}

export async function runAdvancedCalcMode(
  request: RunAdvancedCalcModeRequest,
): Promise<DisplayOutcome> {
  const substitutionSource = request.variableSubstitutionSnapshot ?? request.storedVariables;
  const substitutions: VariableSubstitutionSnapshot[] = [];
  const substituteBody = (bodyLatex: string, protectedNames: readonly string[]) =>
    substituteLatexField(bodyLatex, substitutions, substitutionSource, protectedNames);
  let outcome: DisplayOutcome;

  switch (request.screen) {
    case 'indefiniteIntegral': {
      const state = {
        ...request.indefiniteIntegral,
        bodyLatex: substituteBody(request.indefiniteIntegral.bodyLatex, ['x']),
      };
      outcome = toOutcome('Indefinite Integral', evaluateAdvancedIndefiniteIntegral(state));
      break;
    }
    case 'definiteIntegral': {
      const state = {
        ...request.definiteIntegral,
        bodyLatex: substituteBody(request.definiteIntegral.bodyLatex, ['x']),
      };
      outcome = toOutcome('Definite Integral', evaluateAdvancedDefiniteIntegral(state));
      break;
    }
    case 'improperIntegral': {
      const state = {
        ...request.improperIntegral,
        bodyLatex: substituteBody(request.improperIntegral.bodyLatex, ['x']),
      };
      outcome = toOutcome('Improper Integral', evaluateAdvancedImproperIntegral(state));
      break;
    }
    case 'finiteLimit': {
      const state = {
        ...request.finiteLimit,
        bodyLatex: substituteBody(request.finiteLimit.bodyLatex, ['x']),
      };
      outcome = toOutcome('Finite Limit', evaluateAdvancedFiniteLimit(state));
      break;
    }
    case 'infiniteLimit': {
      const state = {
        ...request.infiniteLimit,
        bodyLatex: substituteBody(request.infiniteLimit.bodyLatex, ['x']),
      };
      outcome = toOutcome('Infinite Limit', evaluateAdvancedInfiniteLimit(state));
      break;
    }
    case 'maclaurin': {
      const state = {
        ...request.maclaurin,
        bodyLatex: substituteBody(request.maclaurin.bodyLatex, ['x']),
      };
      outcome = toOutcome('Maclaurin Series', evaluateMaclaurinSeries(state));
      break;
    }
    case 'taylor': {
      const state = {
        ...request.taylor,
        bodyLatex: substituteBody(request.taylor.bodyLatex, ['x']),
      };
      outcome = toOutcome('Taylor Series', evaluateTaylorSeries(state));
      break;
    }
    case 'partialDerivative': {
      const state = {
        ...request.partialDerivative,
        bodyLatex: substituteBody(request.partialDerivative.bodyLatex, [request.partialDerivative.variable]),
      };
      outcome = toOutcome('Partial Derivative', evaluateAdvancedPartialDerivative(state));
      break;
    }
    case 'odeFirstOrder': {
      const state = {
        ...request.firstOrderOde,
        lhsLatex: substituteBody(request.firstOrderOde.lhsLatex, ['x', 'y']),
        rhsLatex: substituteBody(request.firstOrderOde.rhsLatex, ['x', 'y']),
      };
      outcome = toOutcome('First-Order ODE', solveFirstOrderOde(state));
      break;
    }
    case 'odeSecondOrder': {
      const state = {
        ...request.secondOrderOde,
        forcingLatex: substituteBody(request.secondOrderOde.forcingLatex, ['x', 'y']),
      };
      outcome = toOutcome('Second-Order ODE', solveSecondOrderOde(state));
      break;
    }
    case 'odeNumericIvp': {
      const state = {
        ...request.numericIvp,
        bodyLatex: substituteBody(request.numericIvp.bodyLatex, ['x', 'y']),
      };
      outcome = toOutcome('Numeric IVP', await solveNumericIvp(state));
      break;
    }
    default:
      outcome = {
        kind: 'error',
        title: 'Advanced Calc',
        error: 'Choose an Advanced Calc tool before evaluating.',
        warnings: [],
      };
  }

  return withStoredValueDetails(outcome, substitutions);
}
