import { solveParameterizedExpLogEquation } from '../../equation/parameterized/exp-log';
import { solveParameterizedTrigEquation } from '../../equation/parameterized/trig';
import {
  type EquationSelectedTargetRouteFamily,
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  shouldAttemptSelectedTargetRoute,
} from '../../equation/equation-target-shape';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  AngleUnit,
  ComplexExactForm,
  DisplayBranchReadback,
  DisplayDetailSection,
  ResultProducerDraft,
  OutputStyle,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
  unsupportedComplexPreimageOutcome,
} from './outcomes';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type ParameterizedOptions = {
  allowGeneratedImplicitProducts?: boolean;
};

type ComplexPreimageWrapperRouteInput = {
  equationLatex: string;
  parameterizedEquationLatex: string;
  selectedTarget: string;
  parameterizedOptions: ParameterizedOptions;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  complexExactForm: ComplexExactForm;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  routePlan?: EquationSelectedTargetRoutePlan;
  stopOnRecognizedUnsupported?: boolean;
};

function shouldAttempt(input: ComplexPreimageWrapperRouteInput, family: EquationSelectedTargetRouteFamily) {
  return input.routePlan ? shouldAttemptSelectedTargetRoute(input.routePlan, family) : true;
}

function runAttempt<T>(
  input: ComplexPreimageWrapperRouteInput,
  family: EquationSelectedTargetRouteFamily,
  run: () => T,
) {
  if (input.routePlan) {
    recordSelectedTargetFamilyAttempt(input.searchTrace, 'top-level', family);
  }
  return run();
}

function separateTrailingIntegerCondition<T extends {
  exactLatex: string;
  exactSupplementLatex?: string[];
}>(result: T): T {
  const match = result.exactLatex.match(/^(.*),\\\s*([a-z](?:,[a-z])*)\\in\\mathbb\{Z\}\s*$/u);
  if (!match) return result;
  const condition = `${match[2]}\\in\\mathbb{Z}`;
  return {
    ...result,
    exactLatex: match[1].trim(),
    exactSupplementLatex: [...new Set([...(result.exactSupplementLatex ?? []), condition])],
  };
}

function attachSuccess(
  input: ComplexPreimageWrapperRouteInput,
  family: EquationSelectedTargetRouteFamily,
  result: {
    exactLatex: string;
    branchReadback?: DisplayBranchReadback;
    exactSupplementLatex?: string[];
    detailSections: DisplayDetailSection[];
  },
) {
  if (input.routePlan) {
    recordSelectedTargetFamilySuccess(input.searchTrace, 'top-level', family);
  }
  const normalized = separateTrailingIntegerCondition(result);
  const outcome: ResultProducerDraft = createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex: normalized.exactLatex,
    branchReadback: normalized.branchReadback,
    exactSupplementLatex: normalized.exactSupplementLatex,
    detailSections: normalized.detailSections,
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: 'complex',
  });

  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, input.selectedTarget);

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

function attachBoundary(input: ComplexPreimageWrapperRouteInput) {
  const boundaryOutcome = unsupportedComplexPreimageOutcome();
  return attachEquationRuntimeEnvelope(
    boundaryOutcome,
    input.equationLatex,
    input.plannerResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ invalidRequest: true }),
  );
}

function hasIntegerPeriodicEvidence(result: { exactLatex: string; exactSupplementLatex?: string[] }) {
  return /\\mathbb\{Z\}|\\pi\s*n|\\pi n|\\frac\{\\pi n\}/u.test([
    result.exactLatex,
    ...(result.exactSupplementLatex ?? []),
  ].join(' '));
}

export function tryComplexPreimageWrapperRoute(
  input: ComplexPreimageWrapperRouteInput,
): ResultProducerDraft | undefined {
  const complexPreimageHandoff = {
    domain: 'complex' as const,
    outputStyle: input.outputStyle,
    complexExactForm: input.complexExactForm,
    angleUnit: input.angleUnit,
    maxPowerDegree: 2,
  };

  if (shouldAttempt(input, 'exp-log')) {
    const expLog = runAttempt(input, 'exp-log', () =>
      solveParameterizedExpLogEquation(
        input.parameterizedEquationLatex,
        input.selectedTarget,
        {
          ...input.parameterizedOptions,
          searchTrace: input.searchTrace,
          complexPreimageHandoff,
        },
      ));
    if (expLog.kind === 'success' && expLog.answerDomain === 'complex') {
      return attachSuccess(input, 'exp-log', expLog);
    }
    if (
      input.stopOnRecognizedUnsupported
      && expLog.kind === 'unsupported'
      && expLog.reason !== 'no-exp-log'
    ) {
      return attachBoundary(input);
    }
  }

  if (shouldAttempt(input, 'trig')) {
    const trig = runAttempt(input, 'trig', () =>
      solveParameterizedTrigEquation(
        input.parameterizedEquationLatex,
        input.selectedTarget,
        input.angleUnit,
        {
          ...input.parameterizedOptions,
          searchTrace: input.searchTrace,
          complexPreimageHandoff,
        },
      ));
    if (
      trig.kind === 'success'
      && trig.answerDomain === 'complex'
    ) {
      return attachSuccess(input, 'trig', trig);
    }
    if (trig.kind === 'success' && trig.parameterNames.length === 0 && hasIntegerPeriodicEvidence(trig)) {
      return attachBoundary(input);
    }
    if (
      input.stopOnRecognizedUnsupported
      && trig.kind === 'unsupported'
      && trig.reason !== 'no-trig'
    ) {
      return attachBoundary(input);
    }
  }

  return undefined;
}
