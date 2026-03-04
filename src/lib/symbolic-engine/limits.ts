import { ComputeEngine } from '@cortex-js/compute-engine';
import { differentiateAst } from './differentiation';
import { isNodeArray } from './patterns';

const ce = new ComputeEngine();

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function latexToNumber(latex: string) {
  const normalized = latex
    .replaceAll('\\cdot', '')
    .replaceAll('\\,', '')
    .replaceAll(' ', '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function evaluateNodeAt(node: unknown, value: number, variable = 'x') {
  try {
    const evaluated = box(node).subs({ [variable]: value }).evaluate();
    if (typeof evaluated.json === 'number' && Number.isFinite(evaluated.json)) {
      return evaluated.json;
    }
    return latexToNumber((evaluated.N?.() ?? evaluated).latex);
  } catch {
    return undefined;
  }
}

function isZeroish(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) < 1e-8;
}

function isHuge(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && Math.abs(value) > 1e8;
}

export function attemptLHospital(node: unknown, target: number, variable = 'x', remaining = 3): number | undefined {
  if (remaining <= 0 || !isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = node[1];
  const denominator = node[2];
  const numeratorValue = evaluateNodeAt(numerator, target, variable);
  const denominatorValue = evaluateNodeAt(denominator, target, variable);

  const zeroOverZero = isZeroish(numeratorValue) && isZeroish(denominatorValue);
  const infinityOverInfinity = isHuge(numeratorValue) && isHuge(denominatorValue);
  if (!zeroOverZero && !infinityOverInfinity) {
    return undefined;
  }

  const nextNode = ['Divide', differentiateAst(numerator, variable), differentiateAst(denominator, variable)];
  const evaluated = evaluateNodeAt(nextNode, target, variable);
  if (evaluated !== undefined) {
    return evaluated;
  }

  return attemptLHospital(nextNode, target, variable, remaining - 1);
}

export function resolveFiniteLimitRule(node: unknown, target: number, variable = 'x') {
  try {
    const evaluated = box(node).subs({ [variable]: target }).evaluate();
    if (!evaluated.latex.includes('Undefined') && !evaluated.latex.includes('\\infty')) {
      const numeric = typeof evaluated.json === 'number' ? evaluated.json : latexToNumber((evaluated.N?.() ?? evaluated).latex);
      if (numeric !== undefined) {
        return { kind: 'success' as const, value: numeric, origin: 'symbolic' as const };
      }
    }
  } catch {
    // ignore direct substitution failures
  }

  const byLHospital = attemptLHospital(node, target, variable);
  if (byLHospital !== undefined) {
    return { kind: 'success' as const, value: byLHospital, origin: 'heuristic-symbolic' as const };
  }

  return { kind: 'unhandled' as const };
}
