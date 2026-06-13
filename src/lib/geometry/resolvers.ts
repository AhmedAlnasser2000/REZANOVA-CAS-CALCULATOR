import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatNumber, latexToApproxText } from '../display/format';

type BoxedLike = {
  json: unknown;
  latex: string;
  evaluate: () => BoxedLike;
  N?: () => BoxedLike;
};

export type ScalarResolution = {
  ok: boolean;
  value: number;
  normalizedLatex: string;
  error: string;
};

export type PointResolution = {
  ok: boolean;
  point: { x: string; y: string };
  error: string;
};

export type CoordinateResolution = {
  ok: boolean;
  unknown: boolean;
  value: number;
  normalizedLatex: string;
  error: string;
};

const ce = new ComputeEngine();

function boxedToFiniteNumber(expr: BoxedLike) {
  const numeric = expr.N?.() ?? expr.evaluate();
  if (typeof numeric.json === 'number' && Number.isFinite(numeric.json)) {
    return numeric.json;
  }

  if (
    typeof numeric.json === 'object'
    && numeric.json !== null
    && 'num' in numeric.json
    && typeof (numeric.json as { num: unknown }).num === 'string'
  ) {
    const parsed = Number((numeric.json as { num: string }).num);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  const approx = latexToApproxText(numeric.latex);
  if (!approx) {
    return undefined;
  }

  const parsed = Number(approx);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveScalar(latex: string, label: string): ScalarResolution {
  const trimmed = latex.trim();
  if (!trimmed || trimmed === '?') {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `Enter ${label} before evaluating.`,
    };
  }

  try {
    // Geometry solve-missing templates commonly include `pi` in relation values.
    const normalizedForCe = trimmed.replace(/\bpi\b/g, '\\pi');
    const boxed = ce.parse(normalizedForCe) as BoxedLike;
    const value = boxedToFiniteNumber(boxed);
    if (value === undefined) {
      return {
        ok: false,
        value: Number.NaN,
        normalizedLatex: '',
        error: `${label} must evaluate to a finite numeric value.`,
      };
    }

    return {
      ok: true,
      value,
      normalizedLatex: formatNumber(value),
      error: '',
    };
  } catch {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `${label} could not be parsed as a Geometry value.`,
    };
  }
}

export function resolvePositiveScalar(latex: string, label: string): ScalarResolution {
  const resolved = resolveScalar(latex, label);
  if (!resolved.ok) {
    return resolved;
  }
  if (!(resolved.value > 0)) {
    return {
      ok: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: `${label} must evaluate to a positive numeric value.`,
    };
  }
  return resolved;
}

export function resolvePoint(
  point: { xLatex: string; yLatex: string },
  label: string,
): PointResolution {
  const x = resolveScalar(point.xLatex, `${label} x-coordinate`);
  if (!x.ok) {
    return {
      ok: false,
      point: { x: '', y: '' },
      error: x.error,
    };
  }

  const y = resolveScalar(point.yLatex, `${label} y-coordinate`);
  if (!y.ok) {
    return {
      ok: false,
      point: { x: '', y: '' },
      error: y.error,
    };
  }

  return {
    ok: true,
    point: {
      x: x.normalizedLatex,
      y: y.normalizedLatex,
    },
    error: '',
  };
}

export function isUnknownLatex(value: string) {
  return value.trim() === '?';
}

export function resolveCoordinateValue(
  valueLatex: string,
  label: string,
): CoordinateResolution {
  if (isUnknownLatex(valueLatex)) {
    return {
      ok: true,
      unknown: true,
      value: Number.NaN,
      normalizedLatex: '?',
      error: '',
    };
  }
  const resolved = resolveScalar(valueLatex, label);
  if (!resolved.ok) {
    return {
      ok: false,
      unknown: false,
      value: Number.NaN,
      normalizedLatex: '',
      error: resolved.error,
    };
  }
  return {
    ok: true,
    unknown: false,
    value: resolved.value,
    normalizedLatex: resolved.normalizedLatex,
    error: '',
  };
}
