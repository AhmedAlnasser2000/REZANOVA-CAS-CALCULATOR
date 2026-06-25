import {
  type EquationSelectedTargetRouteFamily,
  type EquationSelectedTargetSearchTraceRecorder,
} from '../equation-target-shape';
import { solveParameterizedCarrierEquation } from './carrier';
import type { HandoffSolveResult } from './exp-log-types';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import {
  solveGeneratedRealCubicCardanoFormulaEquation,
  solveGeneratedRealQuarticFerrariFormulaEquation,
} from './generated-formula-routes';

const GENERATED_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };

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

function expLogGeneratedHandoffFamilies(
  formulaHandoff?: { domain: 'real' },
): GeneratedBranchHandoffFamily[] {
  return [
    {
      family: 'linear',
      solve: (equationLatex, target) =>
        solveParameterizedLinearEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS),
    },
    {
      family: 'polynomial',
      solve: (equationLatex, target) =>
        solveParameterizedPolynomialEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS),
    },
    {
      family: 'rational',
      solve: (equationLatex, target) =>
        solveParameterizedRationalEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS),
    },
    {
      family: 'carrier',
      solve: (equationLatex, target) =>
        solveParameterizedCarrierEquation(equationLatex, target, GENERATED_HANDOFF_OPTIONS),
    },
    ...(
      formulaHandoff?.domain === 'real'
        ? [
            {
              family: 'cubic-cardano' as const,
              solve: (equationLatex: string, target: string) =>
                solveGeneratedRealCubicCardanoFormulaEquation(equationLatex, target),
            },
            {
              family: 'quartic-ferrari' as const,
              solve: (equationLatex: string, target: string) =>
                solveGeneratedRealQuarticFerrariFormulaEquation(equationLatex, target),
            },
          ]
        : []
    ),
  ];
}

function expLogGeneratedHandoffFailureMessage(
  attempts: readonly GeneratedBranchHandoffAttempt[],
) {
  const byFamily = (family: EquationSelectedTargetRouteFamily) =>
    attempts.find((attempt) => attempt.family === family)?.result;
  const polynomial = byFamily('polynomial');
  const rational = byFamily('rational');
  const carrier = byFamily('carrier');
  const cubicCardano = byFamily('cubic-cardano');
  const quarticFerrari = byFamily('quartic-ferrari');

  return unsupportedMessage({
    polynomialMessage: polynomial?.message,
    rationalMessage: rational?.message,
    rationalIsNotRational: rational?.reason === 'not-rational',
    carrierMessage: carrier?.message,
    carrierIsNoCarrier: carrier?.reason === 'no-carrier',
  })
    ?? cubicCardano?.message
    ?? quarticFerrari?.message;
}

export function solveGeneratedExpLogEquation(
  equationLatex: string,
  target: string,
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
  formulaHandoff?: { domain: 'real' },
): HandoffSolveResult {
  const solved = solveGeneratedBranchEquations({
    branchEquations: [equationLatex],
    target,
    families: expLogGeneratedHandoffFamilies(formulaHandoff),
    searchTrace,
    failureMessage: ({ attempts }) => expLogGeneratedHandoffFailureMessage(attempts),
    ...(formulaHandoff?.domain === 'real'
      ? {
          formulaValidationEvidence: () => ({
            wrapperBackSubstitutionValidated: true,
            candidatesValidated: true,
            caseMathPreserved: true,
            scopedFactsPreserved: true,
          }),
        }
      : {}),
  });
  if (solved.kind === 'unsupported') {
    return {
      kind: 'unsupported',
      message: solved.message,
    };
  }

  const branch = solved.branches[0];
  return {
    kind: 'success',
    exactLatex: branch.exactLatex,
    exactSupplementLatex: solved.exactSupplementLatex,
    ...(branch.formulaPayload ? { formulaPayload: branch.formulaPayload } : {}),
  };
}
