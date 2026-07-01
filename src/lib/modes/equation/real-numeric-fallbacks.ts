import { classifyEquationRuntimeAdvisories } from '../../kernel/runtime-policy';
import type {
  AngleUnit,
  DisplayOutcome,
  EquationDomainIntent,
  ComplexExactForm,
  NumericSolveInterval,
  PlannerBadge,
} from '../../../types/calculator';
import {
  attachEquationRuntimeEnvelope,
  finalizeSelectedTargetSymbolicOutcome,
} from './outcomes';
import { tryDeterministicNumericAlgebraicFallback } from './deterministic-numeric-algebraic';
import { tryComplexNumericPolynomialFallback } from './complex-numeric-polynomial-roots';
import { tryRealPiecewiseAbsHybridFallback } from './real-piecewise-abs-hybrid';
import { tryRealNonlinearNumericSearchFallback } from './real-nonlinear-numeric-search';
import { tryRealPeriodicIntervalNumericFallback } from './real-periodic-interval-numeric';

export function tryRealNumericFallbackOutcome(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  equationDomainIntent: EquationDomainIntent;
  numericInterval?: NumericSolveInterval;
  complexExactForm: ComplexExactForm;
  sharedOutcome: DisplayOutcome;
  sharedResolvedLatex: string;
  plannerBadges?: PlannerBadge[];
}) {
  const fallback = input.equationDomainIntent === 'complex'
    ? tryComplexNumericPolynomialFallback({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
      complexExactForm: input.complexExactForm,
      sharedOutcome: input.sharedOutcome,
    })
    : tryDeterministicNumericAlgebraicFallback({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
      sharedOutcome: input.sharedOutcome,
    }) ?? tryRealPiecewiseAbsHybridFallback({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
      equationDomainIntent: input.equationDomainIntent,
      numericInterval: input.numericInterval,
      sharedOutcome: input.sharedOutcome,
    }) ?? tryRealPeriodicIntervalNumericFallback({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
      equationDomainIntent: input.equationDomainIntent,
      numericInterval: input.numericInterval,
      sharedOutcome: input.sharedOutcome,
    }) ?? tryRealNonlinearNumericSearchFallback({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
      equationDomainIntent: input.equationDomainIntent,
      numericInterval: input.numericInterval,
      sharedOutcome: input.sharedOutcome,
    });

  if (!fallback) {
    return undefined;
  }

  const finalOutcome = fallback.kind === 'success'
    ? finalizeSelectedTargetSymbolicOutcome(fallback, input.equationSolveTarget)
    : fallback;

  return attachEquationRuntimeEnvelope(
    finalOutcome,
    input.equationLatex,
    input.sharedResolvedLatex,
    input.plannerBadges,
    classifyEquationRuntimeAdvisories({ outcome: finalOutcome }),
  );
}
