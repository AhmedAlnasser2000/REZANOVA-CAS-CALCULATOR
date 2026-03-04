export type ComplexValue = {
  re: number;
  im: number;
};

const DEFAULT_EPSILON = 1e-10;

function normalizeScalar(value: number, epsilon = DEFAULT_EPSILON) {
  return Math.abs(value) < epsilon ? 0 : value;
}

function formatScalar(value: number, digits = 6) {
  const normalized = normalizeScalar(value);
  const rounded = Number.parseFloat(normalized.toFixed(digits));
  return `${rounded}`;
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

export function complexNeg(a: ComplexValue): ComplexValue {
  return normalizeComplex({ re: -a.re, im: -a.im });
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
  return `${formatScalar(normalized.re, digits)} ${sign} ${imaginaryText}`;
}
