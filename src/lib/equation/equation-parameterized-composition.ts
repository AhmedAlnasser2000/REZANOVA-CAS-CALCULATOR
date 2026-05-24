import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AngleUnit, DisplayDetailSection } from '../../types/calculator';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './equation-parameterized-readback';
import {
  countSelectedCompositionCarriers,
  generateCompositionBranchesForCarrier,
  generateNestedCompositionBranchesForChain,
  hasAmbiguousAdjacentProduct,
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrier,
  matchSelectedCompositionCarrierChain,
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

function solveGeneratedCompositionBranches({
  generatedEquations,
  generatedFacts,
  layerEquationLatex,
  target,
  parameterNames,
  angleUnit,
  familyLines,
}: {
  generatedEquations: string[];
  generatedFacts: string[];
  layerEquationLatex?: string[];
  target: string;
  parameterNames: string[];
  angleUnit: AngleUnit;
  familyLines: string[];
}): ParameterizedCompositionSolveResult {
  const solvedBranches = generatedEquations.map((branchLatex) =>
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
    ...generatedFacts,
    ...successfulBranches.flatMap((branch) => branch.exactSupplementLatex ?? []),
  ]));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Composition Handoff',
    familyLines,
    extraSections: [{
      title: 'Composition Branches',
      lines: layerEquationLatex ?? generatedEquations,
    }],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solutionExpressions),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: generatedEquations,
  };
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
  let sawTargetOutsideCarrier = false;

  for (const candidate of candidates) {
    if (!hasCompositionTarget(candidate.carrierSide, target)) {
      continue;
    }
    if (hasCompositionTarget(candidate.valueSide, target)) {
      sawTargetOutsideCarrier = true;
      continue;
    }

    if (carrierCounts <= 1) {
      const match = matchSelectedCompositionCarrier(candidate.carrierSide, target);
      if (match.kind === 'blocked') {
        return stop(match.reason, match.message, target, parameterNames);
      }
      if (match.kind === 'none') {
        continue;
      }

      const generated = generateCompositionBranchesForCarrier(match.carrier, candidate.valueSide, angleUnit);
      if (generated.kind === 'unsupported') {
        return stop(generated.reason, generated.message, target, parameterNames);
      }

      return solveGeneratedCompositionBranches({
        generatedEquations: generated.equations,
        generatedFacts: generated.facts,
        target,
        parameterNames,
        angleUnit,
        familyLines: [
          `Inverted one outer composition layer ${match.carrier.labelLatex} around the selected target.`,
          `Generated ${generated.equations.length} branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
        ],
      });
    }

    const chain = matchSelectedCompositionCarrierChain(candidate.carrierSide, target);
    if (chain.kind === 'blocked') {
      return stop(chain.reason, chain.message, target, parameterNames);
    }
    if (chain.kind === 'none') {
      continue;
    }

    const generated = generateNestedCompositionBranchesForChain(
      chain.carriers,
      candidate.valueSide,
      target,
      angleUnit,
    );
    if (generated.kind === 'unsupported') {
      return stop(generated.reason, generated.message, target, parameterNames);
    }

    return solveGeneratedCompositionBranches({
      generatedEquations: generated.equations,
      generatedFacts: generated.facts,
      layerEquationLatex: generated.layerEquationLatex,
      target,
      parameterNames,
      angleUnit,
      familyLines: [
        `Inverted two nested composition layers ${chain.carriers.map((carrier) => carrier.labelLatex).join(' then ')} around the selected target.`,
        `Generated ${generated.equations.length} final branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
      ],
    });
  }

  if (sawTargetOutsideCarrier) {
    return stop(
      'target-outside-carrier',
      'PARAM12 requires the selected target to appear only inside the bounded composition chain.',
      target,
      parameterNames,
    );
  }

  return stop(
    carrierCounts === 1 ? 'target-outside-carrier' : carrierCounts > 1 ? 'mixed-carriers' : 'no-composition',
    carrierCounts === 1
      ? 'PARAM12 requires the selected target to appear only inside the bounded composition chain.'
      : carrierCounts > 1
      ? 'No supported bounded selected-target composition chain was found for PARAM12.'
        : 'No supported selected-target composition handoff was found.',
    target,
    parameterNames,
  );
}
