import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatNumber, latexToApproxText, numberToLatex } from '../format';
import { MAX_RESULT_MAGNITUDE, getResultGuardError } from '../result-guard';
import {
  numericLimitAtInfinity,
  resolveInfiniteLimitHeuristic,
} from '../limit-heuristics';
import { resolveFiniteLimitRule } from '../symbolic-engine/limits';
import type {
  AdvancedCalcResultOrigin,
  AdvancedFiniteLimitState,
  AdvancedInfiniteLimitState,
  LimitDirection,
} from '../../types/calculator';

const ce = new ComputeEngine();
const LIMIT_TOLERANCE = 1e-4;
const LIMIT_STEPS = [1e-1, 5e-2, 1e-2, 5e-3, 1e-3, 5e-4, 1e-4];
const UNBOUNDED_SAMPLE_THRESHOLD = 1e3;

type BoxedLike = {
  latex: string;
  json: unknown;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
  subs: (scope: Record<string, number>) => BoxedLike;
};

export type AdvancedLimitEvaluation = {
  exactLatex?: string;
  approxText?: string;
  warnings: string[];
  error?: string;
  resultOrigin?: AdvancedCalcResultOrigin;
};

type OneSidedLimitResult =
  | { kind: 'success'; value: number }
  | { kind: 'unbounded' }
  | { kind: 'unstable' };

function box(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]) as BoxedLike;
}

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();
  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof numeric.json.num === 'string'
  ) {
    const parsed = Number(numeric.json.num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const approxText = latexToApproxText(numeric.latex);
  if (!approxText) {
    return undefined;
  }

  const parsed = Number(approxText);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function evaluateBodyAt(body: unknown, value: number) {
  try {
    const numeric = box(body).subs({ x: value }).evaluate();
    return boxedToFiniteNumber(numeric);
  } catch {
    return undefined;
  }
}

function stabilizeSamples(samples: number[]) {
  if (samples.length < 2) {
    return undefined;
  }

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    const scale = Math.max(1, Math.abs(current), Math.abs(previous));
    if (Math.abs(current - previous) <= LIMIT_TOLERANCE * scale) {
      return current;
    }
  }

  return undefined;
}

function numericOneSidedLimit(
  body: unknown,
  target: number,
  direction: 'left' | 'right',
): OneSidedLimitResult {
  const samples: number[] = [];

  for (const step of LIMIT_STEPS) {
    const x = direction === 'left' ? target - step : target + step;
    const value = evaluateBodyAt(body, x);
    if (value === undefined) {
      continue;
    }

    if (!Number.isFinite(value) || Math.abs(value) > MAX_RESULT_MAGNITUDE) {
      return { kind: 'unbounded' };
    }

    samples.push(value);
  }

  const stabilized = stabilizeSamples(samples);
  if (stabilized !== undefined) {
    return { kind: 'success', value: stabilized };
  }

  if (samples.length >= 3) {
    const recent = samples.slice(-3);
    const magnitudes = recent.map((value) => Math.abs(value));
    const sameSigned = recent.every(
      (value) => value !== 0 && Math.sign(value) === Math.sign(recent[0]),
    );
    const strictlyGrowing = magnitudes[0] < magnitudes[1] && magnitudes[1] < magnitudes[2];
    if (sameSigned && strictlyGrowing && magnitudes[2] >= UNBOUNDED_SAMPLE_THRESHOLD) {
      return { kind: 'unbounded' };
    }
  }

  return { kind: 'unstable' };
}

function numericFiniteLimit(body: unknown, target: number, direction: LimitDirection) {
  if (direction === 'left') {
    return numericOneSidedLimit(body, target, 'left');
  }

  if (direction === 'right') {
    return numericOneSidedLimit(body, target, 'right');
  }

  const left = numericOneSidedLimit(body, target, 'left');
  if (left.kind === 'unbounded') {
    return { kind: 'left-unbounded' as const };
  }
  if (left.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const right = numericOneSidedLimit(body, target, 'right');
  if (right.kind === 'unbounded') {
    return { kind: 'right-unbounded' as const };
  }
  if (right.kind === 'unstable') {
    return { kind: 'unstable' as const };
  }

  const scale = Math.max(1, Math.abs(left.value), Math.abs(right.value));
  if (Math.abs(left.value - right.value) > LIMIT_TOLERANCE * scale) {
    return { kind: 'mismatch' as const };
  }

  return { kind: 'success' as const, value: (left.value + right.value) / 2 };
}

function finiteTargetLabel(direction: LimitDirection) {
  return direction === 'left' ? 'Left-hand' : 'Right-hand';
}

export function evaluateAdvancedFiniteLimit(
  state: AdvancedFiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  const target = Number(state.target);
  if (!bodyLatex || !Number.isFinite(target)) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  try {
    const parsed = ce.parse(`\\lim_{x\\to ${target}}\\left(${bodyLatex}\\right)`) as BoxedLike;
    const body = ce.parse(bodyLatex) as BoxedLike;
    const exact = parsed.evaluate();
    if (exact.latex !== parsed.latex && !exact.latex.includes('\\lim')) {
      return {
        exactLatex: exact.latex,
        approxText: latexToApproxText((exact.N?.() ?? exact).latex),
        warnings: [],
        resultOrigin: 'symbolic',
      };
    }

    const symbolicRule = resolveFiniteLimitRule(body.json, target, 'x');
    if (symbolicRule.kind === 'success') {
      return {
        exactLatex: numberToLatex(symbolicRule.value),
        approxText: formatNumber(symbolicRule.value),
        warnings:
          symbolicRule.origin === 'heuristic-symbolic'
            ? ['Rule-based limit resolution used capped L\'Hopital on a supported ratio form.']
            : [],
        resultOrigin: symbolicRule.origin,
      };
    }

    const numeric = numericFiniteLimit(body.json, target, state.direction);
    if (numeric.kind === 'left-unbounded') {
      return { warnings: [], error: 'Left-hand limit appears unbounded near the target.' };
    }
    if (numeric.kind === 'right-unbounded') {
      return { warnings: [], error: 'Right-hand limit appears unbounded near the target.' };
    }
    if (numeric.kind === 'mismatch') {
      return { warnings: [], error: 'Left and right behavior do not agree near the target.' };
    }
    if (numeric.kind === 'unbounded') {
      return {
        warnings: [],
        error: `${finiteTargetLabel(state.direction)} limit appears unbounded near the target.`,
      };
    }
    if (numeric.kind !== 'success') {
      return { warnings: [], error: 'This limit could not be stabilized numerically in Advanced Calc.' };
    }

    const guardError = getResultGuardError(numberToLatex(numeric.value), formatNumber(numeric.value));
    if (guardError) {
      return { warnings: [], error: guardError };
    }

    return {
      exactLatex: numberToLatex(numeric.value),
      approxText: formatNumber(numeric.value),
      warnings: ['Symbolic limit unavailable; showing a numeric finite limit approximation.'],
      resultOrigin: 'numeric-fallback',
    };
  } catch {
    return {
      warnings: [],
      error: 'This symbolic limit is outside the supported Advanced Calc rules.',
    };
  }
}

export function evaluateAdvancedInfiniteLimit(
  state: AdvancedInfiniteLimitState,
): AdvancedLimitEvaluation {
  const bodyLatex = state.bodyLatex.trim();
  if (!bodyLatex) {
    return {
      warnings: [],
      error: 'Limits require a numeric target or +/-infinity in this milestone.',
    };
  }

  const body = ce.parse(bodyLatex).json;
  const heuristic = resolveInfiniteLimitHeuristic(body, 'x');
  if (heuristic.kind === 'success') {
    return {
      exactLatex: numberToLatex(heuristic.value),
      approxText: formatNumber(heuristic.value),
      warnings: [],
      resultOrigin: 'heuristic-symbolic',
    };
  }

  if (heuristic.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${state.targetKind === 'posInfinity' ? '+infinity' : '-infinity'}.`,
    };
  }

  const numeric = numericLimitAtInfinity(
    (value) => evaluateBodyAt(body, value),
    state.targetKind,
  );

  if (numeric.kind === 'unbounded') {
    return {
      warnings: [],
      error: `The limit appears unbounded as x approaches ${state.targetKind === 'posInfinity' ? '+infinity' : '-infinity'}.`,
    };
  }

  if (numeric.kind !== 'success') {
    return {
      warnings: [],
      error: 'This limit could not be stabilized numerically in Advanced Calc.',
    };
  }

  const guardError = getResultGuardError(numberToLatex(numeric.value), formatNumber(numeric.value));
  if (guardError) {
    return { warnings: [], error: guardError };
  }

  return {
    exactLatex: numberToLatex(numeric.value),
    approxText: formatNumber(numeric.value),
    warnings: ['Symbolic limit unavailable; showing a numeric infinite-target approximation.'],
    resultOrigin: 'numeric-fallback',
  };
}
