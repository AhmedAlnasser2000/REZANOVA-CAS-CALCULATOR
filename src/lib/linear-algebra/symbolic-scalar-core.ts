import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ComplexExactForm,
  LinearAlgebraScalarDomain,
  LinearAlgebraScalarWireV1,
  SerializableMathJson,
} from '../../types/calculator';
import { formatApproxNumber } from '../display/format';
import { linearAlgebraScalarWireFromMathJson } from './scalar-wire';

export type SymbolicScalarZeroStatus = 'zero' | 'nonzero' | 'unknown';

export type SymbolicScalarResult =
  | { ok: true; value: LinearAlgebraScalarWireV1 }
  | { ok: false; error: string };

const ce = new ComputeEngine();
const MAX_SYMBOLIC_SCALAR_NODES = 1_500;
const MAX_EAGER_SIMPLIFY_NODES = 120;

function nodeCount(value: unknown): number {
  if (Array.isArray(value)) {
    return 1 + value.slice(1).reduce((total, child) => total + nodeCount(child), 0);
  }
  if (value && typeof value === 'object') {
    return 1 + Object.values(value).reduce((total, child) => total + nodeCount(child), 0);
  }
  return 1;
}

function normalizedArithmeticNode(value: unknown): unknown {
  if (nodeCount(value) > MAX_EAGER_SIMPLIFY_NODES) return structuredClone(value);
  try {
    const boxed = ce.box(value as never, { form: 'structural' });
    if (!boxed.isValid) return structuredClone(value);
    return boxed.simplify().json;
  } catch {
    return structuredClone(value);
  }
}

export function symbolicScalarFromMathJson(
  value: unknown,
  domain: LinearAlgebraScalarDomain,
): SymbolicScalarResult {
  if (nodeCount(value) > MAX_SYMBOLIC_SCALAR_NODES) {
    return {
      ok: false,
      error: 'This symbolic scalar exceeded the bounded Linear Algebra expression limit.',
    };
  }
  const normalized = normalizedArithmeticNode(value);
  if (nodeCount(normalized) > MAX_SYMBOLIC_SCALAR_NODES) {
    return {
      ok: false,
      error: 'This symbolic scalar exceeded the bounded Linear Algebra expression limit.',
    };
  }
  return linearAlgebraScalarWireFromMathJson(normalized, domain);
}

function requireScalar(
  value: unknown,
  domain: LinearAlgebraScalarDomain,
): LinearAlgebraScalarWireV1 {
  const result = symbolicScalarFromMathJson(value, domain);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

export function symbolicScalarAdd(
  left: LinearAlgebraScalarWireV1,
  right: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Add', left.mathJson, right.mathJson], domain);
}

export function symbolicScalarSubtract(
  left: LinearAlgebraScalarWireV1,
  right: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Subtract', left.mathJson, right.mathJson], domain);
}

export function symbolicScalarMultiply(
  left: LinearAlgebraScalarWireV1,
  right: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Multiply', left.mathJson, right.mathJson], domain);
}

export function symbolicScalarDivide(
  numerator: LinearAlgebraScalarWireV1,
  denominator: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Divide', numerator.mathJson, denominator.mathJson], domain);
}

export function symbolicScalarNegate(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Negate', value.mathJson], domain);
}

export function symbolicScalarConjugate(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return domain === 'real'
    ? value
    : requireScalar(['Conjugate', value.mathJson], domain);
}

export function symbolicScalarSqrt(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Sqrt', value.mathJson], domain);
}

export function symbolicScalarAbs(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar(['Abs', value.mathJson], domain);
}

export function symbolicScalarArccos(
  value: LinearAlgebraScalarWireV1,
  domain: LinearAlgebraScalarDomain,
) {
  if (value.exactRational?.numerator === 0) {
    return requireScalar(['Divide', 'Pi', 2], domain);
  }
  if (
    value.exactRational
    && value.exactRational.numerator === value.exactRational.denominator
  ) {
    return requireScalar(0, domain);
  }
  if (
    value.exactRational
    && value.exactRational.numerator === -value.exactRational.denominator
  ) {
    return requireScalar('Pi', domain);
  }
  return requireScalar(['Arccos', value.mathJson], domain);
}

export function symbolicScalarScaleByRational(
  value: LinearAlgebraScalarWireV1,
  numerator: number,
  denominator: number,
  domain: LinearAlgebraScalarDomain,
) {
  return requireScalar([
    'Multiply',
    denominator === 1 ? numerator : ['Rational', numerator, denominator],
    value.mathJson,
  ], domain);
}

export function symbolicScalarZeroStatus(
  value: LinearAlgebraScalarWireV1,
): SymbolicScalarZeroStatus {
  const exact = value.exactComplexRational;
  if (exact) {
    return exact.re.numerator === 0 && exact.im.numerator === 0 ? 'zero' : 'nonzero';
  }
  try {
    if (ce.box(value.mathJson, { form: 'structural' }).isEqual(0) === true) return 'zero';
  } catch {
    // Unknown symbolic equality remains a condition for the caller.
  }
  return 'unknown';
}

export function symbolicScalarNumericValue(
  value: LinearAlgebraScalarWireV1,
): { re: number; im: number } | null {
  if (value.exactComplexRational) {
    return {
      re: value.exactComplexRational.re.numerator / value.exactComplexRational.re.denominator,
      im: value.exactComplexRational.im.numerator / value.exactComplexRational.im.denominator,
    };
  }
  try {
    const numeric = ce.box(value.mathJson, { form: 'structural' }).N().json;
    if (typeof numeric === 'number' && Number.isFinite(numeric)) return { re: numeric, im: 0 };
    if (
      Array.isArray(numeric)
      && numeric[0] === 'Complex'
      && typeof numeric[1] === 'number'
      && typeof numeric[2] === 'number'
      && Number.isFinite(numeric[1])
      && Number.isFinite(numeric[2])
    ) {
      return { re: numeric[1], im: numeric[2] };
    }
  } catch {
    // Formal expressions do not have a numeric readback.
  }
  return null;
}

export function symbolicScalarApproxText(
  value: LinearAlgebraScalarWireV1,
  form: ComplexExactForm = 'rectangular',
) {
  const numeric = symbolicScalarNumericValue(value);
  if (!numeric) return undefined;
  if (numeric.im === 0) return formatApproxNumber(numeric.re);
  if (form === 'rectangular') {
    const sign = numeric.im < 0 ? '-' : '+';
    return `${formatApproxNumber(numeric.re)} ${sign} ${formatApproxNumber(Math.abs(numeric.im))}i`;
  }
  const magnitude = Math.hypot(numeric.re, numeric.im);
  const angle = Math.atan2(numeric.im, numeric.re);
  return form === 'cis'
    ? `${formatApproxNumber(magnitude)} cis(${formatApproxNumber(angle)})`
    : `${formatApproxNumber(magnitude)} angle ${formatApproxNumber(angle)}`;
}

export function symbolicScalarMathJson(value: LinearAlgebraScalarWireV1): SerializableMathJson {
  return structuredClone(value.mathJson);
}
