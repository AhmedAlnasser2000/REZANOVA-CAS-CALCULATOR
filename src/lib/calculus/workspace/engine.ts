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
  evaluateCalculusLimit,
} from './limits';
import { evaluateCalculusImplicitDerivative } from './implicit-derivative';
import {
  createCalculusResultOutcome,
  hasNativeCalculusResultDocument,
} from './result-document';
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
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../../numeric/signed-number';
import { buildDerivativeLatex } from '../calculus-workbench';
import {
  buildCalculusDerivativeStepsDetail,
  evaluateCalculusHigherOrderDerivative,
  evaluateCalculusHigherOrderDerivativeAtPoint,
  evaluateCalculusMixedPartialDerivative,
} from './derivatives';
import {
  buildDerivativeAtPointRequestLatex,
  buildDerivativeRequestLatex,
  firstOrderDerivativeOperator,
  parseDerivativeOperator,
  type DerivativeOperatorKind,
  type DerivativeOperatorSpec,
} from '../derivative-operator';
import { parseNaturalDerivativeRequest } from '../derivative-request';
import {
  buildNaturalLimitRequestLatex,
  parseNaturalLimitRequest,
} from '../limit-request';
import {
  analyzeNaturalLimitVariables,
  limitVariableMismatchDetails,
  limitVariableMismatchError,
} from '../limit-variable-analysis';
import { integralVariableOrDefault } from './integral-variable';
import { runCalculateMode } from '../../modes/calculate';
import { requireCanonicalResultAuthority } from '../../result-contract';
import type {
  CalculusScreen,
  CalculusDefiniteIntegralState,
  CalculusFiniteLimitState,
  CalculusInfiniteLimitState,
  CalculusLimitState,
  CalculusImproperIntegralState,
  CalculusIndefiniteIntegralState,
  AngleUnit,
  DisplayOutcome,
  EquationDomainIntent,
  DerivativePointWorkbenchState,
  DerivativeWorkbenchState,
  FirstOrderOdeState,
  ImplicitDerivativeState,
  LaplaceTransformState,
  NumericIvpState,
  OutputStyle,
  DisplayDetailSection,
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
  implicitDerivative?: ImplicitDerivativeState;
  indefiniteIntegral: CalculusIndefiniteIntegralState;
  definiteIntegral: CalculusDefiniteIntegralState;
  improperIntegral: CalculusImproperIntegralState;
  finiteLimit: CalculusFiniteLimitState;
  infiniteLimit: CalculusInfiniteLimitState;
  limit: CalculusLimitState;
  maclaurin: SeriesState;
  taylor: SeriesState;
  laplace: LaplaceTransformState;
  partialDerivative: PartialDerivativeWorkbenchState;
  firstOrderOde: FirstOrderOdeState;
  secondOrderOde: SecondOrderOdeState;
  numericIvp: NumericIvpState;
  angleUnit?: AngleUnit;
  outputStyle?: OutputStyle;
  equationDomainIntent?: EquationDomainIntent;
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
    answerRows: evaluation.answerRows,
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
  if (nextOutcome.kind !== 'prompt') {
    delete nextOutcome.canonicalResult;
  }

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

type ParsedCalculusDerivativeInput =
  | {
      ok: true;
      bodyLatex: string;
      operator: DerivativeOperatorSpec;
      canonicalLatex: string;
    }
  | { ok: false; error: string };

function calculusDerivativeInputForState(
  kind: DerivativeOperatorKind,
  bodyLatex: string,
  variable: string | undefined,
  operatorLatex: string | undefined,
): ParsedCalculusDerivativeInput {
  const natural = parseNaturalDerivativeRequest(bodyLatex, kind);
  if (natural.ok) {
    return {
      ok: true,
      bodyLatex: natural.request.bodyLatex,
      operator: natural.request.operator,
      canonicalLatex: natural.request.canonicalLatex,
    };
  }
  if (natural.looksLikeDerivativeRequest) {
    return { ok: false, error: natural.error };
  }

  const operator = calculusOperatorForState(kind, variable, operatorLatex);
  if (!operator.ok) {
    return { ok: false, error: operator.error };
  }

  const canonicalLatex = kind === 'derivative'
    ? buildDerivativeLatex(bodyLatex, variable, operatorLatex)
    : buildDerivativeRequestLatex(bodyLatex.trim(), operator.operator);
  if (!canonicalLatex) {
    return { ok: false, error: 'Enter an expression before evaluating the derivative.' };
  }

  return {
    ok: true,
    bodyLatex,
    operator: operator.operator,
    canonicalLatex,
  };
}

function normalizePointDraft(pointLatex: string) {
  const parsed = parseSignedNumberInput(pointLatex);
  return parsed === null ? '' : formatSignedNumberInput(parsed);
}

function withDerivativeSteps(
  outcome: DisplayOutcome,
  detailSection: DisplayDetailSection | undefined,
): DisplayOutcome {
  if (!detailSection || outcome.kind !== 'success') {
    return outcome;
  }

  const nextOutcome = {
    ...outcome,
    detailSections: [
      ...(outcome.detailSections ?? []),
      detailSection,
    ],
  };
  delete nextOutcome.canonicalResult;
  return nextOutcome;
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
      const derivativeInput = calculusDerivativeInputForState(
        'derivative',
        derivative.bodyLatex,
        derivative.variable,
        derivative.operatorLatex,
      );
      if (!derivativeInput.ok) {
        outcome = {
          kind: 'error',
          title: 'Derivative',
          error: derivativeInput.error,
          warnings: [],
        };
        break;
      }
      if (derivativeInput.operator.order > 1) {
        const variable = derivativeInput.operator.writtenFactors[0]?.variable ?? derivative.variable ?? 'x';
        setProtectedDescriptions([variable], 'the derivative variable');
        outcome = toOutcome('Derivative', evaluateCalculusHigherOrderDerivative({
          bodyLatex: substituteBody(derivativeInput.bodyLatex, [variable]),
          operator: derivativeInput.operator,
        }));
      } else {
        outcome = withDerivativeSteps(
          runCalculateMode({
            action: 'evaluate',
            latex: derivativeInput.canonicalLatex,
            calculateScreen: 'derivative',
            angleUnit: request.angleUnit ?? 'rad',
            outputStyle: request.outputStyle ?? 'exact',
            ansLatex: request.ansLatex ?? '0',
            storedVariables: request.storedVariables,
            variableSubstitutionSnapshot: request.variableSubstitutionSnapshot,
          }),
          buildCalculusDerivativeStepsDetail({
            bodyLatex: derivativeInput.bodyLatex,
            operator: derivativeInput.operator,
          }),
        );
      }
      break;
    }
    case 'derivativePoint': {
      const derivativePoint = request.derivativePoint ?? { bodyLatex: '', point: '' };
      const derivativeInput = calculusDerivativeInputForState(
        'derivative',
        derivativePoint.bodyLatex,
        derivativePoint.variable,
        derivativePoint.operatorLatex,
      );
      if (!derivativeInput.ok) {
        outcome = { kind: 'error', title: 'Derivative at Point', error: derivativeInput.error, warnings: [] };
        break;
      }
      const normalizedPoint = normalizePointDraft(derivativePoint.point);
      const latex = buildDerivativeAtPointRequestLatex(
        derivativeInput.bodyLatex,
        normalizedPoint,
        derivativeInput.operator,
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
      if (derivativeInput.operator.order > 1) {
        const variable = derivativeInput.operator.writtenFactors[0]?.variable ?? derivativePoint.variable ?? 'x';
        setProtectedDescriptions([variable], 'the derivative variable');
        outcome = toOutcome('Derivative at Point', evaluateCalculusHigherOrderDerivativeAtPoint({
          bodyLatex: substituteBody(derivativeInput.bodyLatex, [variable]),
          pointLatex: normalizedPoint,
          operator: derivativeInput.operator,
        }));
      } else {
        outcome = withDerivativeSteps(
          runCalculateMode({
            action: 'evaluate',
            latex,
            calculateScreen: 'derivativePoint',
            angleUnit: request.angleUnit ?? 'rad',
            outputStyle: request.outputStyle ?? 'exact',
            ansLatex: request.ansLatex ?? '0',
            storedVariables: request.storedVariables,
            variableSubstitutionSnapshot: request.variableSubstitutionSnapshot,
          }),
          buildCalculusDerivativeStepsDetail({
            bodyLatex: derivativeInput.bodyLatex,
            operator: derivativeInput.operator,
            pointLatex: normalizedPoint,
          }),
        );
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
    case 'limit': {
      const parsedLimit = parseNaturalLimitRequest(request.limit.requestLatex);
      if (!parsedLimit.ok) {
        outcome = {
          kind: 'error',
          title: 'Limit',
          error: parsedLimit.error,
          warnings: [],
        };
        break;
      }
      const variable = parsedLimit.request.variable;
      const variableAnalysis = analyzeNaturalLimitVariables(parsedLimit.request);
      if (variableAnalysis.mismatch) {
        outcome = {
          kind: 'error',
          title: 'Limit',
          error: limitVariableMismatchError(variableAnalysis.mismatch),
          warnings: [],
          detailSections: limitVariableMismatchDetails(variableAnalysis.mismatch),
        };
        break;
      }
      setProtectedDescriptions([variable], 'the limit variable');
      const requestLatex = buildNaturalLimitRequestLatex({
        ...parsedLimit.request,
        bodyLatex: substituteBody(parsedLimit.request.bodyLatex, [variable]),
      });
      outcome = toOutcome('Limit', evaluateCalculusLimit({
        requestLatex,
        equationDomainIntent: request.equationDomainIntent,
      }));
      break;
    }
    case 'finiteLimit': {
      const variable = request.finiteLimit.variable ?? 'x';
      setProtectedDescriptions([variable], 'the limit variable');
      const state = {
        ...request.finiteLimit,
        equationDomainIntent: request.equationDomainIntent,
        bodyLatex: substituteBody(request.finiteLimit.bodyLatex, [variable]),
      };
      outcome = toOutcome('Finite Limit', evaluateCalculusFiniteLimit(state));
      break;
    }
    case 'infiniteLimit': {
      const variable = request.infiniteLimit.variable ?? 'x';
      setProtectedDescriptions([variable], 'the limit variable');
      const state = {
        ...request.infiniteLimit,
        bodyLatex: substituteBody(request.infiniteLimit.bodyLatex, [variable]),
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
      const partialInput = calculusDerivativeInputForState(
        'partial',
        request.partialDerivative.bodyLatex,
        request.partialDerivative.variable,
        request.partialDerivative.operatorLatex,
      );
      if (!partialInput.ok) {
        outcome = {
          kind: 'error',
          title: 'Partial Derivative',
          error: partialInput.error,
          warnings: [],
        };
        break;
      }
      if (partialInput.operator.order > 1) {
        const partialVariables = [...new Set(partialInput.operator.appliedPath)];
        setProtectedDescriptions(partialVariables, 'a partial derivative variable');
        outcome = toOutcome('Partial Derivative', evaluateCalculusMixedPartialDerivative({
          bodyLatex: substituteBody(partialInput.bodyLatex, partialVariables),
          operator: partialInput.operator,
        }));
        break;
      }
      const partialVariable = partialInput.operator.writtenFactors[0]?.variable ?? request.partialDerivative.variable;
      setProtectedDescriptions([partialVariable], 'the partial derivative variable');
      const state = {
        ...request.partialDerivative,
        variable: partialVariable,
        bodyLatex: substituteBody(partialInput.bodyLatex, [partialVariable]),
      };
      outcome = withDerivativeSteps(
        toOutcome('Partial Derivative', evaluateCalculusPartialDerivative(state)),
        buildCalculusDerivativeStepsDetail({
          bodyLatex: state.bodyLatex,
          operator: partialInput.operator,
        }),
      );
      break;
    }
    case 'implicitDerivative': {
      const implicitDerivative = request.implicitDerivative ?? {
        relationLatex: '',
        independentVariable: 'x',
        dependentVariable: 'y',
      };
      const independentVariable = implicitDerivative.independentVariable ?? 'x';
      const dependentVariable = implicitDerivative.dependentVariable ?? 'y';
      setProtectedDescriptions([independentVariable], 'the independent variable');
      setProtectedDescriptions([dependentVariable], 'the dependent variable');
      const state = {
        ...implicitDerivative,
        relationLatex: substituteBody(
          implicitDerivative.relationLatex,
          [independentVariable, dependentVariable],
        ),
      };
      outcome = toOutcome('Implicit Derivative', evaluateCalculusImplicitDerivative(state));
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

  const finalOutcome = withStoredValueDetails(
    outcome,
    substitutions,
    protectedSubstitutions,
    protectedNameDescriptions,
    Boolean(request.variableSubstitutionSnapshot),
  );
  const ownedOutcome = hasNativeCalculusResultDocument(request.screen)
    ? finalOutcome.kind === 'prompt'
      ? finalOutcome
      : createCalculusResultOutcome(finalOutcome)
    : finalOutcome;
  return requireCanonicalResultAuthority(ownedOutcome, 'Calculus');
}
