import { ComputeEngine } from '@cortex-js/compute-engine';
import { evaluateRealNumericExpression } from '../../numeric/real-numeric-eval';
import { dedupeNumericRoots } from '../candidate-validation';
import {
  checkCandidateAgainstConstraints,
  equationToZeroFormLatex,
  readNumericNode,
} from '../domain-guards';
import { dedupe, extractApproxSolutions, extractExactSolutions } from '../guarded/merge';
import {
  buildCompositeCandidateRejectionMessage,
  classifyCandidateRejections,
} from '../candidate-rejection';
import { isNodeArray } from '../../symbolic-engine/patterns';
import type {
  AngleUnit,
  CandidateValidationResult,
  DisplayOutcome,
  SolveDomainConstraint,
} from '../../../types/calculator';

const ce = new ComputeEngine();
const RESIDUAL_TOLERANCE = 1e-6;
const DIRECT_TRIG_OPERATORS = new Set(['Sin', 'Cos', 'Tan', 'Sec', 'Csc', 'Cot']);
const INVERSE_TRIG_OPERATORS = new Set(['Arcsin', 'Arccos', 'Arctan']);

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function isNumericConstantSymbol(symbol: string) {
  return symbol === 'Pi' || symbol === 'ExponentialE';
}

function isNumericOnlyNode(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }

  if (typeof node === 'object' && node !== null && 'num' in node) {
    const value = Number((node as { num: string }).num);
    return Number.isFinite(value);
  }

  if (typeof node === 'string') {
    return isNumericConstantSymbol(node);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).every((child) => isNumericOnlyNode(child));
}

function rewriteTrigArgumentForAngleUnit(argument: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Degrees', argument];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', argument, 'Pi'], 200];
  }

  return argument;
}

function rewriteInverseTrigResultForAngleUnit(node: unknown, angleUnit: AngleUnit) {
  if (angleUnit === 'deg') {
    return ['Divide', ['Multiply', node, 180], 'Pi'];
  }

  if (angleUnit === 'grad') {
    return ['Divide', ['Multiply', node, 200], 'Pi'];
  }

  return node;
}

function rewriteDirectTrigAngles(node: unknown, angleUnit: AngleUnit): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [operator, ...operands] = node;
  const rewrittenOperands = operands.map((operand) => rewriteDirectTrigAngles(operand, angleUnit));

  if (
    typeof operator === 'string'
    && DIRECT_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return [
      operator,
      rewriteTrigArgumentForAngleUnit(rewrittenOperands[0], angleUnit),
      ...rewrittenOperands.slice(1),
    ];
  }

  if (
    typeof operator === 'string'
    && INVERSE_TRIG_OPERATORS.has(operator)
    && rewrittenOperands.length >= 1
    && angleUnit !== 'rad'
    && isNumericOnlyNode(rewrittenOperands[0])
  ) {
    return rewriteInverseTrigResultForAngleUnit([operator, ...rewrittenOperands], angleUnit);
  }

  return [operator, ...rewrittenOperands];
}

function evaluateResidualAt(
  equationLatex: string,
  value: number,
  angleUnit: AngleUnit,
) {
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const expr = ce.parse(zeroFormLatex);
  const substituted = expr.subs({ x: value });
  const rewrittenJson = rewriteDirectTrigAngles(substituted.json, angleUnit);
  const rewrittenLatex = boxLatex(rewrittenJson);
  const numeric = evaluateRealNumericExpression(rewrittenJson, rewrittenLatex);
  if (numeric.kind === 'success') {
    return numeric.value;
  }

  const evaluated = ce.box(rewrittenJson as Parameters<typeof ce.box>[0]).evaluate();
  const fallback = evaluated.N?.() ?? evaluated;
  return readNumericNode(fallback.json);
}

function validateCompositionCandidates(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
) {
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];

  for (const candidate of dedupeNumericRoots(candidates)) {
    const violation = checkCandidateAgainstConstraints(candidate, constraints, angleUnit);
    if (violation) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: violation,
      });
      continue;
    }

    const residual = evaluateResidualAt(equationLatex, candidate, angleUnit);
    if (residual === null) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'produces an undefined or non-real substitution',
      });
      continue;
    }

    if (Math.abs(residual) > RESIDUAL_TOLERANCE) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: 'does not satisfy the original equation after substitution',
      });
      continue;
    }

    accepted.push(candidate);
  }

  return {
    accepted: dedupeNumericRoots(accepted),
    rejected,
  };
}

function compositionRejectionMessage(rejected: CandidateValidationResult[], constraints: SolveDomainConstraint[]) {
  return buildCompositeCandidateRejectionMessage(
    classifyCandidateRejections(rejected, constraints),
  );
}

function isApproximateOnlySolutionLatex(latex: string) {
  const normalized = latex.replaceAll('\\,', '').replaceAll(' ', '').trim();
  return /^[+-]?(?:\d+\.\d*|\d*\.\d+|\d+e[+-]?\d+)$/i.test(normalized);
}

function parseFiniteNumericValue(latex: string): number | null {
  const normalized = latex.trim();
  if (/\^\{\\circ\}$/.test(normalized)) {
    const degreeText = normalized.replace(/\^\{\\circ\}$/, '');
    const degreeValue = Number(degreeText);
    return Number.isFinite(degreeValue) ? degreeValue : null;
  }

  try {
    const numeric = ce.parse(normalized).N?.().json;
    const parsed = readNumericNode(numeric);
    if (parsed !== null) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function matchAcceptedExactSolutions(exactLatex: string | undefined, accepted: number[]) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);

  if (exactCandidates.length === 0) {
    return [] as string[];
  }

  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = exactCandidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= 1e-6);
    if (candidateIndex < 0) {
      return [] as string[];
    }
    used.add(candidateIndex);
    matched.push(exactCandidates[candidateIndex].latex);
  }

  return matched;
}

function collectOutcomeCandidates(outcome: DisplayOutcome) {
  if (outcome.kind === 'prompt') {
    return [] as number[];
  }

  const exact = dedupe(extractExactSolutions(outcome.exactLatex))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
  if (exact.length > 0) {
    return exact;
  }

  if (outcome.kind === 'success' && outcome.candidateValues && outcome.candidateValues.length > 0) {
    return dedupeNumericRoots(outcome.candidateValues);
  }

  return dedupe(extractApproxSolutions(outcome.approxText))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
}


export {
  collectOutcomeCandidates,
  compositionRejectionMessage,
  isApproximateOnlySolutionLatex,
  matchAcceptedExactSolutions,
  validateCompositionCandidates,
};
