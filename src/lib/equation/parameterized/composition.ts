import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  AngleUnit,
  DisplayBranchReadback,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../../types/calculator';
import {
  detailLineFromParts,
  mathDetailSection,
  mathPart,
  textPart,
} from '../../display/result-detail-lines';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import type { EquationSelectedTargetSearchTraceRecorder } from '../equation-target-shape';
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
} from '../composition/core';
import { solveEquationAlgebraicIsolation } from '../equation-algebraic-isolation';
import { finiteBranchReadbackForNormalizedBranches } from '../readback/finite-branches';
import { solveParameterizedCarrierEquation } from './carrier';
import { solveParameterizedExpLogEquation } from './exp-log';
import { solveParameterizedFactorablePolynomialEquation } from './factorable-polynomial';
import {
  type GeneratedBranchHandoffAttempt,
  type GeneratedBranchHandoffFamily,
  solveGeneratedBranchEquations,
} from './generated-branch-handoff';
import { exactLatexForSolutions } from './generated-handoff';
import { solveParameterizedLinearEquation } from './linear';
import { solveParameterizedPolynomialEquation } from './polynomial';
import { solveParameterizedRationalEquation } from './rational';
import { solveParameterizedTrigEquation } from './trig';

const ce = new ComputeEngine();

export type ParameterizedCompositionStopReason = CompositionCoreStopReason;

export type ParameterizedCompositionSolveSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
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

export type ParameterizedCompositionSolveOptions = {
  allowGeneratedImplicitProducts?: boolean;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
};

const BRANCH_HANDOFF_OPTIONS = { allowGeneratedImplicitProducts: true };

function detailTextLine(text: string) {
  return {
    line: text,
    parts: [textPart(text)] as DisplayDetailLinePart[],
  };
}

function oneLayerHandoffLine(carrierLatex: string) {
  return detailLineFromParts([
    textPart('Inverted one outer composition layer '),
    mathPart(carrierLatex),
    textPart(' around the selected target.'),
  ]);
}

function twoLayerHandoffLine(carrierLatex: string[]) {
  const parts: DisplayDetailLinePart[] = [textPart('Inverted two nested composition layers ')];
  carrierLatex.forEach((latex, index) => {
    if (index > 0) {
      parts.push(textPart(' then '));
    }
    parts.push(mathPart(latex));
  });
  parts.push(textPart(' around the selected target.'));
  return detailLineFromParts(parts);
}

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

function compositionBranchFailureMessage(
  attempts: GeneratedBranchHandoffAttempt[],
) {
  const byFamily = (family: GeneratedBranchHandoffAttempt['family']) =>
    attempts.find((attempt) => attempt.family === family)?.result;
  const polynomial = byFamily('polynomial');
  const rational = byFamily('rational');
  const factorable = byFamily('factorable-polynomial');
  const carrier = byFamily('carrier');
  const expLog = byFamily('exp-log');
  const trig = byFamily('trig');

  if (rational && rational.reason !== 'not-rational') {
    return rational.message;
  }
  if (trig && trig.reason !== 'no-trig') {
    return trig.message;
  }
  if (expLog && expLog.reason !== 'no-exp-log') {
    return expLog.message;
  }
  if (carrier && carrier.reason !== 'no-carrier') {
    return carrier.message;
  }
  if (factorable && factorable.reason !== 'not-factorable') {
    return factorable.message;
  }

  return polynomial?.message
    ?? rational?.message
    ?? trig?.message
    ?? expLog?.message
    ?? carrier?.message
    ?? factorable?.message
    ?? 'This generated composition branch is outside current selected-target parameter solvers.';
}

function solveGeneratedCompositionBranches({
  generatedEquations,
  generatedFacts,
  layerEquationLatex,
  target,
  parameterNames,
  angleUnit,
  familyLines,
  familyLineParts,
  searchTrace,
}: {
  generatedEquations: string[];
  generatedFacts: string[];
  layerEquationLatex?: string[];
  target: string;
  parameterNames: string[];
  angleUnit: AngleUnit;
  familyLines: string[];
  familyLineParts?: DisplayDetailLinePart[][];
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
}): ParameterizedCompositionSolveResult {
  const branchFamilies: GeneratedBranchHandoffFamily[] = [
    {
      family: 'linear',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedLinearEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedPolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'rational',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedRationalEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'factorable-polynomial',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedFactorablePolynomialEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'algebraic-isolation',
      solve: (branchLatex, branchTarget) =>
        solveEquationAlgebraicIsolation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'carrier',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedCarrierEquation(branchLatex, branchTarget, BRANCH_HANDOFF_OPTIONS),
    },
    {
      family: 'exp-log',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedExpLogEquation(branchLatex, branchTarget, {
          ...BRANCH_HANDOFF_OPTIONS,
          searchTrace,
        }),
    },
    {
      family: 'trig',
      solve: (branchLatex, branchTarget) =>
        solveParameterizedTrigEquation(branchLatex, branchTarget, angleUnit, BRANCH_HANDOFF_OPTIONS),
    },
  ];
  const solvedBranches = solveGeneratedBranchEquations({
    branchEquations: generatedEquations,
    target,
    families: branchFamilies,
    searchTrace,
    failureMessage: ({ attempts }) => compositionBranchFailureMessage(attempts),
  });
  if (solvedBranches.kind === 'unsupported') {
    return stop(
      'unsupported-branch',
      `A generated composition branch is outside current selected-target parameter solvers. ${solvedBranches.message}`,
      target,
      parameterNames,
    );
  }

  const exactSupplementLatex = normalizeParameterizedSupplementLatex(dedupe([
    ...generatedFacts,
    ...solvedBranches.exactSupplementLatex,
  ]));
  const detailSections: DisplayDetailSection[] = buildParameterizedDetailSections({
    target,
    parameterNames,
    familyTitle: 'Parameterized Composition Handoff',
    familyLines,
    familyLineParts,
    extraSections: [mathDetailSection('Composition Branches', layerEquationLatex ?? generatedEquations)],
  });

  return {
    kind: 'success',
    target,
    parameterNames,
    exactLatex: exactLatexForSolutions(target, solvedBranches.solutionExpressions),
    branchReadback: finiteBranchReadbackForNormalizedBranches({
      targetLatex: target,
      branchesLatex: dedupe(solvedBranches.solutionExpressions),
      preserveOrder: true,
      source: 'equation-parameterized-composition',
    }),
    exactSupplementLatex,
    detailSections,
    generatedEquationLatex: generatedEquations,
  };
}

export function solveParameterizedCompositionEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  options: ParameterizedCompositionSolveOptions = {},
): ParameterizedCompositionSolveResult {
  const parameterNames = parameterNamesFromCompositionLatex(equationLatex, target);

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(equationLatex)) {
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

      const handoffLine = oneLayerHandoffLine(match.carrier.labelLatex);
      const generatedLine = detailTextLine(
        `Generated ${generated.equations.length} branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
      );
      return solveGeneratedCompositionBranches({
        generatedEquations: generated.equations,
        generatedFacts: generated.facts,
        target,
        parameterNames,
        angleUnit,
        familyLines: [handoffLine.line, generatedLine.line],
        familyLineParts: [handoffLine.parts, generatedLine.parts],
        searchTrace: options.searchTrace,
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

    const handoffLine = twoLayerHandoffLine(chain.carriers.map((carrier) => carrier.labelLatex));
    const generatedLine = detailTextLine(
      `Generated ${generated.equations.length} final branch equation${generated.equations.length === 1 ? '' : 's'} and delegated them to existing selected-target solvers.`,
    );
    return solveGeneratedCompositionBranches({
      generatedEquations: generated.equations,
      generatedFacts: generated.facts,
      layerEquationLatex: generated.layerEquationLatex,
      target,
      parameterNames,
      angleUnit,
      familyLines: [handoffLine.line, generatedLine.line],
      familyLineParts: [handoffLine.parts, generatedLine.parts],
      searchTrace: options.searchTrace,
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
