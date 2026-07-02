import { differentiateAst } from '../differentiation';
import { simplifyNode } from '../differentiation';
import { isNodeArray } from '../patterns';
import type { DisplayDetailSection } from '../../../types/calculator';
import { limitMethodSection } from './detail-readback';
import {
  box,
  evaluateNodeAt,
  isHuge,
  isZeroish,
  latexToNumber,
} from './evaluation';
import type { FiniteLimitRuleValue } from './types';

const DEFAULT_MAX_LHOSPITAL_ITERATIONS = 5;
const DEFAULT_MAX_LHOSPITAL_NODES = 220;
const DEFAULT_MAX_LHOSPITAL_DEPTH = 36;
const INFINITY_SAMPLES = [20, 40, 80, 120];

export type LHospitalAttemptOptions = {
  maxIterations?: number;
  maxNodes?: number;
  maxDepth?: number;
};

export type LHospitalAttempt =
  | {
      kind: 'success';
      value: FiniteLimitRuleValue;
      exactLatex?: string;
      detailSections: DisplayDetailSection[];
      iterations: number;
    }
  | {
      kind: 'unsupported';
      reason: string;
      detailSections: DisplayDetailSection[];
      iterations: number;
    }
  | {
      kind: 'too-complex';
      reason: string;
      detailSections: DisplayDetailSection[];
      iterations: number;
    };

function profileNode(node: unknown): { nodeCount: number; maxDepth: number } {
  if (!isNodeArray(node)) {
    return { nodeCount: 1, maxDepth: 1 };
  }

  let nodeCount = 1;
  let maxDepth = 1;
  for (const child of node.slice(1)) {
    const childProfile = profileNode(child);
    nodeCount += childProfile.nodeCount;
    maxDepth = Math.max(maxDepth, childProfile.maxDepth + 1);
  }
  return { nodeCount, maxDepth };
}

function optionsWithDefaults(options: LHospitalAttemptOptions | undefined) {
  return {
    maxIterations: options?.maxIterations ?? DEFAULT_MAX_LHOSPITAL_ITERATIONS,
    maxNodes: options?.maxNodes ?? DEFAULT_MAX_LHOSPITAL_NODES,
    maxDepth: options?.maxDepth ?? DEFAULT_MAX_LHOSPITAL_DEPTH,
  };
}

function unsupported(reason: string, lines: string[], iterations: number): LHospitalAttempt {
  return {
    kind: 'unsupported',
    reason,
    detailSections: limitMethodSection(...lines, reason),
    iterations,
  };
}

function tooComplex(reason: string, lines: string[], iterations: number): LHospitalAttempt {
  return {
    kind: 'too-complex',
    reason,
    detailSections: limitMethodSection(...lines, reason),
    iterations,
  };
}

function normalizeExactLatex(latex: string) {
  return latex
    .replace(/\\frac\{-([^{}]+)\}\{([^{}]+)\}/gu, '-\\frac{$1}{$2}')
    .replace(/\\frac\{([^{}]+)\}\{-([^{}]+)\}/gu, '-\\frac{$1}{$2}');
}

function numericFromEvaluatedBox(evaluated: ReturnType<typeof box>) {
  if (typeof evaluated.json === 'number' && Number.isFinite(evaluated.json)) {
    return evaluated.json;
  }

  if (
    isNodeArray(evaluated.json)
    && evaluated.json[0] === 'Rational'
    && typeof evaluated.json[1] === 'number'
    && typeof evaluated.json[2] === 'number'
    && evaluated.json[2] !== 0
  ) {
    return evaluated.json[1] / evaluated.json[2];
  }

  const numeric = evaluated.N?.() ?? evaluated;
  return latexToNumber(numeric.latex);
}

function finiteEvaluation(node: unknown, target: number, variable: string) {
  try {
    const evaluated = box(node).subs({ [variable]: target }).evaluate();
    const value = numericFromEvaluatedBox(evaluated);
    if (value === undefined || !Number.isFinite(value)) {
      return undefined;
    }
    return {
      value,
      exactLatex: normalizeExactLatex(evaluated.latex),
    };
  } catch {
    return undefined;
  }
}

function signToInfinity(value: number): FiniteLimitRuleValue {
  return value < 0 ? 'negInfinity' : 'posInfinity';
}

function infinityEvaluation(
  node: unknown,
  targetKind: 'posInfinity' | 'negInfinity',
  variable: string,
): { value: FiniteLimitRuleValue; exactLatex?: string } | undefined {
  const sign = targetKind === 'posInfinity' ? 1 : -1;
  const values: number[] = [];

  for (const sample of INFINITY_SAMPLES) {
    const value = evaluateNodeAt(node, sign * sample, variable);
    if (value === undefined || !Number.isFinite(value)) {
      return undefined;
    }
    values.push(value);
  }

  const magnitudes = values.map((value) => Math.abs(value));
  const last = values.at(-1) ?? 0;
  const previous = values.at(-2) ?? 0;
  const older = values.at(-3) ?? 0;
  const scale = Math.max(1, Math.abs(last), Math.abs(previous));
  if (Math.abs(last - previous) <= 1e-6 * scale) {
    const value = Math.abs(last) < 1e-8 ? 0 : last;
    return {
      value,
      exactLatex: value === 0 ? '0' : undefined,
    };
  }

  const lastMagnitude = magnitudes.at(-1) ?? 0;
  const previousMagnitude = magnitudes.at(-2) ?? 0;
  const olderMagnitude = magnitudes.at(-3) ?? 0;
  if (
    lastMagnitude > 1e6
    && previousMagnitude > 0
    && olderMagnitude > 0
    && lastMagnitude > previousMagnitude * 1.5
    && previousMagnitude > olderMagnitude * 1.5
  ) {
    return {
      value: signToInfinity(last),
      exactLatex: last < 0 ? '-\\infty' : '\\infty',
    };
  }

  if (
    lastMagnitude < 1e-6
    && lastMagnitude < Math.abs(previous)
    && Math.abs(previous) < Math.abs(older)
  ) {
    return { value: 0, exactLatex: '0' };
  }

  return undefined;
}

function ensureBudget(
  node: unknown,
  options: ReturnType<typeof optionsWithDefaults>,
  lines: string[],
  iterations: number,
): LHospitalAttempt | undefined {
  const profile = profileNode(node);
  if (profile.nodeCount > options.maxNodes || profile.maxDepth > options.maxDepth) {
    return tooComplex(
      `L'Hospital stopped because the derivative quotient exceeded the route budget (${profile.nodeCount} nodes, depth ${profile.maxDepth}).`,
      lines,
      iterations,
    );
  }
  return undefined;
}

function isFiniteIndeterminateQuotient(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return false;
  }

  const numerator = node[1];
  const denominator = node[2];
  const numeratorValue = evaluateNodeAt(numerator, target, variable);
  const denominatorValue = evaluateNodeAt(denominator, target, variable);

  const zeroOverZero = isZeroish(numeratorValue) && isZeroish(denominatorValue);
  const infinityOverInfinity = isHuge(numeratorValue) && isHuge(denominatorValue);
  return zeroOverZero || infinityOverInfinity;
}

function differentiateQuotient(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  return [
    'Divide',
    simplifyNode(differentiateAst(node[1], variable)),
    simplifyNode(differentiateAst(node[2], variable)),
  ];
}

export function attemptLHospital(
  node: unknown,
  target: number,
  variable = 'x',
  options?: LHospitalAttemptOptions,
): LHospitalAttempt {
  const budget = optionsWithDefaults(options);
  const lines = ["Form detected: L'Hospital route selected for an indeterminate quotient."];

  if (!isFiniteIndeterminateQuotient(node, target, variable)) {
    return unsupported("L'Hospital needs a finite 0/0 or infinity/infinity quotient.", lines, 0);
  }

  let current = node;
  for (let iteration = 1; iteration <= budget.maxIterations; iteration += 1) {
    const overBudget = ensureBudget(current, budget, lines, iteration - 1);
    if (overBudget) {
      return overBudget;
    }

    const nextNode = differentiateQuotient(current, variable);
    if (!nextNode) {
      return unsupported("L'Hospital stopped because the expression is no longer a quotient.", lines, iteration - 1);
    }

    current = nextNode;
    lines.push(`Iteration ${iteration}: differentiated numerator and denominator.`);

    const evaluated = finiteEvaluation(current, target, variable);
    if (evaluated) {
      return {
        kind: 'success',
        value: evaluated.value,
        exactLatex: evaluated.exactLatex,
        detailSections: limitMethodSection(
          ...lines,
          `Key calculation: the differentiated quotient evaluates to ${evaluated.exactLatex} at the target.`,
          `Conclusion: final limit is ${evaluated.exactLatex}.`,
        ),
        iterations: iteration,
      };
    }

    if (!isFiniteIndeterminateQuotient(current, target, variable)) {
      return unsupported(
        "L'Hospital stopped because the differentiated quotient is not a supported indeterminate form.",
        lines,
        iteration,
      );
    }
  }

  return tooComplex(
    `L'Hospital stopped after ${budget.maxIterations} iterations.`,
    lines,
    budget.maxIterations,
  );
}

export function attemptInfiniteLHospital(
  node: unknown,
  targetKind: 'posInfinity' | 'negInfinity',
  variable = 'x',
  options?: LHospitalAttemptOptions,
): LHospitalAttempt {
  const budget = optionsWithDefaults(options);
  const lines = ["Form detected: L'Hospital route selected for a quotient at infinity."];

  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return unsupported("L'Hospital at infinity needs a quotient.", lines, 0);
  }

  let current = node;
  for (let iteration = 1; iteration <= budget.maxIterations; iteration += 1) {
    const overBudget = ensureBudget(current, budget, lines, iteration - 1);
    if (overBudget) {
      return overBudget;
    }

    const nextNode = differentiateQuotient(current, variable);
    if (!nextNode) {
      return unsupported("L'Hospital stopped because the expression is no longer a quotient.", lines, iteration - 1);
    }

    current = nextNode;
    lines.push(`Iteration ${iteration}: differentiated numerator and denominator.`);

    const evaluated = infinityEvaluation(current, targetKind, variable);
    if (evaluated) {
      return {
        kind: 'success',
        value: evaluated.value,
        exactLatex: evaluated.exactLatex,
        detailSections: limitMethodSection(
          ...lines,
          `Key calculation: the differentiated quotient stabilizes to ${evaluated.exactLatex ?? evaluated.value} at infinity.`,
          `Conclusion: final limit is ${evaluated.exactLatex ?? evaluated.value}.`,
        ),
        iterations: iteration,
      };
    }
  }

  return tooComplex(
    `L'Hospital stopped after ${budget.maxIterations} iterations.`,
    lines,
    budget.maxIterations,
  );
}
