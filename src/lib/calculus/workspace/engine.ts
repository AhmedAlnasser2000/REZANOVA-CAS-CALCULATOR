import {
  evaluateCalculusDefiniteIntegral,
  evaluateCalculusImproperIntegral,
  evaluateCalculusIndefiniteIntegral,
  type CalculusWorkspaceEvaluation,
} from './integrals';
import { evaluateCalculusLaplaceTransform } from './laplace';
import {
  evaluateCalculusFiniteLimit,
  evaluateCalculusInfiniteLimit,
} from './limits';
import {
  solveFirstOrderOde,
  solveNumericIvp,
  solveSecondOrderOde,
} from './ode';
import { evaluateCalculusPartialDerivative } from './partials';
import {
  evaluateMaclaurinSeries,
  evaluateTaylorSeries,
} from './series';
import {
  applyStoredVariableSubstitutions,
  resolveStoredValueModePolicy,
  storedValueReadbackSections,
} from '../../algebra/variable-memory';
import {
  buildDerivativeAtPointLatex,
  buildDerivativeLatex,
} from '../calculus-workbench';
import {
  evaluateCalculusHigherOrderDerivative,
  evaluateCalculusHigherOrderDerivativeAtPoint,
  evaluateCalculusMixedPartialDerivative,
} from './derivatives';
import {
  firstOrderDerivativeOperator,
  parseDerivativeOperator,
  type DerivativeOperatorKind,
} from '../derivative-operator';
import { integralVariableOrDefault } from './integral-variable';
import { runCalculateMode } from '../../modes/calculate';
import type {
  CalculusScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusInfiniteLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  AngleUnit,
  DisplayOutcome,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  FirstOrderOdeState,
  LaplaceTransformState,
  NumericIvpState,
  OutputStyle,
  PartialDerivativeWorkbenchState,
  SecondOrderOdeState,
  SeriesState,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../../types/calculator';

export type RunCalculusWorkspaceModeRequest = {
  screen: CalculusScreen;
  derivative?: DerivativeWorkbenchState;
  derivativePoint?: DerivativePointWorkbenchState;
  indefiniteIntegral: CalculusIndefiniteIntegralState;
  definiteIntegral: CalculusDefiniteIntegralState;
  improperIntegral: CalculusImproperIntegralState;
  finiteLimit: CalculusFiniteLimitState;
  infiniteLimit: CalculusInfiniteLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  laplace: LaplaceTransformState;
  partialDerivative: PartialDerivativeWorkbenchState;
  firstOrderOde: FirstOrderOdeState;
  secondOrderOde: SecondOrderOdeState;
  numericIvp: NumericIvpState;
  angleUnit?: AngleUnit;
  outputStyle?: OutputStyle;
  ansLatex?: string;
  storedVariables?: readonly StoredVariableValue[];
  variableSubstitutionSnapshot?: readonly VariableSubstitutionSnapshot[];
};

function toOutcome(title: string, evaluation: CalculusWorkspaceEvaluation): DisplayOutcome {
  if (evaluation.error) {
    return {
      kind: 'error',
      title,
      error: evaluation.error,
      warnings: evaluation.warnings,
      exactLatex: evaluation.exactLatex,
      exactSupplementLatex: evaluation.exactSupplementLatex,
      approxText: evaluation.approxText,
      detailSections: evaluation.detailSections,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex: evaluation.exactLatex,
    exactSupplementLatex: evaluation.exactSupplementLatex,
    approxText: evaluation.approxText,
    warnings: evaluation.warnings,
    resultOrigin: evaluation.resultOrigin,
    calculusStrategy: evaluation.integrationStrategy,
    calculusDerivativeStrategies: evaluation.derivativeStrategies,
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
  protectedSubstitutions: VariableSubstitutionSnapshot[],
  source: readonly StoredVariableValue[] | readonly VariableSubstitutionSnapshot[] | undefined,
  protectedNames: readonly string[],
) {
  const storedValuePolicy = resolveStoredValueModePolicy({
    mode: 'calculus',
    action: 'calculus-workspace-evaluate',
    protectedNames,
  });
  const result = storedValuePolicy.kind === 'apply'
    ? applyStoredVariableSubstitutions(latex, source, {
        protectedNames: storedValuePolicy.protectedNames,
      })
    : { latex, substitutions: [], protectedSubstitutions: [] };
  appendUniqueSubstitutions(substitutions, result.substitutions);
  appendUniqueSubstitutions(protectedSubstitutions, result.protectedSubstitutions);
  return result.latex;
}

function withStoredValueDetails(
  outcome: DisplayOutcome,
  substitutions: readonly VariableSubstitutionSnapshot[],
  protectedSubstitutions: readonly VariableSubstitutionSnapshot[],
  protectedNameDescriptions: Readonly<Record<string, string>>,
  replayedSnapshot: boolean,
): DisplayOutcome {
  const storedValueDetails = storedValueReadbackSections({
    substitutions,
    protectedSubstitutions,
    protectedNameDescriptions,
    effectiveLabel: 'Effective calculus expression',
    replayedSnapshot,
  });
  if (storedValueDetails.length === 0) {
    return outcome;
  }

  const nextOutcome = {
    ...outcome,
    detailSections: [
      ...storedValueDetails,
      ...((outcome.kind === 'prompt' ? [] : outcome.detailSections) ?? []),
    ],
  };

  return nextOutcome.kind === 'success' && substitutions.length > 0
    ? { ...nextOutcome, variableSubstitutions: [...substitutions] }
    : nextOutcome;
}

function calculusOperatorForState(
  kind: DerivativeOperatorKind,
  variable: string | undefined,
  operatorLatex: string | undefined,
) {
  return operatorLatex !== undefined
    ? parseDerivativeOperator(operatorLatex, kind)
    : firstOrderDerivativeOperator(kind, variable);
}

export async function runCalculusWorkspaceMode(
  request: RunCalculusWorkspaceModeRequest,
): Promise<DisplayOutcome> {
  const substitutionSource = request.variableSubstitutionSnapshot ?? request.storedVariables;
  const substitutions: VariableSubstitutionSnapshot[] = [];
  const protectedSubstitutions: VariableSubstitutionSnapshot[] = [];
  let protectedNameDescriptions: Record<string, string> = {};
  const substituteBody = (bodyLatex: string, protectedNames: readonly string[]) =>
    substituteLatexField(bodyLatex, substitutions, protectedSubstitutions, substitutionSource, protectedNames);
  const setProtectedDescriptions = (names: readonly string[], description: string) => {
    protectedNameDescriptions = {
      ...protectedNameDescriptions,
      ...Object.fromEntries(names.map((name) => [name, description])),
    };
  };
  let outcome: DisplayOutcome;

  switch (request.screen) {
    case 'derivative': {
      const derivative = request.derivative ?? { bodyLatex: '' };
      const operator = calculusOperatorForState('derivative', derivative.variable, derivative.operatorLatex);
      if (!operator.ok) {
        outcome = { kind: 'error', title: 'Derivative', error: operator.error, warnings: [] };
        break;
      }
      const latex = buildDerivativeLatex(derivative.bodyLatex, derivative.variable, derivative.operatorLatex);
      if (!latex) {
        outcome = {
          kind: 'error',
          title: 'Derivative',
          error: 'Enter an expression before evaluating the derivative.',
          warnings: [],
        };
        break;
      }
      if (operator.operator.order > 1) {
        const variable = operator.operator.writtenFactors[0]?.variable ?? derivative.variable ?? 'x';
        setProtectedDescriptions([variable], 'the derivative variable');
        outcome = toOutcome('Derivative', evaluateCalculusHigherOrderDerivative({
          bodyLatex: substituteBody(derivative.bodyLatex, [variable]),
          operator: operator.operator,
        }));
      } else {
        outcome = runCalculateMode({
            action: 'evaluate',
            latex,
            calculateScreen: 'derivative',
            angleUnit: request.angleUnit ?? 'rad',
            outputStyle: request.outputStyle ?? 'exact',
            ansLatex: request.ansLatex ?? '0',
            storedVariables: request.storedVariables,
            variableSubstitutionSnapshot: request.variableSubstitutionSnapshot,
          });
      }
      break;
    }
    case 'derivativePoint': {
      const derivativePoint = request.derivativePoint ?? { bodyLatex: '', point: '' };
      const operator = calculusOperatorForState(
        'derivative',
        derivativePoint.variable,
        derivativePoint.operatorLatex,
      );
      if (!operator.ok) {
        outcome = { kind: 'error', title: 'Derivative at Point', error: operator.error, warnings: [] };
        break;
      }
      const latex = buildDerivativeAtPointLatex(
        derivativePoint.bodyLatex,
        derivativePoint.point,
        derivativePoint.variable,
        derivativePoint.operatorLatex,
      );
      if (!latex) {
        outcome = {
          kind: 'error',
          title: 'Derivative at Point',
          error: 'Enter an expression and a numeric point before evaluating the derivative.',
          warnings: [],
        };
        break;
      }
      if (operator.operator.order > 1) {
        const variable = operator.operator.writtenFactors[0]?.variable ?? derivativePoint.variable ?? 'x';
        setProtectedDescriptions([variable], 'the derivative variable');
        outcome = toOutcome('Derivative at Point', evaluateCalculusHigherOrderDerivativeAtPoint({
          bodyLatex: substituteBody(derivativePoint.bodyLatex, [variable]),
          pointLatex: derivativePoint.point,
          operator: operator.operator,
        }));
      } else {
        outcome = runCalculateMode({
            action: 'evaluate',
            latex,
            calculateScreen: 'derivativePoint',
            angleUnit: request.angleUnit ?? 'rad',
            outputStyle: request.outputStyle ?? 'exact',
            ansLatex: request.ansLatex ?? '0',
            storedVariables: request.storedVariables,
            variableSubstitutionSnapshot: request.variableSubstitutionSnapshot,
          });
      }
      break;
    }
    case 'indefiniteIntegral': {
      const variable = integralVariableOrDefault(request.indefiniteIntegral.integrationVariable).id;
      setProtectedDescriptions([variable], 'the integration variable');
      const state = {
        ...request.indefiniteIntegral,
        bodyLatex: substituteBody(request.indefiniteIntegral.bodyLatex, [variable]),
      };
      outcome = toOutcome('Indefinite Integral', evaluateCalculusIndefiniteIntegral(state));
      break;
    }
    case 'definiteIntegral': {
      const variable = integralVariableOrDefault(request.definiteIntegral.integrationVariable).id;
      setProtectedDescriptions([variable], 'the integration variable');
      const state = {
        ...request.definiteIntegral,
        bodyLatex: substituteBody(request.definiteIntegral.bodyLatex, [variable]),
      };
      outcome = toOutcome('Definite Integral', evaluateCalculusDefiniteIntegral(state));
      break;
    }
    case 'improperIntegral': {
      const variable = integralVariableOrDefault(request.improperIntegral.integrationVariable).id;
      setProtectedDescriptions([variable], 'the integration variable');
      const state = {
        ...request.improperIntegral,
        bodyLatex: substituteBody(request.improperIntegral.bodyLatex, [variable]),
      };
      outcome = toOutcome('Improper Integral', evaluateCalculusImproperIntegral(state));
      break;
    }
    case 'finiteLimit': {
      setProtectedDescriptions(['x'], 'the limit variable');
      const state = {
        ...request.finiteLimit,
        bodyLatex: substituteBody(request.finiteLimit.bodyLatex, ['x']),
      };
      outcome = toOutcome('Finite Limit', evaluateCalculusFiniteLimit(state));
      break;
    }
    case 'infiniteLimit': {
      setProtectedDescriptions(['x'], 'the limit variable');
      const state = {
        ...request.infiniteLimit,
        bodyLatex: substituteBody(request.infiniteLimit.bodyLatex, ['x']),
      };
      outcome = toOutcome('Infinite Limit', evaluateCalculusInfiniteLimit(state));
      break;
    }
    case 'maclaurin': {
      setProtectedDescriptions(['x'], 'the series variable');
      const state = {
        ...request.maclaurin,
        bodyLatex: substituteBody(request.maclaurin.bodyLatex, ['x']),
      };
      outcome = toOutcome('Maclaurin Series', evaluateMaclaurinSeries(state));
      break;
    }
    case 'taylor': {
      setProtectedDescriptions(['x'], 'the series variable');
      const state = {
        ...request.taylor,
        bodyLatex: substituteBody(request.taylor.bodyLatex, ['x']),
      };
      outcome = toOutcome('Taylor Series', evaluateTaylorSeries(state));
      break;
    }
    case 'laplace': {
      setProtectedDescriptions(['t'], 'the Laplace source variable');
      setProtectedDescriptions(['s'], 'the Laplace transform variable');
      const state = {
        ...request.laplace,
        bodyLatex: substituteBody(request.laplace.bodyLatex, ['t', 's']),
      };
      outcome = toOutcome('Laplace Transform', evaluateCalculusLaplaceTransform(state));
      break;
    }
    case 'partialDerivative': {
      const operator = calculusOperatorForState(
        'partial',
        request.partialDerivative.variable,
        request.partialDerivative.operatorLatex,
      );
      if (!operator.ok) {
        outcome = {
          kind: 'error',
          title: 'Partial Derivative',
          error: operator.error,
          warnings: [],
        };
        break;
      }
      if (operator.operator.order > 1) {
        const partialVariables = [...new Set(operator.operator.appliedPath)];
        setProtectedDescriptions(partialVariables, 'a partial derivative variable');
        outcome = toOutcome('Partial Derivative', evaluateCalculusMixedPartialDerivative({
          bodyLatex: substituteBody(request.partialDerivative.bodyLatex, partialVariables),
          operator: operator.operator,
        }));
        break;
      }
      const partialVariable = operator.operator.writtenFactors[0]?.variable ?? request.partialDerivative.variable;
      setProtectedDescriptions([partialVariable], 'the partial derivative variable');
      const state = {
        ...request.partialDerivative,
        variable: partialVariable,
        bodyLatex: substituteBody(request.partialDerivative.bodyLatex, [partialVariable]),
      };
      outcome = toOutcome('Partial Derivative', evaluateCalculusPartialDerivative(state));
      break;
    }
    case 'odeFirstOrder': {
      setProtectedDescriptions(['x'], 'the independent ODE variable');
      setProtectedDescriptions(['y'], 'the dependent ODE variable');
      const state = {
        ...request.firstOrderOde,
        lhsLatex: substituteBody(request.firstOrderOde.lhsLatex, ['x', 'y']),
        rhsLatex: substituteBody(request.firstOrderOde.rhsLatex, ['x', 'y']),
      };
      outcome = toOutcome('First-Order ODE', solveFirstOrderOde(state));
      break;
    }
    case 'odeSecondOrder': {
      setProtectedDescriptions(['x'], 'the independent ODE variable');
      setProtectedDescriptions(['y'], 'the dependent ODE variable');
      const state = {
        ...request.secondOrderOde,
        forcingLatex: substituteBody(request.secondOrderOde.forcingLatex, ['x', 'y']),
      };
      outcome = toOutcome('Second-Order ODE', solveSecondOrderOde(state));
      break;
    }
    case 'odeNumericIvp': {
      setProtectedDescriptions(['x'], 'the independent ODE variable');
      setProtectedDescriptions(['y'], 'the dependent ODE variable');
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
        title: 'Calculus',
        error: 'Choose an Calculus tool before evaluating.',
        warnings: [],
      };
  }

  return withStoredValueDetails(
    outcome,
    substitutions,
    protectedSubstitutions,
    protectedNameDescriptions,
    Boolean(request.variableSubstitutionSnapshot),
  );
}
