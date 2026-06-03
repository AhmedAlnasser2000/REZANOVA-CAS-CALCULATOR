function parseSimpleNumber(latex: string) {
  if (/^-?\d+(?:\.\d+)?$/u.test(latex)) {
    return Number(latex);
  }

  const fraction = latex.match(/^-?\\frac\{(-?\d+)\}\{(\d+)\}$/u);
  if (fraction) {
    const sign = latex.startsWith('-') ? -1 : 1;
    return sign * Number(fraction[1]) / Number(fraction[2]);
  }

  return null;
}

function hasImaginaryPart(latex: string) {
  return /(?:^|[^A-Za-z\\])i(?=$|[^A-Za-z])|\\imaginaryI/u.test(latex);
}

function leadingRealKey(latex: string) {
  if (!hasImaginaryPart(latex)) {
    return parseSimpleNumber(latex) ?? 0;
  }

  const compact = latex.replace(/\s+/gu, '');
  const leading = compact.match(/^(-?(?:\d+(?:\.\d+)?|\\frac\{-?\d+\}\{\d+\}))(?=[+-])/u);
  if (leading) {
    return parseSimpleNumber(leading[1]) ?? 0;
  }

  const secondSign = compact.slice(1).search(/[+-]/u);
  if (secondSign >= 0 && !compact.slice(0, secondSign + 1).endsWith('i')) {
    return compact.startsWith('-') ? -1 : 1;
  }

  return 0;
}

function imaginarySignKey(latex: string) {
  const compact = latex.replace(/\s+/gu, '');
  if (!hasImaginaryPart(compact)) {
    return 0;
  }
  if (compact.startsWith('-i') || compact.includes('-i') || /-[^,+]*i/u.test(compact)) {
    return -1;
  }
  return 1;
}

export function sortEquationBranchLatex(branches: readonly string[]) {
  return [...branches].sort((left, right) => {
    const leftImaginary = hasImaginaryPart(left);
    const rightImaginary = hasImaginaryPart(right);
    if (leftImaginary !== rightImaginary) {
      return leftImaginary ? 1 : -1;
    }

    const realDifference = leadingRealKey(left) - leadingRealKey(right);
    if (Math.abs(realDifference) > 1e-12) {
      return realDifference;
    }

    const imaginaryDifference = imaginarySignKey(left) - imaginarySignKey(right);
    if (imaginaryDifference !== 0) {
      return imaginaryDifference;
    }

    return left.localeCompare(right);
  });
}
