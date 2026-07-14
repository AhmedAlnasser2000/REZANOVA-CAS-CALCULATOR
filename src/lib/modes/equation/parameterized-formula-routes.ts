import {
  solveParameterizedTopLevelCubicCardanoEquation,
  solveParameterizedTopLevelQuarticFerrariEquation,
} from '../../equation/parameterized/formula-rational-normalization';
import {
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFamilyStop,
  shouldAttemptSelectedTargetRoute,
} from '../../equation/equation-target-shape';
import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  ComplexExactForm,
  DisplayBranchReadback,
  DisplayDetailSection,
  ResultProducerDraft,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';
import { createEquationResultOutcome } from '../../equation/equation-solve-result';

type FormulaRouteOptions = {
  allowGeneratedImplicitProducts: boolean;
};

type FormulaRouteDomain = 'complex' | 'real';
type CubicCardanoResult = ReturnType<typeof solveParameterizedTopLevelCubicCardanoEquation>;
type QuarticFerrariResult = ReturnType<typeof solveParameterizedTopLevelQuarticFerrariEquation>;
export type ParameterizedFormulaRouteResult = {
  outcome?: ResultProducerDraft;
  cubicCardano?: CubicCardanoResult;
  quarticFerrari?: QuarticFerrariResult;
};

function runTracedFormulaFamily<T>(
  searchTrace: EquationSelectedTargetSearchTraceRecorder | undefined,
  family: 'cubic-cardano' | 'quartic-ferrari',
  run: () => T,
) {
  recordSelectedTargetFamilyAttempt(searchTrace, 'top-level', family);
  return run();
}

function attachSymbolicFormulaOutcome(options: {
  equationLatex: string;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
  selectedTarget: string;
  answerDomain: FormulaRouteDomain;
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections?: DisplayDetailSection[];
}) {
  const outcome: ResultProducerDraft = createEquationResultOutcome({
    kind: 'success',
    title: 'Solve',
    exactLatex: options.exactLatex,
    branchReadback: options.branchReadback,
    exactSupplementLatex: options.exactSupplementLatex,
    detailSections: options.detailSections,
    warnings: [],
    resultOrigin: 'symbolic',
    answerDomain: options.answerDomain,
  });
  const finalOutcome = finalizeSelectedTargetSymbolicOutcome(outcome, options.selectedTarget);

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    options.equationLatex,
    options.plannerResolvedLatex,
    options.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}

export function runParameterizedFormulaRoutes(options: {
  equationLatex: string;
  parameterizedEquationLatex: string;
  selectedTarget: string;
  parameterizedOptions: FormulaRouteOptions;
  routePlan: EquationSelectedTargetRoutePlan;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
  domain?: FormulaRouteDomain;
  complexExactForm: ComplexExactForm;
  plannerResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}): ParameterizedFormulaRouteResult {
  if (!options.domain) {
    return {};
  }

  const cubicCardano = shouldAttemptSelectedTargetRoute(options.routePlan, 'cubic-cardano')
    ? runTracedFormulaFamily(options.searchTrace, 'cubic-cardano', () =>
      solveParameterizedTopLevelCubicCardanoEquation(
        options.parameterizedEquationLatex,
        options.selectedTarget,
        {
          ...options.parameterizedOptions,
          domain: options.domain!,
          complexExactForm: options.complexExactForm,
        },
      ))
    : undefined;

  if (cubicCardano?.kind === 'success') {
    recordSelectedTargetFamilySuccess(options.searchTrace, 'top-level', 'cubic-cardano');
    return {
      outcome: attachSymbolicFormulaOutcome({
        equationLatex: options.equationLatex,
        plannerResolvedLatex: options.plannerResolvedLatex,
        plannerBadges: options.plannerBadges,
        selectedTarget: options.selectedTarget,
        answerDomain: options.domain,
        exactLatex: cubicCardano.exactLatex,
        branchReadback: cubicCardano.branchReadback,
        exactSupplementLatex: cubicCardano.exactSupplementLatex,
        detailSections: cubicCardano.detailSections,
      }),
    };
  }

  if (cubicCardano?.kind === 'unsupported') {
    const details = cubicCardano.reason === 'ferrari-deferred'
      ? { degree: 4, algorithm: 'ferrari', domain: options.domain }
      : { degree: 3, algorithm: 'cardano', domain: options.domain };
    recordSelectedTargetFamilyStop(
      options.searchTrace,
      'top-level',
      'cubic-cardano',
      cubicCardano.reason,
      cubicCardano.message,
      details,
    );
  }

  const quarticFerrari = shouldAttemptSelectedTargetRoute(options.routePlan, 'quartic-ferrari')
    ? runTracedFormulaFamily(options.searchTrace, 'quartic-ferrari', () =>
      solveParameterizedTopLevelQuarticFerrariEquation(
        options.parameterizedEquationLatex,
        options.selectedTarget,
        {
          ...options.parameterizedOptions,
          domain: options.domain!,
        },
      ))
    : undefined;

  if (quarticFerrari?.kind === 'success') {
    recordSelectedTargetFamilySuccess(options.searchTrace, 'top-level', 'quartic-ferrari');
    return {
      outcome: attachSymbolicFormulaOutcome({
        equationLatex: options.equationLatex,
        plannerResolvedLatex: options.plannerResolvedLatex,
        plannerBadges: options.plannerBadges,
        selectedTarget: options.selectedTarget,
        answerDomain: options.domain,
        exactLatex: quarticFerrari.exactLatex,
        branchReadback: quarticFerrari.branchReadback,
        exactSupplementLatex: quarticFerrari.exactSupplementLatex,
        detailSections: quarticFerrari.detailSections,
      }),
    };
  }

  if (quarticFerrari?.kind === 'unsupported') {
    recordSelectedTargetFamilyStop(
      options.searchTrace,
      'top-level',
      'quartic-ferrari',
      quarticFerrari.reason,
      quarticFerrari.message,
      { degree: 4, algorithm: 'ferrari', domain: options.domain },
    );
  }

  return { cubicCardano, quarticFerrari };
}
