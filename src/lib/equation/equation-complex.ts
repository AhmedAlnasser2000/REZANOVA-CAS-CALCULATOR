import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayDetailSection } from '../../types/calculator';
import { factorBoundedPolynomialAst } from '../algebra/polynomial-factor-solve';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  addExactScalars,
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
import { extractEquationPolynomialDomain } from './equation-polynomial-domain';

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

function largestSquareFactor(value: number) {
  const absolute = Math.abs(value);
  let factor = 1;
  let remaining = absolute;
  for (let candidate = 2; candidate * candidate <= remaining; candidate += 1) {
    while (remaining % (candidate * candidate) === 0) {
      factor *= candidate;
      remaining /= candidate * candidate;
    }
  }
  return factor;
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
  const normalizedValue = normalizeExactScalar(sqrtValue);
  const numeratorOutside = largestSquareFactor(normalizedValue.numerator);
  const denominatorOutside = largestSquareFactor(normalizedValue.denominator);
  const outside = normalizeExactScalar({
    numerator: absCoefficient.numerator * numeratorOutside,
    denominator: absCoefficient.denominator * denominatorOutside,
  });
  const inside = normalizeExactScalar({
    numerator: normalizedValue.numerator / (numeratorOutside * numeratorOutside),
    denominator: normalizedValue.denominator / (denominatorOutside * denominatorOutside),
  });
  const sqrtLatex = sqrtExactScalarLatex(inside);
  if (outside.numerator === 1 && outside.denominator === 1) {
    return sqrtLatex;
  }
  if (outside.numerator === 0) {
    return '0';
  }
  return `${exactScalarToLatex(outside)}${sqrtLatex}`;
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

function realLinearBranch(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>) {
  const root = divideExactScalars(
    negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
    getExactPolynomialCoefficient(polynomial, 1),
  );
  return root ? exactScalarToLatex(root) : null;
}

function realQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>) {
  const discriminant = quadraticDiscriminant(polynomial);
  if (!discriminant || exactScalarToNumber(discriminant) < 0) {
    return null;
  }

  const a = getExactPolynomialCoefficient(polynomial, 2);
  const b = getExactPolynomialCoefficient(polynomial, 1);
  const denominator = normalizeExactScalar({
    numerator: 2 * a.numerator,
    denominator: a.denominator,
  });
  const negativeB = negateExactScalar(b);
  const exactRoot = sqrtExactScalar(discriminant);
  if (exactScalarToNumber(discriminant) === 0) {
    const root = divideExactScalars(negativeB, denominator);
    return root ? [exactScalarToLatex(root)] : null;
  }
  if (exactRoot) {
    const first = divideExactScalars(addExactScalars(negativeB, negateExactScalar(exactRoot)), denominator);
    const second = divideExactScalars(addExactScalars(negativeB, exactRoot), denominator);
    return first && second ? [exactScalarToLatex(first), exactScalarToLatex(second)] : null;
  }

  const denominatorLatex = exactScalarToLatex(denominator);
  const discriminantLatex = sqrtExactScalarLatex(discriminant);
  return [
    `\\frac{${exactScalarToLatex(negativeB)}-${discriminantLatex}}{${denominatorLatex}}`,
    `\\frac{${exactScalarToLatex(negativeB)}+${discriminantLatex}}{${denominatorLatex}}`,
  ];
}

function complexQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>) {
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
  const imaginaryCoefficient = divideExactScalars({ numerator: 1, denominator: 1 }, denominator);
  if (!real || !imaginaryCoefficient) {
    return null;
  }

  const positiveDiscriminantMagnitude = negateExactScalar(discriminant);
  const imaginaryMagnitudeLatex = coefficientTimesSqrtLatex(
    positiveDiscriminantMagnitude,
    imaginaryCoefficient,
  );
  return [
    complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
    complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
  ];
}

function solveFactorableComplexPolynomial(
  equationLatex: string,
  target: string,
): EquationAlgebraicIsolationSuccess | null {
  const extracted = extractEquationPolynomialDomain({
    equationLatex,
    target,
    allowedRelations: ['Equal'],
    maxDegree: 4,
  });
  if (extracted.kind !== 'success' || exactPolynomialDegree(extracted.metadata.polynomial) < 3) {
    return null;
  }

  const factorization = factorBoundedPolynomialAst(extracted.zeroForm, target);
  if (!factorization) {
    return null;
  }

  const branches: string[] = [];
  let hasComplexBranch = false;
  for (const factor of factorization.factors) {
    const polynomial = parseExactPolynomial(factor.node, target, 2);
    if (!polynomial) {
      return null;
    }
    if (factor.degree === 1) {
      const branch = realLinearBranch(polynomial);
      if (!branch) {
        return null;
      }
      branches.push(branch);
      continue;
    }
    if (factor.degree === 2) {
      const complexBranches = complexQuadraticBranches(polynomial);
      if (complexBranches) {
        hasComplexBranch = true;
        branches.push(...complexBranches);
        continue;
      }
      const realBranches = realQuadraticBranches(polynomial);
      if (!realBranches) {
        return null;
      }
      branches.push(...realBranches);
      continue;
    }
    return null;
  }

  if (!hasComplexBranch) {
    return null;
  }

  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Polynomial Route',
      lines: [
        'Domain intent: Complex.',
        'Factored the bounded polynomial and solved linear/quadratic factors over the complex domain.',
        `Polynomial degree: ${exactPolynomialDegree(extracted.metadata.polynomial)}.`,
        `Factorization: ${factorization.factorizedLatex}.`,
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
  const factorable = solveFactorableComplexPolynomial(equationLatex, target);
  if (factorable) {
    return factorable;
  }

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
