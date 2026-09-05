import { ComputeEngine } from '@cortex-js/compute-engine';
import { evaluateRealNumericExpression } from '../../numeric/real-numeric-eval';
import { dedupeNumericRoots } from '../candidate-validation';
import {
  createPreparedConstraintCheckerAtTarget,
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
  CanonicalMathValueV1,
  ResultProducerDraft,
  SerializableMathJson,
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

function createCompositionResidualEvaluator(
  equationLatex: string,
  angleUnit: AngleUnit,
) {
  const zeroFormLatex = equationToZeroFormLatex(equationLatex);
  const expr = ce.parse(zeroFormLatex);

  return (value: number) => {
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
  };
}

function validateCompositionCandidates(
  equationLatex: string,
  candidates: number[],
  constraints: SolveDomainConstraint[],
  angleUnit: AngleUnit,
) {
  const accepted: number[] = [];
  const rejected: CandidateValidationResult[] = [];
  const checkConstraints = createPreparedConstraintCheckerAtTarget(
    'x',
    constraints,
    angleUnit,
  );
  const evaluateResidual = createCompositionResidualEvaluator(equationLatex, angleUnit);

  for (const candidate of dedupeNumericRoots(candidates)) {
    const violation = checkConstraints(candidate);
    if (violation) {
      rejected.push({
        kind: 'rejected',
        value: candidate,
        reason: violation,
      });
      continue;
    }

    const residual = evaluateResidual(candidate);
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

const STRUCTURAL_LATEX_OPTIONS = {
  prettify: false,
  invisibleMultiply: '\\cdot',
  invisiblePlus: '',
  multiply: '\\cdot',
} as const;

function nativeFiniteRootCandidates(primaryMath: CanonicalMathValueV1 | undefined) {
  if (primaryMath?.mathJson === undefined || !Array.isArray(primaryMath.mathJson)) {
    return [] as Array<{ latex: string; numeric: number }>;
  }
  const root = primaryMath.mathJson;
  const nodes = root[0] === 'Equal' && root.length === 3
    ? [root[2] as SerializableMathJson]
    : root[0] === 'Element'
      && Array.isArray(root[2])
      && root[2][0] === 'Set'
        ? root[2].slice(1) as SerializableMathJson[]
        : [];

  return nodes.flatMap((node) => {
    try {
      const boxed = ce.box(node as Parameters<typeof ce.box>[0], { form: 'structural' });
      const canonical = boxed.canonical;
      const numeric = readNumericNode((canonical.N?.() ?? canonical).json);
      return numeric === null
        ? []
        : [{
            latex: boxed.toLatex(STRUCTURAL_LATEX_OPTIONS),
            numeric,
          }];
    } catch {
      return [];
    }
  });
}

function matchAcceptedCandidates(
  candidates: Array<{ latex: string; numeric: number }>,
  accepted: number[],
) {
  if (candidates.length === 0) return [] as string[];
  const used = new Set<number>();
  const matched: string[] = [];

  for (const acceptedValue of accepted) {
    const candidateIndex = candidates.findIndex((candidate, index) =>
      !used.has(index)
      && Math.abs(candidate.numeric - acceptedValue) <= 1e-6);
    if (candidateIndex < 0) return [] as string[];
    used.add(candidateIndex);
    matched.push(candidates[candidateIndex].latex);
  }

  return matched;
}

function matchAcceptedExactSolutions(
  exactLatex: string | undefined,
  accepted: number[],
  primaryMath?: CanonicalMathValueV1,
  producerBranchesLatex?: readonly string[],
) {
  if (!exactLatex || accepted.length === 0) {
    return [] as string[];
  }

  if (producerBranchesLatex) {
    const candidates = producerBranchesLatex
      .map((latex) => ({ latex, numeric: parseFiniteNumericValue(latex) }))
      .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);
    const matchedProducerBranches = matchAcceptedCandidates(candidates, accepted);
    if (matchedProducerBranches.length === accepted.length) return matchedProducerBranches;
  }

  const nativeCandidates = nativeFiniteRootCandidates(primaryMath);
  const matchedNative = matchAcceptedCandidates(nativeCandidates, accepted);
  if (matchedNative.length === accepted.length) return matchedNative;

  const exactCandidates = dedupe(extractExactSolutions(exactLatex))
    .map((latex) => ({
      latex,
      numeric: parseFiniteNumericValue(latex),
    }))
    .filter((candidate): candidate is { latex: string; numeric: number } => candidate.numeric !== null);
  return matchAcceptedCandidates(exactCandidates, accepted);
}

function collectOutcomeCandidates(outcome: ResultProducerDraft) {
  if (outcome.kind === 'prompt') {
    return [] as number[];
  }

  if (outcome.kind === 'success' && outcome.candidateValues && outcome.candidateValues.length > 0) {
    return dedupeNumericRoots(outcome.candidateValues);
  }

  const exact = dedupe(extractExactSolutions(outcome.exactLatex))
    .map((latex) => parseFiniteNumericValue(latex))
    .filter((value): value is number => value !== null);
  if (exact.length > 0) {
    return exact;
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
