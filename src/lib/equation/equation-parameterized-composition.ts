import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit, DisplayDetailSection } from '../../types/calculator';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';
import {
  countSelectedCompositionCarriers,
  generateCompositionBranchesForCarrier,
  hasAmbiguousAdjacentProduct,
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrier,
  parameterNamesFromCompositionLatex,
  type CompositionCoreStopReason,
  type CompositionMathJson,
} from './composition-core';
import { solveParameterizedCarrierEquation } from './equation-parameterized-carrier';
import { solveParameterizedExpLogEquation } from './equation-parameterized-exp-log';
import { solveParameterizedFactorablePolynomialEquation } from './equation-parameterized-factorable-polynomial';
import { solveParameterizedLinearEquation } from './equation-parameterized-linear';
import { solveParameterizedPolynomialEquation } from './equation-parameterized-polynomial';
import { solveParameterizedRationalEquation } from './equation-parameterized-rational';
import { solveParameterizedTrigEquation } from './equation-parameterized-trig';

const ce = new ComputeEngine();

export type ParameterizedCompositionStopReason = CompositionCoreStopReason;

export type ParameterizedCompositionSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  generatedEquationLatex: string[];
};

export type ParameterizedCompositionSolveStop = {
  kind: 'unsupported';
  reason: ParameterizedCompositionStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type ParameterizedCompositionSolveResult =
  | ParameterizedCompositionSolveSuccess
  | ParameterizedCompositionSolveStop;

type BranchSolveResult =
  | { kind: 'success'; exactLatex: string; exactSupplementLatex?: string[] }
  | { kind: 'unsupported'; message: string };

function stop(
  reason: ParameterizedCompositionStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): ParameterizedCompositionSolveStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}

function solveBranchEquation(equationLatex: string, target: string, angleUnit: AngleUnit): BranchSolveResult {
  const options = { allowGeneratedImplicitProducts: true };
  const linear = solveParameterizedLinearEquation(equationLatex, target, options);
  if (linear.kind === 'success') {
    return linear;
  }

  const polynomial = solveParameterizedPolynomialEquation(equationLatex, target, options);
  if (polynomial.kind === 'success') {
    return polynomial;
  }

  const rational = solveParameterizedRationalEquation(equationLatex, target, options);
  if (rational.kind === 'success') {
    return rational;
  }

  const factorable = solveParameterizedFactorablePolynomialEquation(equationLatex, target);
  if (factorable.kind === 'success') {
    return factorable;
  }

  const carrier = solveParameterizedCarrierEquation(equationLatex, target);
  if (carrier.kind === 'success') {
    return carrier;
  }

  const expLog = solveParameterizedExpLogEquation(equationLatex, target);
  if (expLog.kind === 'success') {
    return expLog;
  }

  const trig = solveParameterizedTrigEquation(equationLatex, target, angleUnit);
  if (trig.kind === 'success') {
    return trig;
  }

  return {
    kind: 'unsupported',
    message: rational.reason !== 'not-rational'
      ? rational.message
      : trig.reason !== 'no-trig'
        ? trig.message
        : expLog.reason !== 'no-exp-log'
          ? expLog.message
          : carrier.reason !== 'no-carrier'
            ? carrier.message
            : factorable.reason !== 'not-factorable'
              ? factorable.message
              : polynomial.message,
  };
}

function solutionExpressionsFromExactLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith('\\right\\}')) {
    return exactLatex
      .slice(setPrefix.length, -'\\right\\}'.length)
      .split(/,\\\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [exactLatex];
}

function exactLatexForSolutions(target: string, solutionExpressions: string[]) {
  const unique = dedupe(solutionExpressions);
  if (unique.length === 1) {
    return `${target}=${unique[0]}`;
  }
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

export function solveParameterizedCompositionEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
): ParameterizedCompositionSolveResult {
  const parameterNames = parameterNamesFromCompositionLatex(equationLatex, target);

  if (hasAmbiguousAdjacentProduct(equationLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before parameterized composition solving.',
      target,
      parameterNames,
    );
  }

  let parsed: ReturnType<typeof ce.parse>;
  try {
    parsed = ce.parse(equationLatex);
  } catch {
    return stop('parse-error', 'The equation could not be parsed for parameterized composition solving.', target, parameterNames);
  }

  const json = parsed.json;
  if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before parameterized composition solving.', target, parameterNames);
  }

  if (!hasCompositionTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const [left, right] = [json[1] as CompositionMathJson, json[2] as CompositionMathJson];
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];
  const carrierCounts = countSelectedCompositionCarriers(json, target);
  if (carrierCounts > 1) {
    return stop(
      'mixed-carriers',
      'PARAM11 supports one outer selected-target carrier only; mixed or nested carriers are reserved for PARAM12.',
      target,
      parameterNames,
    );
  }

  for (const candidate of candidates) {
    const match = matchSelectedCompositionCarrier(candidate.carrierSide, target);
    if (match.kind === 'blocked') {
      return stop(match.reason, match.message, target, parameterNames);
    }
    if (match.kind === 'none') {
      continue;
    }
    if (hasCompositionTarget(candidate.valueSide, target)) {
      return stop(
        'target-outside-carrier',
        'PARAM11 requires the selected target to appear only inside the one outer composition carrier.',
        target,
        parameterNames,
      );
    }

    const generated = generateCompositionBranchesForCarrier(match.carrier, candidate.valueSide, angleUnit);
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    const solvedBranches = generated.equations.map((branchLatex) =>
      solveBranchEquation(branchLatex, target, angleUnit));
    const failedBranch = solvedBranches.find((entry) => entry.kind === 'unsupported');
    if (failedBranch?.kind === 'unsupported') {
      return stop(
        'unsupported-branch',
        `A generated composition branch is outside current selected-target parameter solvers. ${failedBranch.message}`,
        target,
        parameterNames,
      );
    }

    const successfulBranches = solvedBranches.filter(
      (entry): entry is Extract<BranchSolveResult, { kind: 'success' }> => entry.kind === 'success',
    );
    const solutionExpressions = successfulBranches.flatMap((branch) =>
      solutionExpressionsFromExactLatex(branch.exactLatex, target));
    const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
      ...generated.facts,
      ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
    ]));
    const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
      target,
      parameterNames,
      familyTitle: 'Parameterized Composition Handoff',
      familyLines: [
        `Inverted one outer composition layer ${match.carrier.labelLatex} around the selected target.`,
        `Generated ${generated.equations.length} branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
      ],
      extraSections: [{
        title: 'Composition Branches',
        lines: generated.equations,
      }],
    });

    return {
      kind: 'success',
      target,
      parameterNames,
      exactLatex: exactLatexForSolutions(target, solutionExpressions),
      exactSupplementLatex,
      detailSections,
      generatedEquationLatex: generated.equations,
    };
  }

  return stop(
    carrierCounts > 0 ? 'target-outside-carrier' : 'no-composition',
    'No supported one-layer selected-target composition handoff was found for PARAM11.',
    target,
    parameterNames,
  );
}
