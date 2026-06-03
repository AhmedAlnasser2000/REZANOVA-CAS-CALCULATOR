import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  type ExactScalar,
} from '../algebra/polynomial-core';
import {
  solveEquationAlgebraicIsolation,
  type EquationAlgebraicIsolationOptions,
  type EquationAlgebraicIsolationSuccess,
} from './equation-algebraic-isolation';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function simplifyNode(node: MathJson): MathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

function exactScalarIsZero(value: ExactScalar) {
  return normalizeExactScalar(value).numerator === 0;
}

function perfectSquare(value: number) {
  if (value < 0 || !Number.isInteger(value)) {
    return null;
  }
  const root = Math.sqrt(value);
  return Number.isInteger(root) ? root : null;
}

function sqrtExactScalar(value: ExactScalar): ExactScalar | null {
  const normalized = normalizeExactScalar(value);
  const numeratorRoot = perfectSquare(normalized.numerator);
  const denominatorRoot = perfectSquare(normalized.denominator);
  return numeratorRoot !== null && denominatorRoot !== null
    ? normalizeExactScalar({ numerator: numeratorRoot, denominator: denominatorRoot })
    : null;
}

function sqrtExactScalarLatex(value: ExactScalar) {
  const exactRoot = sqrtExactScalar(value);
  if (exactRoot) {
    return exactScalarToLatex(exactRoot);
  }

  return `\\sqrt{${exactScalarToLatex(value)}}`;
}

function scalarAbs(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalizeExactScalar({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
}

function coefficientTimesSqrtLatex(sqrtValue: ExactScalar, coefficient: ExactScalar) {
  const exactRoot = sqrtExactScalar(sqrtValue);
  if (exactRoot) {
    const product = normalizeExactScalar({
      numerator: exactRoot.numerator * coefficient.numerator,
      denominator: exactRoot.denominator * coefficient.denominator,
    });
    return exactScalarToLatex(scalarAbs(product));
  }

  const absCoefficient = scalarAbs(coefficient);
  const sqrtLatex = sqrtExactScalarLatex(sqrtValue);
  if (absCoefficient.numerator === 1 && absCoefficient.denominator === 1) {
    return sqrtLatex;
  }

  return `${exactScalarToLatex(absCoefficient)}${sqrtLatex}`;
}

function imaginaryTermLatex(magnitudeLatex: string) {
  return magnitudeLatex === '1' ? 'i' : `${magnitudeLatex}i`;
}

function complexBranchLatex(real: ExactScalar, imaginaryMagnitudeLatex: string, sign: 1 | -1) {
  const realLatex = exactScalarToLatex(real);
  const imaginary = imaginaryTermLatex(imaginaryMagnitudeLatex);
  if (exactScalarIsZero(real)) {
    return sign === 1 ? imaginary : `-${imaginary}`;
  }

  return `${realLatex}${sign === 1 ? '+' : '-'}${imaginary}`;
}

function exactLatexForBranches(target: string, branches: string[]) {
  const unique = [...new Set(branches)];
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function parseZeroPolynomial(equationLatex: string, target: string) {
  const json = ce.parse(equationLatex).json as MathJson;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  const zeroForm = simplifyNode(['Subtract', json[1] as MathJson, json[2] as MathJson]);
  const polynomial = parseExactPolynomial(zeroForm, target, 2);
  return polynomial && exactPolynomialDegree(polynomial) === 2 ? polynomial : null;
}

function solveNegativeDiscriminantQuadratic(
  equationLatex: string,
  target: string,
): EquationAlgebraicIsolationSuccess | null {
  let polynomial: ReturnType<typeof parseZeroPolynomial>;
  try {
    polynomial = parseZeroPolynomial(equationLatex, target);
  } catch {
    return null;
  }

  if (!polynomial) {
    return null;
  }

  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant || exactScalarToNumber(discriminant) >= 0) {
    return null;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const denominator = normalizeExactScalar({
    numerator: 2 * a.numerator,
    denominator: a.denominator,
  });
  const real = divideExactScalars(negateExactScalar(b), denominator);
  if (!real) {
    return null;
  }

  const imaginaryCoefficient = divideExactScalars({ numerator: 1, denominator: 1 }, denominator);
  if (!imaginaryCoefficient) {
    return null;
  }

  const positiveDiscriminantMagnitude = negateExactScalar(discriminant);
  const imaginaryMagnitudeLatex = coefficientTimesSqrtLatex(
    positiveDiscriminantMagnitude,
    imaginaryCoefficient,
  );
  const branches = [
    complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
    complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
  ];
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Domain',
      lines: [
        'Domain intent: Complex.',
        'Used the bounded complex quadratic formula because the discriminant is negative.',
        `Discriminant: ${exactScalarToLatex(discriminant)}.`,
      ],
    },
    {
      title: 'Solve Target',
      lines: [
        `Selected target: ${target}`,
        parameterNames.length > 0
          ? `Symbolic parameters: ${parameterNames.join(', ')}`
          : 'No symbolic parameters were preserved.',
      ],
    },
  ];

  return {
    kind: 'success',
    target,
    parameterNames,
    generatedEquationLatex: equationLatex,
    exactLatex: exactLatexForBranches(target, branches),
    detailSections,
    answerDomain: 'complex',
  };
}

export function solveBoundedComplexEquation(
  equationLatex: string,
  target: string,
  options: EquationAlgebraicIsolationOptions = {},
): EquationAlgebraicIsolationSuccess | null {
  const quadratic = solveNegativeDiscriminantQuadratic(equationLatex, target);
  if (quadratic) {
    return quadratic;
  }

  const power = solveEquationAlgebraicIsolation(equationLatex, target, {
    ...options,
    answerDomain: 'complex',
  });

  return power.kind === 'success' && power.answerDomain === 'complex'
    ? power
    : null;
}
