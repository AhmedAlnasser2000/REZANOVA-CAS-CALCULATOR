type ExactLatexRational = {
  numerator: number;
  denominator: number;
};

type FormulaDetailLinePart = {
  kind: string;
  latex?: string;
  [key: string]: unknown;
};

type FormulaDetailSection = {
  lines: string[];
  lineParts?: FormulaDetailLinePart[][];
  [key: string]: unknown;
};

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function normalizeRational(value: ExactLatexRational): ExactLatexRational | null {
  if (!Number.isSafeInteger(value.numerator) || !Number.isSafeInteger(value.denominator) || value.denominator === 0) {
    return null;
  }
  const sign = value.denominator < 0 ? -1 : 1;
  const numerator = value.numerator * sign;
  const denominator = Math.abs(value.denominator);
  const divisor = gcd(numerator, denominator);
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function parseInteger(value: string): number | null {
  return /^-?\d+$/u.test(value) ? Number(value) : null;
}

export function parseExactRationalLatex(latex: string): ExactLatexRational | null {
  const trimmed = latex.trim();
  const integer = parseInteger(trimmed);
  if (integer !== null) {
    return normalizeRational({ numerator: integer, denominator: 1 });
  }

  const negativeFraction = trimmed.match(/^-\\frac\{(\d+)\}\{(\d+)\}$/u);
  if (negativeFraction) {
    return normalizeRational({
      numerator: -Number(negativeFraction[1]),
      denominator: Number(negativeFraction[2]),
    });
  }

  const fraction = trimmed.match(/^\\frac\{(-?\d+)\}\{(\d+)\}$/u);
  if (fraction) {
    return normalizeRational({
      numerator: Number(fraction[1]),
      denominator: Number(fraction[2]),
    });
  }

  return null;
}

function formatRationalLatex(value: ExactLatexRational): string {
  const normalized = normalizeRational(value);
  if (!normalized) {
    return '\\text{unsupported-rational}';
  }
  if (normalized.denominator === 1) {
    return String(normalized.numerator);
  }
  if (normalized.numerator < 0) {
    return `-\\frac{${Math.abs(normalized.numerator)}}{${normalized.denominator}}`;
  }
  return `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

function multiplyRationals(left: ExactLatexRational, right: ExactLatexRational) {
  return normalizeRational({
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  });
}

function divideRationals(left: ExactLatexRational, right: ExactLatexRational) {
  return normalizeRational({
    numerator: left.numerator * right.denominator,
    denominator: left.denominator * right.numerator,
  });
}

function powerRational(base: ExactLatexRational, degree: number) {
  if (degree < 0 || !Number.isSafeInteger(degree)) {
    return null;
  }
  let result: ExactLatexRational = { numerator: 1, denominator: 1 };
  for (let index = 0; index < degree; index += 1) {
    const next = multiplyRationals(result, base);
    if (!next) {
      return null;
    }
    result = next;
  }
  return result;
}

export function isZeroLatex(latex: string) {
  return parseExactRationalLatex(latex)?.numerator === 0;
}

export function isOneLatex(latex: string) {
  const rational = parseExactRationalLatex(latex);
  return Boolean(rational && rational.numerator === rational.denominator);
}

function isSimpleLatex(latex: string) {
  return /^-?[A-Za-z0-9]+$/u.test(latex)
    || /^\\sqrt(?:\[[^\]]+\])?\{.+\}$/u.test(latex)
    || /^\\operatorname\{PrincipalRoot\}_\{\d+\}\\left\(.+\\right\)$/u.test(latex);
}

export function groupFormulaLatex(latex: string) {
  return isSimpleLatex(latex) ? latex : `\\left(${latex}\\right)`;
}

function splitLeadingIntegerFactor(latex: string) {
  const match = latex.match(/^(-?\d+)([A-Za-z\\].*)$/u);
  if (!match) {
    return null;
  }
  return {
    coefficient: Number(match[1]),
    rest: match[2],
  };
}

export function fractionFormulaLatex(numerator: string, denominator: string) {
  if (isZeroLatex(numerator)) {
    return '0';
  }
  if (isOneLatex(denominator)) {
    return numerator;
  }

  const numeratorRational = parseExactRationalLatex(numerator);
  const denominatorRational = parseExactRationalLatex(denominator);
  if (numeratorRational && denominatorRational) {
    const divided = divideRationals(numeratorRational, denominatorRational);
    if (divided) {
      return formatRationalLatex(divided);
    }
  }

  const leadingFactor = splitLeadingIntegerFactor(denominator);
  if (numeratorRational && leadingFactor && leadingFactor.coefficient !== 0) {
    const divided = divideRationals(numeratorRational, {
      numerator: leadingFactor.coefficient,
      denominator: 1,
    });
    if (divided) {
      if (divided.denominator === 1 && Math.abs(divided.numerator) === 1) {
        return divided.numerator < 0
          ? `-\\frac{1}{${leadingFactor.rest}}`
          : `\\frac{1}{${leadingFactor.rest}}`;
      }
      return `\\frac{${formatRationalLatex(divided)}}{${leadingFactor.rest}}`;
    }
  }

  if (
    /^-[A-Za-z0-9]+$/u.test(numerator)
    || numerator.startsWith('-\\frac')
    || numerator.startsWith('-\\sqrt')
    || numerator.startsWith('-\\left(')
  ) {
    return `-\\frac{${numerator.slice(1)}}{${denominator}}`;
  }
  return `\\frac{${numerator}}{${denominator}}`;
}

export function negateFormulaLatex(latex: string) {
  const exact = parseExactRationalLatex(latex);
  if (exact) {
    return formatRationalLatex({
      numerator: -exact.numerator,
      denominator: exact.denominator,
    });
  }
  if (latex.startsWith('-') && !latex.startsWith('-\\frac')) {
    return latex.slice(1);
  }
  if (latex.startsWith('\\frac') || isSimpleLatex(latex)) {
    return `-${latex}`;
  }
  return `-\\left(${latex}\\right)`;
}

export function addFormulaLatexTerms(terms: string[]) {
  const filtered = terms.filter((term) => term.length > 0 && !isZeroLatex(term));
  if (filtered.length === 0) {
    return '0';
  }
  return filtered.reduce((current, term, index) => {
    if (index === 0) {
      return term;
    }
    return term.startsWith('-') ? `${current}-${term.slice(1)}` : `${current}+${term}`;
  }, '');
}

export function multiplyFormulaLatexFactors(factors: string[]) {
  let coefficient: ExactLatexRational = { numerator: 1, denominator: 1 };
  const symbolicFactors: string[] = [];

  for (const factor of factors) {
    const exact = parseExactRationalLatex(factor);
    if (exact) {
      const next = multiplyRationals(coefficient, exact);
      if (!next) {
        symbolicFactors.push(groupFormulaLatex(factor));
        continue;
      }
      coefficient = next;
    } else if (!isOneLatex(factor)) {
      symbolicFactors.push(groupFormulaLatex(factor));
    }
  }

  if (coefficient.numerator === 0) {
    return '0';
  }
  if (symbolicFactors.length === 0) {
    return formatRationalLatex(coefficient);
  }
  const symbolicLatex = symbolicFactors.join('');
  if (coefficient.denominator === 1 && coefficient.numerator === 1) {
    return symbolicLatex;
  }
  if (coefficient.denominator === 1 && coefficient.numerator === -1) {
    return `-${symbolicLatex}`;
  }
  return `${formatRationalLatex(coefficient)}${symbolicLatex}`;
}

export function powerFormulaLatex(base: string, degree: number) {
  if (degree === 0) {
    return '1';
  }
  if (degree === 1 || isZeroLatex(base) || isOneLatex(base)) {
    return base;
  }

  const exact = parseExactRationalLatex(base);
  if (exact) {
    const powered = powerRational(exact, degree);
    if (powered) {
      return formatRationalLatex(powered);
    }
  }

  return `${groupFormulaLatex(base)}^${degree}`;
}

export function polishFormulaReadbackLatex(latex: string) {
  return latex
    .replaceAll('\\left(\\frac{1}{2}\\right)^2', '\\frac{1}{4}')
    .replaceAll('\\left(\\frac{1}{3}\\right)^3', '\\frac{1}{27}')
    .replaceAll('\\left(\\frac{-1}{2}\\right)^2', '\\frac{1}{4}')
    .replaceAll('\\left(\\frac{-1}{3}\\right)^3', '-\\frac{1}{27}')
    .replaceAll('\\left\\{0+', '\\left\\{')
    .replaceAll('=0+', '=')
    .replaceAll('+0\\right\\}', '\\right\\}');
}

export function polishFormulaDetailSections<T extends FormulaDetailSection>(sections: T[]): T[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map(polishFormulaReadbackLatex),
    ...(section.lineParts
      ? {
          lineParts: section.lineParts.map((lineParts) =>
            lineParts.map((part) =>
              part.kind === 'math' && part.latex
                ? { ...part, latex: polishFormulaReadbackLatex(part.latex) }
                : { ...part })),
        }
      : {}),
  }));
}
