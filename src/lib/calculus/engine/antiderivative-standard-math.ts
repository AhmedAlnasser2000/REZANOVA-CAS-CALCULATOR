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
  return printed.canonicalLatex;
}

export type CalculusStandardMathRenderOptions = {
  variable?: string;
};

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

function formalApplyLatex(node: unknown[], options: CalculusStandardMathRenderOptions) {
  return `${node[1]}\\left(${standardMathLatex(node[2], options)}\\right)`;
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
  ['Erf', '\\operatorname{erf}'],
  ['Erfc', '\\operatorname{erfc}'],
  ['Erfi', '\\operatorname{erfi}'],
  ['Si', '\\operatorname{Si}'],
  ['Ci', '\\operatorname{Ci}'],
  ['Ei', '\\operatorname{Ei}'],
  ['LogarithmicIntegral', '\\operatorname{li}'],
  ['FresnelS', '\\operatorname{FresnelS}'],
  ['FresnelC', '\\operatorname{FresnelC}'],
  ['EllipticF', '\\operatorname{EllipticF}'],
  ['EllipticE', '\\operatorname{EllipticE}'],
  ['EllipticPi', '\\operatorname{EllipticPi}'],
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

function groupedArgumentLatex(
  argument: unknown,
  options: CalculusStandardMathRenderOptions,
) {
  const rendered = standardMathLatex(argument, options);
  return `(${rendered})`;
}

function standardFunctionLatex(
  node: unknown[],
  options: CalculusStandardMathRenderOptions,
): string | undefined {
  const command = typeof node[0] === 'string' ? STANDARD_FUNCTION_LATEX.get(node[0]) : undefined;
  if (!command || node.length < 2) return undefined;
  const argumentsLatex = node.slice(1)
    .map((argument) => {
      if (
        options.variable
        && INFIX_POWER_FUNCTION_HEADS.has(String(node[0]))
      ) {
        const linear = exactIntegerLinearCoefficients(argument, options.variable);
        if (linear) {
          const divisor = gcd(linear.variableCoefficient, linear.constant);
          if (divisor > 1) {
            const reduced = [
              'Add',
              ['Multiply', linear.variableCoefficient / divisor, options.variable],
              linear.constant / divisor,
            ];
            return `${divisor}\\left(${standardMathLatex(reduced, options)}\\right)`;
          }
        }
      }
      return standardMathLatex(argument, options);
    })
    .join(',');
  return command.startsWith('\\operatorname')
    ? `${command}\\left(${argumentsLatex}\\right)`
    : `${command}(${argumentsLatex})`;
}

function standardFunctionPowerLatex(
  node: unknown[],
  exponent: unknown,
  options: CalculusStandardMathRenderOptions,
): string | undefined {
  const head = typeof node[0] === 'string' ? node[0] : undefined;
  const command = head ? STANDARD_FUNCTION_LATEX.get(head) : undefined;
  if (!head || !command || node.length !== 2) return undefined;
  const exponentLatex = standardMathLatex(exponent, options);
  if (INFIX_POWER_FUNCTION_HEADS.has(head)) {
    return `${command}^{${exponentLatex}}${groupedArgumentLatex(node[1], options)}`;
  }
  return `${command}${groupedArgumentLatex(node[1], options)}^{${exponentLatex}}`;
}

function explicitProductLatex(
  factors: unknown[],
  options: CalculusStandardMathRenderOptions,
) {
  return factors.map((factor, index) => {
    const rendered = isAdditiveNode(factor)
      ? `\\left(${standardMathLatex(factor, options)}\\right)`
      : standardMathLatex(factor, options);
    if (index === 0) return rendered;
    return `${Array.isArray(factor) && (factor[0] === 'Ln' || factor[0] === 'Log')
      ? String.raw`\cdot`
      : String.raw`\cdot `}${rendered}`;
  }).join('');
}

function shouldUseProductDot(left: unknown, right: unknown) {
  if (
    Array.isArray(right)
    && (right[0] === 'Ln' || right[0] === 'Log')
  ) return true;
  if (
    Array.isArray(right)
    && typeof right[0] === 'string'
    && STANDARD_FUNCTION_LATEX.get(right[0])?.startsWith('\\operatorname')
  ) return true;
  if (!isAdditiveNode(left)) return false;
  return !(
    Array.isArray(right)
    && typeof right[0] === 'string'
    && STANDARD_FUNCTION_LATEX.has(right[0])
  );
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) return true;
  if (!Array.isArray(node)) return false;
  return node.slice(1).some((child) => dependsOnVariable(child, variable));
}

function exactIntegerLinearCoefficients(
  node: unknown,
  variable: string,
): { variableCoefficient: number; constant: number } | undefined {
  if (!Array.isArray(node) || node[0] !== 'Add') return undefined;
  let variableCoefficient = 0;
  let constant = 0;
  for (const term of node.slice(1)) {
    if (typeof term === 'number' && Number.isInteger(term)) {
      constant += term;
      continue;
    }
    if (term === variable) {
      variableCoefficient += 1;
      continue;
    }
    if (
      Array.isArray(term)
      && term[0] === 'Multiply'
      && term.length === 3
      && typeof term[1] === 'number'
      && Number.isInteger(term[1])
      && term[2] === variable
    ) {
      variableCoefficient += term[1];
      continue;
    }
    return undefined;
  }
  return variableCoefficient !== 0
    ? { variableCoefficient, constant }
    : undefined;
}

function selectedVariableDegree(node: unknown, variable: string): number | undefined {
  if (node === variable) return 1;
  if (!dependsOnVariable(node, variable)) return 0;
  if (!Array.isArray(node)) return undefined;
  if (node[0] === 'Negate' && node.length === 2) {
    return selectedVariableDegree(node[1], variable);
  }
  if (node[0] === 'Power' && node.length === 3) {
    const baseDegree = selectedVariableDegree(node[1], variable);
    const exponent = exactRationalScalar(node[2]);
    return baseDegree !== undefined && exponent?.denominator === 1 && exponent.numerator >= 0
      ? baseDegree * exponent.numerator
      : undefined;
  }
  if (node[0] === 'Multiply') {
    const degrees = node.slice(1).map((factor) => selectedVariableDegree(factor, variable));
    return degrees.every((degree) => degree !== undefined)
      ? degrees.reduce<number>((sum, degree) => sum + (degree ?? 0), 0)
      : undefined;
  }
  return undefined;
}

function orderedProductFactors(
  factors: unknown[],
  options: CalculusStandardMathRenderOptions,
) {
  if (!options.variable) return factors;
  return factors
    .map((factor, index) => ({ factor, index }))
    .sort((left, right) => {
      if (typeof left.factor === 'string' && typeof right.factor === 'string') {
        const leftUpper = /^[A-Z]$/u.test(left.factor);
        const rightUpper = /^[A-Z]$/u.test(right.factor);
        if (leftUpper !== rightUpper) return leftUpper ? -1 : 1;
        return left.factor.localeCompare(right.factor);
      }
      const leftDepends = dependsOnVariable(left.factor, options.variable as string);
      const rightDepends = dependsOnVariable(right.factor, options.variable as string);
      return leftDepends === rightDepends ? left.index - right.index : leftDepends ? 1 : -1;
    })
    .map(({ factor }) => factor);
}

function compactProductLatex(
  rawFactors: unknown[],
  options: CalculusStandardMathRenderOptions,
) {
  const factors = orderedProductFactors(rawFactors, options);
  return factors.map((factor, index) => {
    const rendered = isAdditiveNode(factor)
      ? `\\left(${standardMathLatex(factor, options)}\\right)`
      : standardMathLatex(factor, options);
    if (index === 0) return rendered;
    const separator = Array.isArray(factor) && (factor[0] === 'Ln' || factor[0] === 'Log')
      ? String.raw`\cdot`
      : shouldUseProductDot(factors[index - 1], factor)
        ? String.raw`\cdot `
        : '';
    return `${separator}${rendered}`;
  }).join('');
}

function productFactorsLatex(
  factors: unknown[],
  options: CalculusStandardMathRenderOptions,
) {
  return factors.some(containsFormalApply)
    ? explicitProductLatex(factors, options)
    : compactProductLatex(factors, options);
}

function renderCoefficientTimesDivide(
  coefficient: ExactRational,
  divideNode: unknown[],
  options: CalculusStandardMathRenderOptions,
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

  return String.raw`\frac{${productFactorsLatex(numeratorFactors, options)}}{${productFactorsLatex(denominatorFactors, options)}}`;
}

function renderedSymbol(symbol: string) {
  if (symbol === 'ExponentialE') return 'e';
  const indexedGreek = /^(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)_([0-9]+)$/u.exec(symbol);
  return indexedGreek ? `\\${indexedGreek[1]}_{${indexedGreek[2]}}` : undefined;
}

function orderedAddTerms(
  terms: unknown[],
  options: CalculusStandardMathRenderOptions,
) {
  if (!options.variable) return terms;
  return terms
    .map((term, index) => ({
      term,
      index,
      degree: selectedVariableDegree(term, options.variable as string),
    }))
    .sort((left, right) => {
      if (left.degree === undefined || right.degree === undefined || left.degree === right.degree) {
        return left.index - right.index;
      }
      return right.degree - left.degree;
    })
    .map(({ term }) => term);
}

function standardMathLatex(
  mathJson: unknown,
  options: CalculusStandardMathRenderOptions = {},
): string {
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
    return formalApplyLatex(mathJson, options);
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
    return String.raw`\sqrt{${standardMathLatex(mathJson[1], options)}}`;
  }

  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Power'
    && mathJson.length === 3
    && containsFormalApply(mathJson[1])
  ) {
    const exponentLatex = standardMathLatex(mathJson[2], options);
    return `${standardMathLatex(mathJson[1], options)}^{${exponentLatex}}`;
  }

  if (
    Array.isArray(mathJson)
    && mathJson[0] === 'Power'
    && mathJson.length === 3
    && Array.isArray(mathJson[1])
  ) {
    const base = standardFunctionPowerLatex(mathJson[1], mathJson[2], options);
    if (base) {
      return base;
    }
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Sqrt' && mathJson.length === 2) {
    return String.raw`\sqrt{${standardMathLatex(mathJson[1], options)}}`;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Power' && mathJson.length === 3) {
    const base = isAdditiveNode(mathJson[1])
      ? `\\left(${standardMathLatex(mathJson[1], options)}\\right)`
      : standardMathLatex(mathJson[1], options);
    const exponentLatex = standardMathLatex(mathJson[2], options);
    return `${base}^{${exponentLatex}}`;
  }

  if (
    Array.isArray(mathJson)
    && (mathJson[0] === 'Ln' || mathJson[0] === 'Log')
    && mathJson.length === 2
  ) {
    if (Array.isArray(mathJson[1]) && mathJson[1][0] === 'Abs' && mathJson[1].length === 2) {
      const absoluteArgument = mathJson[1][1];
      const argumentLatex = Array.isArray(absoluteArgument)
        && (absoluteArgument[0] === 'Ln' || absoluteArgument[0] === 'Log')
        && absoluteArgument.length === 2
        ? `\\ln\\left(${standardMathLatex(absoluteArgument[1], options)}\\right)`
        : standardMathLatex(absoluteArgument, options);
      return `\\ln\\left|${argumentLatex}\\right|`;
    }
    return `\\ln${groupedArgumentLatex(mathJson[1], options)}`;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Abs' && mathJson.length === 2) {
    return `\\left|${standardMathLatex(mathJson[1], options)}\\right|`;
  }

  if (Array.isArray(mathJson)) {
    const renderedFunction = standardFunctionLatex(mathJson, options);
    if (renderedFunction) return renderedFunction;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Divide' && mathJson.length === 3) {
    const numerator = positiveMagnitudeNode(mathJson[1]);
    if (numerator !== undefined) {
      return `-${standardMathLatex(['Divide', numerator, mathJson[2]], options)}`;
    }
    const numeratorSplit = splitProductCoefficient(mathJson[1]);
    const denominatorScalar = exactRationalScalar(mathJson[2]);
    if (
      denominatorScalar
      && numeratorSplit.coefficient.numerator === numeratorSplit.coefficient.denominator
      && numeratorSplit.factors.length > 0
    ) {
      return String.raw`\frac{${standardMathLatex(mathJson[1], options)}}{${standardMathLatex(mathJson[2], options)}}`;
    }
    if (
      denominatorScalar
      && numeratorSplit.coefficient.numerator !== numeratorSplit.coefficient.denominator
    ) {
      const coefficient = divideExactRationals(numeratorSplit.coefficient, denominatorScalar);
      if (coefficient) {
        return standardMathLatex(
          numeratorSplit.factors.length === 0
            ? rationalNode(coefficient)
            : ['Multiply', rationalNode(coefficient), ...numeratorSplit.factors],
          options,
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
      const rendered = String.raw`\frac{${productFactorsLatex([
        ...(absoluteCoefficient.numerator === 1 ? [] : [absoluteCoefficient.numerator]),
        ...numeratorSplit.factors,
      ], options)}}{${standardMathLatex(coefficientDenominator, options)}}`;
      return negative ? `-${rendered}` : rendered;
    }
    const rationalNumerator = exactRationalScalar(mathJson[1]);
    if (rationalNumerator && rationalNumerator.denominator !== 1) {
      const coefficient = standardMathLatex(mathJson[1], options);
      const reciprocal = String.raw`\frac{1}{${standardMathLatex(mathJson[2], options)}}`;
      return `${coefficient}\\cdot ${reciprocal}`;
    }
    return String.raw`\frac{${standardMathLatex(mathJson[1], options)}}{${standardMathLatex(mathJson[2], options)}}`;
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
        const rendered = renderCoefficientTimesDivide(exactCoefficient, factors[0], options);
        if (rendered) {
          return negative ? `-${rendered}` : rendered;
        }
      }
      if (exactCoefficient.denominator !== 1 && factors.length > 0) {
        const numeratorFactors = [
          ...(exactCoefficient.numerator === 1 ? [] : [exactCoefficient.numerator]),
          ...factors,
        ];
        const rendered = String.raw`\frac{${productFactorsLatex(
          numeratorFactors,
          options,
        )}}{${exactCoefficient.denominator}}`;
        return negative ? `-${rendered}` : rendered;
      }
      factors.unshift(exactCoefficient.denominator === 1
        ? exactCoefficient.numerator
        : ['Rational', exactCoefficient.numerator, exactCoefficient.denominator]);
    }
    const divideIndex = factors.findIndex((factor) =>
      Array.isArray(factor) && factor[0] === 'Divide' && factor.length === 3,
    );
    if (divideIndex >= 0 && factors.length > 1) {
      const divideFactor = factors[divideIndex] as unknown[];
      const otherFactors = factors.filter((_, index) => index !== divideIndex);
      const preserveSpecialPrefactor = exactRationalScalar(divideFactor[2]) !== undefined
        && otherFactors.every((factor) =>
          Array.isArray(factor)
          && typeof factor[0] === 'string'
          && STANDARD_FUNCTION_LATEX.get(factor[0])?.startsWith('\\operatorname'));
      if (!preserveSpecialPrefactor) {
        const numerator = Array.isArray(divideFactor[1])
          && divideFactor[1][0] === 'Negate'
          && divideFactor[1].length === 2
          ? divideFactor[1][1]
          : divideFactor[1];
        const divideNegative = Array.isArray(divideFactor[1])
          && divideFactor[1][0] === 'Negate'
          && divideFactor[1].length === 2;
        const rendered = String.raw`\frac{${productFactorsLatex(
          [numerator, ...otherFactors],
          options,
        )}}{${standardMathLatex(divideFactor[2], options)}}`;
        return negative !== divideNegative ? `-${rendered}` : rendered;
      }
    }
    const ordered = [
      ...factors.filter(isScalarNode),
      ...factors.filter((factor) => !isScalarNode(factor)),
    ];
    const normalized = ordered.length === 0
      ? '1'
        : ordered.length === 1
        ? standardMathLatex(ordered[0], options)
        : ordered.some(containsFormalApply)
          ? explicitProductLatex(ordered, options)
          : compactProductLatex(ordered, options);
    return negative ? `-${normalized}` : normalized;
  }

  if (Array.isArray(mathJson) && mathJson[0] === 'Subtract' && mathJson.length >= 3) {
    return standardMathLatex([
      'Add',
      mathJson[1],
      ...mathJson.slice(2).map((term) => ['Negate', term]),
    ], options);
  }

  if (!Array.isArray(mathJson) || mathJson[0] !== 'Add' || mathJson.length < 2) {
    if (Array.isArray(mathJson) && mathJson[0] === 'Negate' && mathJson.length === 2) {
      const operand = standardMathLatex(mathJson[1], options);
      return isAdditiveNode(mathJson[1]) ? `-(${operand})` : `-${operand}`;
    }
    if (typeof mathJson === 'string') {
      return renderedSymbol(mathJson) ?? printedStandardMathLatex(mathJson);
    }
    return printedStandardMathLatex(mathJson);
  }

  return orderedAddTerms(mathJson.slice(1), options).map((term, index) => {
    if (
      Array.isArray(term)
      && term[0] === 'Negate'
      && term.length === 2
      && (!Array.isArray(term[1]) || (term[1][0] !== 'Add' && term[1][0] !== 'Subtract'))
    ) {
      return `-${standardMathLatex(term[1], options)}`;
    }
    const rendered = standardMathLatex(term, options);
    return index === 0 || rendered.startsWith('-') ? rendered : `+${rendered}`;
  }).join('');
}

export function renderCalculusStandardMathJson(
  mathJson: unknown,
  options: CalculusStandardMathRenderOptions = {},
): string {
  return standardMathLatex(normalizeStandardMathJson(mathJson), options);
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
