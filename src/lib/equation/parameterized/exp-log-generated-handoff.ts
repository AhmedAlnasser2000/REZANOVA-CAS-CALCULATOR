import {
  type EquationSelectedTargetRouteFamily,
  type EquationSelectedTargetRoutePlan,
  type EquationSelectedTargetSearchTraceRecorder,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
  recordSelectedTargetRoutePlan,
  shouldAttemptSelectedTargetRoute,
} from '../equation-target-shape';
import { solveParameterizedCarrierEquation } from './carrier';
import type { HandoffSolveResult } from './exp-log-types';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';

const GENERATED_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };
const GENERATED_HANDOFF_PHASE = 'generated-handoff';
const EXP_LOG_GENERATED_HANDOFF_FAMILIES: EquationSelectedTargetRouteFamily[] = [
  'linear',
  'polynomial',
  'rational',
  'carrier',
];

function planExpLogGeneratedHandoff(
  equationLatex: string,
  target: string,
): EquationSelectedTargetRoutePlan {
  const routePlan = planSelectedTargetRouteFamilies(
    profileEquationTargetShape(equationLatex, target, GENERATED_HANDOFF_OPTIONS),
    { phase: GENERATED_HANDOFF_PHASE },
  );
  const families = EXP_LOG_GENERATED_HANDOFF_FAMILIES.filter((family) =>
    routePlan.families.includes(family));

  return {
    profile: routePlan.profile,
    phase: routePlan.phase,
    families,
    skippedFamilies: EXP_LOG_GENERATED_HANDOFF_FAMILIES.filter((family) =>
      !families.includes(family)),
  };
}

function unsupportedMessage({
  polynomialMessage,
  rationalMessage,
  rationalIsNotRational,
  carrierMessage,
  carrierIsNoCarrier,
}: {
  polynomialMessage?: string;
  rationalMessage?: string;
  rationalIsNotRational?: boolean;
  carrierMessage?: string;
  carrierIsNoCarrier?: boolean;
}) {
  if (rationalMessage && !rationalIsNotRational) {
    return rationalMessage;
  }
  if (carrierMessage && !carrierIsNoCarrier) {
    return carrierMessage;
  }
  return polynomialMessage
    ?? rationalMessage
    ?? carrierMessage
    ?? 'The generated exp/log equation is outside current selected-target parameter solvers.';
}

export function solveGeneratedExpLogEquation(
  equationLatex: string,
  target: string,
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
): HandoffSolveResult {
  const routePlan = planExpLogGeneratedHandoff(equationLatex, target);
  recordSelectedTargetRoutePlan(searchTrace, routePlan);
  let polynomialMessage: string | undefined;
  let rationalMessage: string | undefined;
  let rationalIsNotRational = false;
  let carrierMessage: string | undefined;
  let carrierIsNoCarrier = false;

  if (shouldAttemptSelectedTargetRoute(routePlan, 'linear')) {
    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_HANDOFF_PHASE, 'linear');
    const linear = solveParameterizedLinearEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS);
    if (linear.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_HANDOFF_PHASE, 'linear');
      return linear;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'polynomial')) {
    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_HANDOFF_PHASE, 'polynomial');
    const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS);
    if (polynomial.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_HANDOFF_PHASE, 'polynomial');
      return polynomial;
    }
    polynomialMessage = polynomial.message;
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'rational')) {
    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_HANDOFF_PHASE, 'rational');
    const rational = solveParameterizedRationalEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS);
    if (rational.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_HANDOFF_PHASE, 'rational');
      return rational;
    }
    rationalMessage = rational.message;
    rationalIsNotRational = rational.reason === 'not-rational';
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'carrier')) {
    recordSelectedTargetFamilyAttempt(searchTrace, GENERATED_HANDOFF_PHASE, 'carrier');
    const carrier = solveParameterizedCarrierEquation(equationLatex, target);
    if (carrier.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, GENERATED_HANDOFF_PHASE, 'carrier');
      return carrier;
    }
    carrierMessage = carrier.message;
    carrierIsNoCarrier = carrier.reason === 'no-carrier';
  }

  const message = unsupportedMessage({
    polynomialMessage,
    rationalMessage,
    rationalIsNotRational,
    carrierMessage,
    carrierIsNoCarrier,
  });
  recordSelectedTargetFinalStop(searchTrace, GENERATED_HANDOFF_PHASE, 'handoff-unsupported', message);
  return {
    kind: 'unsupported',
    message,
  };
}
