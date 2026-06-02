import { formatApproxNumber } from '../display/numeric-output';

export type ComplexValue = {
  re: number;
  im: number;
};

export const DEFAULT_EPSILON = 1e-10;

export type ComplexRootReadbackKind = 'principal-root' | 'all-branches';

export type ComplexRootReadback = {
  kind: ComplexRootReadbackKind;
  degree: number;
  roots: readonly ComplexValue[];
  latex: string;
  text: string;
};

function normalizeScalar(value: number, epsilon = DEFAULT_EPSILON) {
  return Math.abs(value) < epsilon ? 0 : value;
}

function formatScalar(value: number, digits = 6) {
  const normalized = normalizeScalar(value);
  const rounded = Number.parseFloat(normalized.toFixed(digits));
  return `${rounded}`;
}

function assertPositiveIntegerDegree(degree: number) {
  if (!Number.isInteger(degree) || degree < 1) {
    throw new RangeError('Complex root degree must be a positive integer.');
  }
}

function assertIntegerExponent(exponent: number) {
  if (!Number.isInteger(exponent)) {
    throw new RangeError('Complex power exponent must be an integer.');
  }
}

function normalizedAngleForSort(value: ComplexValue) {
  const angle = complexArg(value);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

export function complex(re: number, im = 0): ComplexValue {
  return normalizeComplex({ re, im });
}

export function complexAdd(a: ComplexValue, b: ComplexValue): ComplexValue {
  return normalizeComplex({ re: a.re + b.re, im: a.im + b.im });
}

export function complexSub(a: ComplexValue, b: ComplexValue): ComplexValue {
  return normalizeComplex({ re: a.re - b.re, im: a.im - b.im });
}

export function complexMul(a: ComplexValue, b: ComplexValue): ComplexValue {
  return normalizeComplex({
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  });
}

export function complexDiv(a: ComplexValue, b: ComplexValue): ComplexValue {
  const denominator = b.re * b.re + b.im * b.im;
  if (denominator < DEFAULT_EPSILON) {
    throw new Error('Division by zero in complex arithmetic.');
  }

  return normalizeComplex({
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator,
  });
}

export function complexAbs(a: ComplexValue) {
  return Math.hypot(a.re, a.im);
}

export function complexArg(a: ComplexValue) {
  const normalized = normalizeComplex(a);
  if (normalized.re === 0 && normalized.im === 0) {
    return 0;
  }
  return Math.atan2(normalized.im, normalized.re);
}

export function complexFromPolar(magnitude: number, angle: number): ComplexValue {
  if (!Number.isFinite(magnitude) || !Number.isFinite(angle)) {
    throw new RangeError('Complex polar coordinates must be finite.');
  }
  if (magnitude < 0) {
    throw new RangeError('Complex polar magnitude must be nonnegative.');
  }
  return normalizeComplex({
    re: magnitude * Math.cos(angle),
    im: magnitude * Math.sin(angle),
  });
}

export function complexNeg(a: ComplexValue): ComplexValue {
  return normalizeComplex({ re: -a.re, im: -a.im });
}

export function complexConjugate(a: ComplexValue): ComplexValue {
  return normalizeComplex({ re: a.re, im: -a.im });
}

export function complexPowInteger(a: ComplexValue, exponent: number): ComplexValue {
  assertIntegerExponent(exponent);
  if (exponent === 0) {
    return complex(1, 0);
  }

  let remaining = Math.abs(exponent);
  let result = complex(1, 0);
  let factor = complex(a.re, a.im);

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result = complexMul(result, factor);
    }
    remaining = Math.floor(remaining / 2);
    if (remaining > 0) {
      factor = complexMul(factor, factor);
    }
  }

  return exponent < 0 ? complexDiv(complex(1, 0), result) : result;
}

export function complexSqrt(a: ComplexValue): ComplexValue {
  if (a.im === 0 && a.re >= 0) {
    return complex(Math.sqrt(a.re), 0);
  }

  const magnitude = complexAbs(a);
  const real = Math.sqrt((magnitude + a.re) / 2);
  const imaginary = Math.sign(a.im || 1) * Math.sqrt((magnitude - a.re) / 2);
  return normalizeComplex({ re: real, im: imaginary });
}

export function complexPrincipalNthRoot(a: ComplexValue, degree: number): ComplexValue {
  assertPositiveIntegerDegree(degree);
  const normalized = normalizeComplex(a);
  if (normalized.re === 0 && normalized.im === 0) {
    return complex(0, 0);
  }

  const magnitude = Math.pow(complexAbs(normalized), 1 / degree);
  return complexFromPolar(magnitude, complexArg(normalized) / degree);
}

export function complexNthRoots(a: ComplexValue, degree: number): ComplexValue[] {
  assertPositiveIntegerDegree(degree);
  const normalized = normalizeComplex(a);
  if (normalized.re === 0 && normalized.im === 0) {
    return [complex(0, 0)];
  }

  const magnitude = Math.pow(complexAbs(normalized), 1 / degree);
  const baseAngle = complexArg(normalized);
  return Array.from({ length: degree }, (_, index) => {
    const angle = (baseAngle + Math.PI * 2 * index) / degree;
    return complexFromPolar(magnitude, angle);
  }).sort((left, right) => normalizedAngleForSort(left) - normalizedAngleForSort(right));
}

export function normalizeComplex(a: ComplexValue, epsilon = DEFAULT_EPSILON): ComplexValue {
  return {
    re: normalizeScalar(a.re, epsilon),
    im: normalizeScalar(a.im, epsilon),
  };
}

export function areComplexClose(a: ComplexValue, b: ComplexValue, epsilon = 1e-7) {
  return Math.abs(a.re - b.re) < epsilon && Math.abs(a.im - b.im) < epsilon;
}

export function complexToLatex(value: ComplexValue, digits = 6) {
  const normalized = normalizeComplex(value);
  if (normalized.im === 0) {
    return formatScalar(normalized.re, digits);
  }

  if (normalized.re === 0) {
    if (normalized.im === 1) {
      return 'i';
    }
    if (normalized.im === -1) {
      return '-i';
    }
    return `${formatScalar(normalized.im, digits)}i`;
  }

  const sign = normalized.im < 0 ? '-' : '+';
  const absImaginary = Math.abs(normalized.im);
  const imaginaryText = absImaginary === 1 ? 'i' : `${formatScalar(absImaginary, digits)}i`;
  return `${formatScalar(normalized.re, digits)}${sign}${imaginaryText}`;
}

export function complexToApproxText(value: ComplexValue, digits = 6) {
  const normalized = normalizeComplex(value);
  if (normalized.im === 0) {
    return formatApproxNumber(normalized.re, { approxDigits: digits });
  }

  if (normalized.re === 0) {
    if (normalized.im === 1) {
      return 'i';
    }
    if (normalized.im === -1) {
      return '-i';
    }
    return `${formatApproxNumber(normalized.im, { approxDigits: digits })}i`;
  }

  const sign = normalized.im < 0 ? '-' : '+';
  const absImaginary = Math.abs(normalized.im);
  const imaginaryText = absImaginary === 1
    ? 'i'
    : `${formatApproxNumber(absImaginary, { approxDigits: digits })}i`;
  return `${formatApproxNumber(normalized.re, { approxDigits: digits })} ${sign} ${imaginaryText}`;
}

export function complexBranchesToLatex(values: readonly ComplexValue[], digits = 6) {
  return `\\left\\{${values.map((value) => complexToLatex(value, digits)).join(', ')}\\right\\}`;
}

export function complexBranchesToApproxText(values: readonly ComplexValue[], digits = 6) {
  return `{ ${values.map((value) => complexToApproxText(value, digits)).join(', ')} }`;
}

export function complexPrincipalRootReadback(
  value: ComplexValue,
  degree: number,
  digits = 6,
): ComplexRootReadback {
  const root = complexPrincipalNthRoot(value, degree);
  return {
    kind: 'principal-root',
    degree,
    roots: [root],
    latex: complexToLatex(root, digits),
    text: complexToApproxText(root, digits),
  };
}

export function complexAllRootsReadback(
  value: ComplexValue,
  degree: number,
  digits = 6,
): ComplexRootReadback {
  const roots = complexNthRoots(value, degree);
  return {
    kind: 'all-branches',
    degree,
    roots,
    latex: complexBranchesToLatex(roots, digits),
    text: complexBranchesToApproxText(roots, digits),
  };
}
