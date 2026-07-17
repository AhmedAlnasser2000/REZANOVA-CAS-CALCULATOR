import type { CanonicalMathValueV2 } from '../../../types/calculator';
import { printMathJson } from '../../display/printer';

function printedStandardMathLatex(mathJson: unknown) {
  const printed = printMathJson({
    mathJson,
    profile: 'pedagogical-v1',
    target: 'canonical-latex',
  });
  if (!printed.ok) {
    throw new Error('Calculus antiderivative MathJSON could not be rendered: ' + printed.message);
  }
  return printed.canonicalLatex
    .replace(/\\operatorname\{erf\}/gu, String.raw`\mathrm{Erf}`)
    .replace(/\\operatorname\{erfc\}/gu, String.raw`\mathrm{Erfc}`);
}

function positiveMagnitudeNode(node: unknown): unknown | undefined {
  if (typeof node === 'number' && node < 0) return -node;
  if (
    Array.isArray(node)
    && node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && node[1] < 0
  ) {
    return ['Rational', -node[1], node[2]];
  }
  return undefined;
}

function isUnitScalarNode(node: unknown) {
  return node === 1 || (
    Array.isArray(node)
    && node[0] === 'Rational'
    && node.length === 3
    && node[1] === node[2]
  );
}

function isScalarNode(node: unknown) {
  return typeof node === 'number' || (
    Array.isArray(node)
    && node[0] === 'Rational'
    && node.length === 3
  );
}

type ExactRational = { numerator: number; denominator: number };

function exactRationalScalar(node: unknown): ExactRational | undefined {
  if (typeof node === 'number' && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }
  if (
    Array.isArray(node)
    && node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && Number.isInteger(node[1])
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] !== 0
  ) {
    return { numerator: node[1], denominator: node[2] };
  }
  return undefined;
}

function gcd(left: number, right: number) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a || 1;
}

function multiplyExactRationals(left: ExactRational, right: ExactRational): ExactRational {
  const numerator = left.numerator * right.numerator;
  const denominator = left.denominator * right.denominator;
  const divisor = gcd(numerator, denominator);
  const denominatorSign = denominator < 0 ? -1 : 1;
  return {
    numerator: denominatorSign * numerator / divisor,
    denominator: denominatorSign * denominator / divisor,
  };
}

function divideExactRationals(left: ExactRational, right: ExactRational): ExactRational | undefined {
  if (right.numerator === 0) return undefined;
  return multiplyExactRationals(left, {
    numerator: right.denominator,
    denominator: right.numerator,
  });
}

function rationalNode(value: ExactRational): unknown {
  return value.denominator === 1
    ? value.numerator
    : ['Rational', value.numerator, value.denominator];
}

function sameMathJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function flattenProductFactors(node: unknown): unknown[] {
  return Array.isArray(node) && node[0] === 'Multiply'
    ? node.slice(1).flatMap(flattenProductFactors)
    : [node];
}

function normalizeNegationNode(node: unknown): unknown {
  const normalized = normalizeStandardMathJson(node);
  const scalar = exactRationalScalar(normalized);
  if (scalar) {
    return rationalNode({ numerator: -scalar.numerator, denominator: scalar.denominator });
  }
  if (Array.isArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    return normalizeStandardMathJson(normalized[1]);
  }
  return ['Negate', normalized];
}

function normalizedProductFromFactors(factors: unknown[]): unknown {
  let sign = 1;
  let coefficient: ExactRational = { numerator: 1, denominator: 1 };
  const remaining: unknown[] = [];
  for (const rawFactor of factors.flatMap(flattenProductFactors)) {
    let factor = normalizeStandardMathJson(rawFactor);
    if (Array.isArray(factor) && factor[0] === 'Negate' && factor.length === 2) {
      sign *= -1;
      factor = normalizeStandardMathJson(factor[1]);
    }
    const scalar = exactRationalScalar(factor);
    if (scalar) {
      coefficient = multiplyExactRationals(coefficient, scalar);
      continue;
    }
    if (!isUnitScalarNode(factor)) {
      remaining.push(factor);
    }
  }

  if (coefficient.numerator < 0) {
    sign *= -1;
    coefficient = { numerator: -coefficient.numerator, denominator: coefficient.denominator };
  }
  if (coefficient.numerator !== coefficient.denominator) {
    remaining.unshift(rationalNode(coefficient));
  }
  const product = remaining.length === 0
    ? 1
    : remaining.length === 1
      ? remaining[0]
      : ['Multiply', ...remaining];
  return sign < 0 ? normalizeNegationNode(product) : product;
}

function splitSignedProduct(node: unknown): { sign: 1 | -1; factors: unknown[] } {
  const normalized = normalizeStandardMathJson(node);
  if (Array.isArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const split = splitSignedProduct(normalized[1]);
    return {
      sign: split.sign === 1 ? -1 : 1,
      factors: split.factors,
    };
  }
  const factors = Array.isArray(normalized) && normalized[0] === 'Multiply'
    ? normalized.slice(1)
    : [normalized];
  return { sign: 1, factors };
}

function normalizeDivideNode(numeratorNode: unknown, denominatorNode: unknown): unknown {
  const numerator = normalizeStandardMathJson(numeratorNode);
  const denominator = normalizeStandardMathJson(denominatorNode);
  const numeratorScalar = exactRationalScalar(numerator);
  const denominatorScalar = exactRationalScalar(denominator);
  if (numeratorScalar && denominatorScalar) {
    const divided = divideExactRationals(numeratorScalar, denominatorScalar);
    return divided ? rationalNode(divided) : ['Divide', numerator, denominator];
  }

  const split = splitSignedProduct(numerator);
  const cancelIndex = split.factors.findIndex((factor) => sameMathJson(factor, denominator));
  if (cancelIndex >= 0) {
    const remaining = [
      ...split.factors.slice(0, cancelIndex),
      ...split.factors.slice(cancelIndex + 1),
    ];
    const product = remaining.length === 0
      ? 1
      : remaining.length === 1
        ? remaining[0]
        : normalizedProductFromFactors(remaining);
    return split.sign < 0 ? normalizeNegationNode(product) : product;
  }

  return ['Divide', numerator, denominator];
}

export function normalizeStandardMathJson(mathJson: unknown): unknown {
  if (!Array.isArray(mathJson)) return structuredClone(mathJson);
  if (mathJson[0] === 'Negate' && mathJson.length === 2) {
    return normalizeNegationNode(mathJson[1]);
  }
  if (mathJson[0] === 'Multiply' && mathJson.length >= 3) {
    return normalizedProductFromFactors(mathJson.slice(1));
  }
  if (mathJson[0] === 'Divide' && mathJson.length === 3) {
    return normalizeDivideNode(mathJson[1], mathJson[2]);
  }
  if (mathJson[0] === 'Power' && mathJson.length === 3) {
    const base = normalizeStandardMathJson(mathJson[1]);
    const exponent = normalizeStandardMathJson(mathJson[2]);
    const baseScalar = exactRationalScalar(base);
    const exponentScalar = exactRationalScalar(exponent);
    if (exponentScalar?.numerator === 0) return 1;
    if (exponentScalar && exponentScalar.numerator === exponentScalar.denominator) return base;
    if (baseScalar && baseScalar.numerator === baseScalar.denominator) return 1;
    if (baseScalar && exponentScalar?.denominator === 1 && Math.abs(exponentScalar.numerator) <= 12) {
      const poweredNumerator = baseScalar.numerator ** exponentScalar.numerator;
      const poweredDenominator = baseScalar.denominator ** exponentScalar.numerator;
      if (Number.isSafeInteger(poweredNumerator) && Number.isSafeInteger(poweredDenominator)) {
        return rationalNode({ numerator: poweredNumerator, denominator: poweredDenominator });
      }
    }
    return ['Power', base, exponent];
  }
  if (mathJson[0] === 'Add' || mathJson[0] === 'Subtract') {
    return [mathJson[0], ...mathJson.slice(1).map(normalizeStandardMathJson)];
  }
  return [mathJson[0], ...mathJson.slice(1).map(normalizeStandardMathJson)];
}

function splitProductCoefficient(node: unknown): {
  coefficient: ExactRational;
  factors: unknown[];
} {
  let coefficient: ExactRational = { numerator: 1, denominator: 1 };
  const factors = flattenProductFactors(node).map((factor) => {
    if (Array.isArray(factor) && factor[0] === 'Negate' && factor.length === 2) {
      coefficient = multiplyExactRationals(coefficient, { numerator: -1, denominator: 1 });
      return factor[1];
    }
    const scalar = exactRationalScalar(factor);
    if (!scalar) return factor;
    coefficient = multiplyExactRationals(coefficient, scalar);
    return undefined;
  }).filter((factor) => factor !== undefined && !isUnitScalarNode(factor));
  return { coefficient, factors };
}

function isAdditiveNode(node: unknown) {
  return Array.isArray(node) && (node[0] === 'Add' || node[0] === 'Subtract');
}

function isSafeFormalFunctionName(name: string) {
  return /^[A-Za-z][A-Za-z0-9_]*$/u.test(name);
}

function isFormalApplyNode(node: unknown) {
  return Array.isArray(node)
    && node[0] === 'Apply'
    && node.length === 3
    && typeof node[1] === 'string'
    && isSafeFormalFunctionName(node[1]);
}

function containsFormalApply(node: unknown): boolean {
  return isFormalApplyNode(node)
    || (Array.isArray(node) && node.slice(1).some(containsFormalApply));
}

function formalApplyLatex(node: unknown[]) {
  return `${node[1]}\\left(${standardMathLatex(node[2])}\\right)`;
}

const STANDARD_FUNCTION_LATEX = new Map<string, string>([
  ['Sin', '\\sin'],
  ['Cos', '\\cos'],
  ['Tan', '\\tan'],
  ['Cot', '\\cot'],
  ['Sec', '\\sec'],
  ['Csc', '\\csc'],
  ['Sinh', '\\sinh'],
  ['Cosh', '\\cosh'],
  ['Tanh', '\\tanh'],
  ['Arcsin', '\\arcsin'],
  ['Arccos', '\\arccos'],
  ['Arctan', '\\arctan'],
  ['Arsinh', '\\operatorname{arsinh}'],
  ['Arcosh', '\\operatorname{arcosh}'],
  ['Artanh', '\\operatorname{artanh}'],
]);

const INFIX_POWER_FUNCTION_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Sinh',
  'Cosh',
  'Tanh',
]);

function groupedArgumentLatex(argument: unknown) {
  return `(${standardMathLatex(argument)})`;
}

function standardFunctionLatex(node: unknown[]): string | undefined {
  const command = typeof node[0] === 'string' ? STANDARD_FUNCTION_LATEX.get(node[0]) : undefined;
  if (!command || node.length !== 2) return undefined;
  return `${command}${groupedArgumentLatex(node[1])}`;
}

function standardFunctionPowerLatex(node: unknown[], exponent: unknown): string | undefined {
  const head = typeof node[0] === 'string' ? node[0] : undefined;
  const command = head ? STANDARD_FUNCTION_LATEX.get(head) : undefined;
  if (!head || !command || node.length !== 2) return undefined;
  const exponentLatex = standardMathLatex(exponent);
  if (INFIX_POWER_FUNCTION_HEADS.has(head)) {
    return /^[A-Za-z0-9]+$/u.test(exponentLatex)
      ? `${command}^${exponentLatex}${groupedArgumentLatex(node[1])}`
      : `${command}^{${exponentLatex}}${groupedArgumentLatex(node[1])}`;
  }
  return /^[A-Za-z0-9]+$/u.test(exponentLatex)
    ? `${command}${groupedArgumentLatex(node[1])}^${exponentLatex}`
    : `${command}${groupedArgumentLatex(node[1])}^{${exponentLatex}}`;
}

function explicitProductLatex(factors: unknown[]) {
  return factors.map((factor) =>
    isAdditiveNode(factor)
      ? `(${standardMathLatex(factor)})`
      : standardMathLatex(factor)).join(String.raw`\cdot `);
}

function shouldUseProductDot(left: unknown, right: unknown) {
  if (!isAdditiveNode(left)) return false;
  return !(
    Array.isArray(right)
    && typeof right[0] === 'string'
    && STANDARD_FUNCTION_LATEX.has(right[0])
  );
}

function compactProductLatex(factors: unknown[]) {
  return factors.map((factor, index) => {
    const rendered = isAdditiveNode(factor)
      ? `(${standardMathLatex(factor)})`
      : standardMathLatex(factor);
    if (index === 0) return rendered;
    return `${shouldUseProductDot(factors[index - 1], factor) ? String.raw`\cdot ` : ''}${rendered}`;
  }).join('');
}

function productFactorsLatex(factors: unknown[]) {
  return factors.some(containsFormalApply)
    ? explicitProductLatex(factors)
    : compactProductLatex(factors);
}

function renderCoefficientTimesDivide(
  coefficient: ExactRational,
  divideNode: unknown[],
): string | undefined {
  if (divideNode.length !== 3) {
    return undefined;
  }

  const numeratorFactors = [
    ...(coefficient.numerator === 1 ? [] : [coefficient.numerator]),
    divideNode[1],
  ];
  const denominatorFactors = [
    coefficient.denominator,
    divideNode[2],
  ];

  return String.raw`\frac{${productFactorsLatex(numeratorFactors)}}{${productFactorsLatex(denominatorFactors)}}`;
}

function standardMathLatex(mathJson: unknown): string {
  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Rational'
    && mathJson.length === 3
    && typeof mathJson[1] === 'number'
    && typeof mathJson[2] === 'number'
  ) {
    const numerator = mathJson[1];
    const denominator = mathJson[2];
    if (denominator === 1) return String(numerator);
    return String.raw`\frac{${numerator}}{${denominator}}`;
  }

  if (Array.isArray(mathJson) && isFormalApplyNode(mathJson)) {
    return formalApplyLatex(mathJson);
  }

  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Power'
    && mathJson.length === 3
    && Array.isArray(mathJson[2])
    && mathJson[2][0] === 'Rational'
    && mathJson[2][1] === 1
    && mathJson[2][2] === 2
  ) {
    return String.raw`\sqrt{${standardMathLatex(mathJson[1])}}`;
  }

  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Power'
    && mathJson.length === 3
    && containsFormalApply(mathJson[1])
  ) {
    const exponentLatex = standardMathLatex(mathJson[2]);
    return /^[A-Za-z0-9]+$/u.test(exponentLatex)
      ? `${standardMathLatex(mathJson[1])}^${exponentLatex}`
      : `${standardMathLatex(mathJson[1])}^{${exponentLatex}}`;
  }

  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Power'
    && mathJson.length === 3
    && Array.isArray(mathJson[1])
  ) {
    const base = standardFunctionPowerLatex(mathJson[1], mathJson[2]);
    if (base) {
      return base;
    }
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Sqrt' && mathJson.length === 2) {
    return String.raw`\sqrt{${standardMathLatex(mathJson[1])}}`;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Power' && mathJson.length === 3) {
    const base = isAdditiveNode(mathJson[1])
      ? `(${standardMathLatex(mathJson[1])})`
      : standardMathLatex(mathJson[1]);
    const exponentLatex = standardMathLatex(mathJson[2]);
    return /^\d+$/u.test(exponentLatex)
      ? `${base}^${exponentLatex}`
      : `${base}^{${exponentLatex}}`;
  }

  if (
    Array.isArray(mathJson)
    && (mathJson[0] === 'Ln' || mathJson[0] === 'Log')
    && mathJson.length === 2
  ) {
    if (Array.isArray(mathJson[1]) && mathJson[1][0] === 'Abs' && mathJson[1].length === 2) {
      return `\\ln|${standardMathLatex(mathJson[1][1])}|`;
    }
    return `\\ln${groupedArgumentLatex(mathJson[1])}`;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Abs' && mathJson.length === 2) {
    return `|${standardMathLatex(mathJson[1])}|`;
  }

  if (Array.isArray(mathJson)) {
    const renderedFunction = standardFunctionLatex(mathJson);
    if (renderedFunction) return renderedFunction;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Divide' && mathJson.length === 3) {
    const numerator = positiveMagnitudeNode(mathJson[1]);
    if (numerator !== undefined) {
      return `-${standardMathLatex(['Divide', numerator, mathJson[2]])}`;
    }
    const numeratorSplit = splitProductCoefficient(mathJson[1]);
    const denominatorScalar = exactRationalScalar(mathJson[2]);
    if (
      containsFormalApply(mathJson[1])
      && denominatorScalar
      && numeratorSplit.coefficient.numerator === numeratorSplit.coefficient.denominator
      && numeratorSplit.factors.length > 0
    ) {
      const denominator = standardMathLatex(mathJson[2]);
      const numeratorLatex = numeratorSplit.factors.length === 1
        ? standardMathLatex(numeratorSplit.factors[0])
        : explicitProductLatex(numeratorSplit.factors);
      return `\\frac{${numeratorLatex}}{${denominator}}`;
    }
    if (denominatorScalar) {
      const coefficient = divideExactRationals(numeratorSplit.coefficient, denominatorScalar);
      if (coefficient) {
        return standardMathLatex(
          numeratorSplit.factors.length === 0
            ? rationalNode(coefficient)
            : ['Multiply', rationalNode(coefficient), ...numeratorSplit.factors],
        );
      }
    }
    if (
      numeratorSplit.factors.length > 0
      && numeratorSplit.coefficient.numerator !== numeratorSplit.coefficient.denominator
    ) {
      const negative = numeratorSplit.coefficient.numerator < 0;
      const absoluteCoefficient = {
        numerator: Math.abs(numeratorSplit.coefficient.numerator),
        denominator: numeratorSplit.coefficient.denominator,
      };
      const coefficientDenominator = absoluteCoefficient.denominator === 1
        ? mathJson[2]
        : ['Multiply', absoluteCoefficient.denominator, mathJson[2]];
      const rendered = compactProductLatex([
        ['Divide', absoluteCoefficient.numerator, coefficientDenominator],
        ...numeratorSplit.factors,
      ]);
      return negative ? `-${rendered}` : rendered;
    }
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Multiply' && mathJson.length >= 3) {
    let negative = false;
    let exactCoefficient: ExactRational = { numerator: 1, denominator: 1 };
    const factors = mathJson.slice(1).flatMap(flattenProductFactors).map((factor) => {
      if (Array.isArray(factor) && factor[0] === 'Negate' && factor.length === 2) {
        negative = !negative;
        return factor[1];
      }
      const scalar = exactRationalScalar(factor);
      if (scalar) {
        exactCoefficient = multiplyExactRationals(exactCoefficient, scalar);
        return undefined;
      }
      return factor;
    }).filter((factor) => factor !== undefined && !isUnitScalarNode(factor));
    if (exactCoefficient.numerator < 0) {
      negative = !negative;
      exactCoefficient = { ...exactCoefficient, numerator: -exactCoefficient.numerator };
    }
    if (exactCoefficient.numerator !== exactCoefficient.denominator) {
      if (
        factors.length === 1
        && Array.isArray(factors[0])
        && factors[0][0] === 'Divide'
      ) {
        const rendered = renderCoefficientTimesDivide(exactCoefficient, factors[0]);
        if (rendered) {
          return negative ? `-${rendered}` : rendered;
        }
      }
      factors.unshift(exactCoefficient.denominator === 1
        ? exactCoefficient.numerator
        : ['Rational', exactCoefficient.numerator, exactCoefficient.denominator]);
    }
    const ordered = [
      ...factors.filter(isScalarNode),
      ...factors.filter((factor) => !isScalarNode(factor)),
    ];
    const normalized = ordered.length === 0
      ? '1'
        : ordered.length === 1
        ? standardMathLatex(ordered[0])
        : ordered.some(containsFormalApply)
          ? explicitProductLatex(ordered)
          : compactProductLatex(ordered);
    return negative ? `-${normalized}` : normalized;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Subtract' && mathJson.length >= 3) {
    return standardMathLatex([
      'Add',
      mathJson[1],
      ...mathJson.slice(2).map((term) => ['Negate', term]),
    ]);
  }

  if (!Array.isArray(mathJson) || mathJson[0] !== 'Add' || mathJson.length < 2) {
    if (Array.isArray(mathJson) && mathJson[0] === 'Negate' && mathJson.length === 2) {
      const operand = standardMathLatex(mathJson[1]);
      return isAdditiveNode(mathJson[1]) ? `-(${operand})` : `-${operand}`;
    }
    return printedStandardMathLatex(mathJson);
  }

  return mathJson.slice(1).map((term, index) => {
    if (
      Array.isArray(term)
      && term[0] === 'Negate'
      && term.length === 2
      && (!Array.isArray(term[1]) || (term[1][0] !== 'Add' && term[1][0] !== 'Subtract'))
    ) {
      return `-${standardMathLatex(term[1])}`;
    }
    const rendered = standardMathLatex(term);
    return index === 0 || rendered.startsWith('-') ? rendered : `+${rendered}`;
  }).join('');
}

export function renderCalculusStandardMathJson(mathJson: unknown): string {
  return standardMathLatex(mathJson);
}

export function standardLeaf(
  mathJson: unknown,
): CanonicalMathValueV2 {
  return {
    canonicalLatex: standardMathLatex(mathJson),
    mathJson: structuredClone(mathJson) as CanonicalMathValueV2['mathJson'],
  };
}

export function scaleStandardMathJson(
  coefficient: unknown,
  mathJson: unknown,
): unknown {
  if (Array.isArray(mathJson) && mathJson[0] === 'Divide' && mathJson.length === 3) {
    return normalizeStandardMathJson([
      'Divide',
      normalizedProductFromFactors([coefficient, mathJson[1]]),
      mathJson[2],
    ]);
  }
  return normalizedProductFromFactors([coefficient, mathJson]);
}
