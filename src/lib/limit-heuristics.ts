import { MAX_RESULT_MAGNITUDE } from './result-guard';
import type { DisplayDetailSection, LimitTargetKind } from '../types/calculator';

const LIMIT_TOLERANCE = 1e-4;
const INFINITE_SAMPLES = [10, 20, 50, 100, 200, 500, 1000];
const LIMIT_UNBOUNDED_THRESHOLD = 1e4;

export type LimitResolution =
  | { kind: 'success'; value: number | 'posInfinity' | 'negInfinity'; detailSections?: DisplayDetailSection[] }
  | { kind: 'unbounded' }
  | { kind: 'mismatch' }
  | { kind: 'unstable' };

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

function normalizeZero(value: number) {
  return Math.abs(value) < 1e-10 ? 0 : value;
}

function limitMethodSection(...lines: string[]): DisplayDetailSection[] {
  return [{
    title: 'Limit Method',
    lines,
  }];
}

function rationalDominanceDetail(...lines: string[]) {
  return limitMethodSection(
    'Compared polynomial degrees and leading coefficients for bounded rational dominance at infinity.',
    ...lines,
  );
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
      return normalizeZero(current);
    }
  }

  return undefined;
}

function isUnboundedTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last >= LIMIT_UNBOUNDED_THRESHOLD
    && previous > 0
    && older > 0
    && last > previous * 1.5
    && previous > older * 1.5;
}

function isZeroTrend(samples: number[]) {
  if (samples.length < 3) {
    return false;
  }

  const magnitudes = samples.map((sample) => Math.abs(sample));
  const last = magnitudes.at(-1) ?? 0;
  const previous = magnitudes.at(-2) ?? 0;
  const older = magnitudes.at(-3) ?? 0;

  return last <= 5e-3 && last < previous && previous < older;
}

type PolynomialInfo = {
  degree: number;
  leadingCoefficient: number;
};

function polynomialTerms(node: unknown, variable: string): Map<number, number> | undefined {
  if (!dependsOnVariable(node, variable)) {
    const constant = numericConstant(node);
    if (constant === undefined) {
      return undefined;
    }
    return new Map([[0, constant]]);
  }

  if (node === variable) {
    return new Map([[1, 1]]);
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const result = new Map<number, number>();
    for (const term of node.slice(1)) {
      const termMap = polynomialTerms(term, variable);
      if (!termMap) {
        return undefined;
      }

      for (const [degree, coefficient] of termMap.entries()) {
        result.set(degree, (result.get(degree) ?? 0) + coefficient);
      }
    }

    return result;
  }

  if (isNodeArray(node) && node[0] === 'Multiply') {
    let coefficient = 1;
    let degree = 0;

    for (const factor of node.slice(1)) {
      if (!dependsOnVariable(factor, variable)) {
        const constant = numericConstant(factor);
        if (constant === undefined) {
          return undefined;
        }
        coefficient *= constant;
        continue;
      }

      if (factor === variable) {
        degree += 1;
        continue;
      }

      if (
        isNodeArray(factor)
        && factor[0] === 'Power'
        && factor.length === 3
        && factor[1] === variable
        && isFiniteNumber(factor[2])
        && Number.isInteger(factor[2])
      ) {
        degree += factor[2];
        continue;
      }

      return undefined;
    }

    return new Map([[degree, coefficient]]);
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
    && isFiniteNumber(node[2])
    && Number.isInteger(node[2])
  ) {
    return new Map([[node[2], 1]]);
  }

  return undefined;
}

function numericConstant(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  if (!isNodeArray(node)) {
    return undefined;
  }

  if (node[0] === 'Multiply') {
    let product = 1;
    for (const factor of node.slice(1)) {
      const numeric = numericConstant(factor);
      if (numeric === undefined) {
        return undefined;
      }
      product *= numeric;
    }
    return product;
  }

  return undefined;
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

function analyzePolynomial(node: unknown, variable: string): PolynomialInfo | undefined {
  const terms = polynomialTerms(node, variable);
  if (!terms || terms.size === 0) {
    return undefined;
  }

  let degree = Number.NEGATIVE_INFINITY;
  let leadingCoefficient = 0;
  for (const [candidateDegree, coefficient] of terms.entries()) {
    if (Math.abs(coefficient) < 1e-10) {
      continue;
    }

    if (candidateDegree > degree) {
      degree = candidateDegree;
      leadingCoefficient = coefficient;
    }
  }

  if (!Number.isFinite(degree)) {
    return { degree: 0, leadingCoefficient: 0 };
  }

  return { degree, leadingCoefficient };
}

export function resolveInfiniteLimitHeuristic(
  body: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
): LimitResolution | { kind: 'unhandled' } {
  const targetSign = targetKind === 'posInfinity' ? 1 : -1;
  const signedInfinity = (sign: number) => sign >= 0 ? 'posInfinity' as const : 'negInfinity' as const;
  const signAtInfinity = (leadingCoefficient: number, degree: number) =>
    leadingCoefficient * (targetSign ** degree);

  if (dependsOnVariable(body, variable) === false) {
    const constant = numericConstant(body);
    if (constant === undefined) {
      return { kind: 'unhandled' };
    }
    return {
      kind: 'success',
      value: constant,
      detailSections: limitMethodSection('The expression is constant with respect to the limit variable.'),
    };
  }

  const polynomial = analyzePolynomial(body, variable);
  if (polynomial) {
    if (polynomial.degree === 0) {
      return {
        kind: 'success',
        value: polynomial.leadingCoefficient,
        detailSections: rationalDominanceDetail('The polynomial has degree 0, so the constant term is the limit.'),
      };
    }
    return {
      kind: 'success',
      value: signedInfinity(signAtInfinity(polynomial.leadingCoefficient, polynomial.degree)),
      detailSections: rationalDominanceDetail(
        `The polynomial degree is ${polynomial.degree}; its leading term determines signed divergence.`,
      ),
    };
  }

  if (isNodeArray(body) && body[0] === 'Divide' && body.length === 3) {
    const numerator = analyzePolynomial(body[1], variable);
    const denominator = analyzePolynomial(body[2], variable);
    if (!numerator || !denominator) {
      return { kind: 'unhandled' };
    }

    if (numerator.degree < denominator.degree) {
      return {
        kind: 'success',
        value: 0,
        detailSections: rationalDominanceDetail(
          `Numerator degree ${numerator.degree} is lower than denominator degree ${denominator.degree}, so the ratio tends to 0.`,
        ),
      };
    }

    if (numerator.degree === denominator.degree) {
      return {
        kind: 'success',
        value: normalizeZero(numerator.leadingCoefficient / denominator.leadingCoefficient),
        detailSections: rationalDominanceDetail(
          `Degrees match at ${numerator.degree}; the limit is the leading-coefficient ratio.`,
        ),
      };
    }

    const degreeGap = numerator.degree - denominator.degree;
    const leadingRatio = numerator.leadingCoefficient / denominator.leadingCoefficient;
    return {
      kind: 'success',
      value: signedInfinity(signAtInfinity(leadingRatio, degreeGap)),
      detailSections: rationalDominanceDetail(
        `Numerator degree ${numerator.degree} exceeds denominator degree ${denominator.degree}; the leading ratio and target side determine signed infinity.`,
      ),
    };
  }

  return { kind: 'unhandled' };
}

export function numericLimitAtInfinity(
  evaluator: (value: number) => number | undefined,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): LimitResolution {
  const sign = targetKind === 'posInfinity' ? 1 : -1;
  const samples: number[] = [];

  for (const magnitude of INFINITE_SAMPLES) {
    const value = evaluator(sign * magnitude);
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

  if (isZeroTrend(samples)) {
    return { kind: 'success', value: 0 };
  }

  if (isUnboundedTrend(samples)) {
    return { kind: 'unbounded' };
  }

  return { kind: 'unstable' };
}
