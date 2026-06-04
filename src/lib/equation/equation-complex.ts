import { ComputeEngine } from '@cortex-js/compute-engine';
import type {
  ComplexExactForm,
  DisplayDetailSection,
  OutputStyle,
  SolveDomainConstraint,
} from '../../types/calculator';
import { factorBoundedPolynomialAst } from '../algebra/polynomial-factor-solve';
import { analyzeVariablesFromLatex } from '../algebra/variable-core';
import {
  addExactScalars,
  divideExactScalars,
  exactPolynomialDegree,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  quadraticDiscriminant,
  readExactScalarNode,
  subtractExactScalars,
  type ExactScalar,
} from '../algebra/polynomial-core';
import { classifyRationalDomainNode } from '../algebra/polynomial-domain-core';
import { complex, complexToApproxText, complexToLatex, type ComplexValue } from '../numeric/complex';
import {
  solveEquationAlgebraicIsolation,
  type EquationAlgebraicIsolationOptions,
  type EquationAlgebraicIsolationSuccess,
} from './equation-algebraic-isolation';
import { sortEquationBranchLatex } from './equation-branch-readback';
import { extractEquationPolynomialDomain } from './equation-polynomial-domain';

const ce = new ComputeEngine();

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };
type ComplexEquationOptions = EquationAlgebraicIsolationOptions & {
  outputStyle?: OutputStyle;
  complexExactForm?: ComplexExactForm;
};

type ExactComplexScalar = {
  re: ExactScalar;
  im: ExactScalar;
};

type ComplexEquationBranch = {
  exactLatex: string;
  approxValue?: ComplexValue;
  exactComplex?: ExactComplexScalar;
};

type ComplexPolynomialBranchResult = {
  branches: ComplexEquationBranch[];
  hasComplexBranch: boolean;
};

const ZERO_SCALAR: ExactScalar = { numerator: 0, denominator: 1 };
const ONE_SCALAR: ExactScalar = { numerator: 1, denominator: 1 };

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

function exactScalarIsOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === 1 && normalized.denominator === 1;
}

function exactScalarIsNegativeOne(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.numerator === -1 && normalized.denominator === 1;
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

function exactScalarImaginaryTermLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  if (exactScalarIsOne(normalized)) {
    return 'i';
  }
  if (exactScalarIsNegativeOne(normalized)) {
    return '-i';
  }
  const magnitude = scalarAbs(normalized);
  const term = imaginaryTermLatex(exactScalarToLatex(magnitude));
  return normalized.numerator < 0 ? `-${term}` : term;
}

function exactComplexToLatex(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  const hasReal = !exactScalarIsZero(normalized.re);
  const hasImaginary = !exactScalarIsZero(normalized.im);
  if (!hasImaginary) {
    return exactScalarToLatex(normalized.re);
  }
  if (!hasReal) {
    return exactScalarImaginaryTermLatex(normalized.im);
  }

  const realLatex = exactScalarToLatex(normalized.re);
  const imaginaryMagnitude = imaginaryTermLatex(exactScalarToLatex(scalarAbs(normalized.im)));
  return `${realLatex}${normalizeExactScalar(normalized.im).numerator < 0 ? '-' : '+'}${imaginaryMagnitude}`;
}

function squareExactScalar(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalizeExactScalar({
    numerator: normalized.numerator * normalized.numerator,
    denominator: normalized.denominator * normalized.denominator,
  });
}

function exactComplexAngleLatex(value: ExactComplexScalar) {
  const normalized = normalizeExactComplexScalar(value);
  const real = normalizeExactScalar(normalized.re);
  const imaginary = normalizeExactScalar(normalized.im);
  if (real.numerator === 0) {
    return imaginary.numerator >= 0 ? '\\frac{\\pi}{2}' : '-\\frac{\\pi}{2}';
  }
  if (imaginary.numerator === 0) {
    return real.numerator >= 0 ? '0' : '\\pi';
  }

  const ratio = divideExactScalars(scalarAbs(imaginary), scalarAbs(real));
  if (!ratio) {
    return null;
  }
  const arctan = `\\arctan\\left(${exactScalarToLatex(ratio)}\\right)`;
  if (real.numerator > 0) {
    return imaginary.numerator > 0 ? arctan : `-${arctan}`;
  }
  return imaginary.numerator > 0 ? `\\pi-${arctan}` : `-\\pi+${arctan}`;
}

function exactComplexToFormLatex(value: ExactComplexScalar, form: ComplexExactForm) {
  if (form === 'rectangular') {
    return exactComplexToLatex(value);
  }

  const normalized = normalizeExactComplexScalar(value);
  if (exactScalarIsZero(normalized.im)) {
    return exactScalarToLatex(normalized.re);
  }

  const radiusSquared = addExactScalars(squareExactScalar(normalized.re), squareExactScalar(normalized.im));
  const radiusLatex = sqrtExactScalarLatex(radiusSquared);
  const angleLatex = exactComplexAngleLatex(normalized);
  if (!angleLatex) {
    return null;
  }

  if (form === 'cis') {
    const unit = `\\operatorname{cis}\\left(${angleLatex}\\right)`;
    return radiusLatex === '1' ? unit : `${radiusLatex}${unit}`;
  }

  const unit = `\\cos\\left(${angleLatex}\\right)+i\\sin\\left(${angleLatex}\\right)`;
  return radiusLatex === '1' ? unit : `${radiusLatex}\\left(${unit}\\right)`;
}

function complexBranchLatex(real: ExactScalar, imaginaryMagnitudeLatex: string, sign: 1 | -1) {
  const realLatex = exactScalarToLatex(real);
  const imaginary = imaginaryTermLatex(imaginaryMagnitudeLatex);
  if (exactScalarIsZero(real)) {
    return sign === 1 ? imaginary : `-${imaginary}`;
  }

  return `${realLatex}${sign === 1 ? '+' : '-'}${imaginary}`;
}

function normalizedBranchAngle(value: ComplexValue) {
  return Math.atan2(value.im, value.re);
}

function orderComplexBranches(branches: ComplexEquationBranch[]) {
  if (!branches.every((branch) => branch.approxValue)) {
    const unique = sortEquationBranchLatex([...new Set(branches.map((branch) => branch.exactLatex))]);
    return unique
      .map((exactLatex) => branches.find((branch) => branch.exactLatex === exactLatex))
      .filter((branch): branch is ComplexEquationBranch => Boolean(branch));
  }

  return [...branches].sort((left, right) => {
    const leftApprox = left.approxValue as ComplexValue;
    const rightApprox = right.approxValue as ComplexValue;
    const leftReal = Math.abs(leftApprox.im) < 1e-10;
    const rightReal = Math.abs(rightApprox.im) < 1e-10;
    if (leftReal !== rightReal) {
      return leftReal ? -1 : 1;
    }
    if (leftReal && rightReal) {
      return leftApprox.re - rightApprox.re;
    }
    const angleDifference = normalizedBranchAngle(leftApprox) - normalizedBranchAngle(rightApprox);
    return Math.abs(angleDifference) > 1e-12
      ? angleDifference
      : left.exactLatex.localeCompare(right.exactLatex);
  });
}

function exactLatexForBranches(target: string, branches: string[], options: { preserveOrder?: boolean } = {}) {
  const unique = options.preserveOrder ? [...new Set(branches)] : sortEquationBranchLatex([...new Set(branches)]);
  return `${target}\\in\\left\\{${unique.join(',\\ ')}\\right\\}`;
}

function branchFromRealScalar(value: ExactScalar): ComplexEquationBranch {
  const normalized = normalizeExactScalar(value);
  return {
    exactLatex: exactScalarToLatex(normalized),
    approxValue: complex(exactScalarToNumber(normalized), 0),
    exactComplex: { re: normalized, im: ZERO_SCALAR },
  };
}

function branchFromExactComplex(value: ExactComplexScalar): ComplexEquationBranch {
  const normalized = normalizeExactComplexScalar(value);
  return {
    exactLatex: exactComplexToLatex(normalized),
    approxValue: complex(exactScalarToNumber(normalized.re), exactScalarToNumber(normalized.im)),
    exactComplex: normalized,
  };
}

function buildBranchReadback(
  target: string,
  branches: ComplexEquationBranch[],
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
) {
  const uniqueBranches = [...new Map(
    branches.map((branch) => [branch.exactLatex, branch] as const),
  ).values()];
  const unique = orderComplexBranches(uniqueBranches);
  const canApproximate = unique.every((branch) => branch.approxValue);
  const approximateBranches = canApproximate
    ? unique.map((branch) => complexToLatex(branch.approxValue as ComplexValue))
    : [];
  const approximateText = canApproximate
    ? `${target} ~= ${unique.map((branch) => complexToApproxText(branch.approxValue as ComplexValue)).join(', ')}`
    : undefined;

  if (outputStyle === 'decimal' && canApproximate) {
    return {
      exactLatex: `${target}\\in\\left\\{${approximateBranches.join(',\\ ')}\\right\\}`,
      approxText: undefined,
    };
  }

  const exactBranches = unique.map((branch) => {
    if (!branch.exactComplex) {
      return branch.exactLatex;
    }
    return exactComplexToFormLatex(branch.exactComplex, complexExactForm) ?? branch.exactLatex;
  });

  return {
    exactLatex: exactLatexForBranches(target, exactBranches, { preserveOrder: true }),
    approxText: outputStyle === 'both' ? approximateText : undefined,
  };
}

function realLinearEquationBranch(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>) {
  const root = divideExactScalars(
    negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
    getExactPolynomialCoefficient(polynomial, 1),
  );
  return root ? branchFromRealScalar(root) : null;
}

function realQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>): ComplexEquationBranch[] | null {
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
    return root ? [branchFromRealScalar(root)] : null;
  }
  if (exactRoot) {
    const first = divideExactScalars(addExactScalars(negativeB, negateExactScalar(exactRoot)), denominator);
    const second = divideExactScalars(addExactScalars(negativeB, exactRoot), denominator);
    return first && second ? [branchFromRealScalar(first), branchFromRealScalar(second)] : null;
  }

  const denominatorLatex = exactScalarToLatex(denominator);
  const discriminantLatex = sqrtExactScalarLatex(discriminant);
  const discriminantNumber = exactScalarToNumber(discriminant);
  const negativeBNumber = exactScalarToNumber(negativeB);
  const denominatorNumber = exactScalarToNumber(denominator);
  return [
    {
      exactLatex: `\\frac{${exactScalarToLatex(negativeB)}-${discriminantLatex}}{${denominatorLatex}}`,
      approxValue: complex((negativeBNumber - Math.sqrt(discriminantNumber)) / denominatorNumber, 0),
    },
    {
      exactLatex: `\\frac{${exactScalarToLatex(negativeB)}+${discriminantLatex}}{${denominatorLatex}}`,
      approxValue: complex((negativeBNumber + Math.sqrt(discriminantNumber)) / denominatorNumber, 0),
    },
  ];
}

function complexQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>): ComplexEquationBranch[] | null {
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
  const exactImaginaryMagnitudeRoot = sqrtExactScalar(positiveDiscriminantMagnitude);
  const exactImaginaryMagnitude = exactImaginaryMagnitudeRoot
    ? normalizeExactScalar({
      numerator: Math.abs(imaginaryCoefficient.numerator) * exactImaginaryMagnitudeRoot.numerator,
      denominator: imaginaryCoefficient.denominator * exactImaginaryMagnitudeRoot.denominator,
    })
    : null;
  const realNumber = exactScalarToNumber(real);
  const imaginaryMagnitudeNumber = Math.abs(exactScalarToNumber(imaginaryCoefficient))
    * Math.sqrt(exactScalarToNumber(positiveDiscriminantMagnitude));
  return [
    {
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
      approxValue: complex(realNumber, -imaginaryMagnitudeNumber),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: negateExactScalar(exactImaginaryMagnitude) }
        : undefined,
    },
    {
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
      approxValue: complex(realNumber, imaginaryMagnitudeNumber),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: exactImaginaryMagnitude }
        : undefined,
    },
  ];
}

function solvePolynomialComplexBranchesFromNode(
  node: unknown,
  target: string,
): ComplexPolynomialBranchResult | null {
  const polynomial = parseExactPolynomial(node, target, 4);
  if (!polynomial) {
    return null;
  }

  const degree = exactPolynomialDegree(polynomial);
  if (degree < 1 || degree > 4) {
    return null;
  }

  if (degree === 1) {
    const branch = realLinearEquationBranch(polynomial);
    return branch ? { branches: [branch], hasComplexBranch: false } : null;
  }

  if (degree === 2) {
    const complexBranches = complexQuadraticBranches(polynomial);
    if (complexBranches) {
      return { branches: complexBranches, hasComplexBranch: true };
    }
    const realBranches = realQuadraticBranches(polynomial);
    return realBranches ? { branches: realBranches, hasComplexBranch: false } : null;
  }

  const factorization = factorBoundedPolynomialAst(node, target);
  if (!factorization) {
    return null;
  }

  const branches: ComplexEquationBranch[] = [];
  let hasComplexBranch = false;
  for (const factor of factorization.factors) {
    const factorPolynomial = parseExactPolynomial(factor.node, target, 2);
    if (!factorPolynomial) {
      return null;
    }
    if (factor.degree === 1) {
      const branch = realLinearEquationBranch(factorPolynomial);
      if (!branch) {
        return null;
      }
      branches.push(branch);
      continue;
    }
    if (factor.degree === 2) {
      const complexBranches = complexQuadraticBranches(factorPolynomial);
      if (complexBranches) {
        hasComplexBranch = true;
        branches.push(...complexBranches);
        continue;
      }
      const realBranches = realQuadraticBranches(factorPolynomial);
      if (!realBranches) {
        return null;
      }
      branches.push(...realBranches);
      continue;
    }
    return null;
  }

  return { branches, hasComplexBranch };
}

function solveFactorableComplexPolynomial(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
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

  const branches: ComplexEquationBranch[] = [];
  let hasComplexBranch = false;
  for (const factor of factorization.factors) {
    const polynomial = parseExactPolynomial(factor.node, target, 2);
    if (!polynomial) {
      return null;
    }
    if (factor.degree === 1) {
      const branch = realLinearEquationBranch(polynomial);
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

  const readback = buildBranchReadback(target, branches, outputStyle, complexExactForm);
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
    exactLatex: readback.exactLatex,
    approxText: readback.approxText,
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

function parseEquationZeroForm(equationLatex: string): MathJson | null {
  const json = ce.parse(equationLatex).json as MathJson;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  return simplifyNode(['Subtract', json[1] as MathJson, json[2] as MathJson]);
}

function parseZeroPolynomial(equationLatex: string, target: string) {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }

  const polynomial = parseExactPolynomial(zeroForm, target, 2);
  return polynomial && exactPolynomialDegree(polynomial) === 2 ? polynomial : null;
}

function solveNegativeDiscriminantQuadratic(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
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
  const exactImaginaryMagnitudeRoot = sqrtExactScalar(positiveDiscriminantMagnitude);
  const exactImaginaryMagnitude = exactImaginaryMagnitudeRoot
    ? normalizeExactScalar({
      numerator: Math.abs(imaginaryCoefficient.numerator) * exactImaginaryMagnitudeRoot.numerator,
      denominator: imaginaryCoefficient.denominator * exactImaginaryMagnitudeRoot.denominator,
    })
    : null;
  const branches = [
    {
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
      approxValue: complex(
        exactScalarToNumber(real),
        -Math.abs(exactScalarToNumber(imaginaryCoefficient)) * Math.sqrt(exactScalarToNumber(positiveDiscriminantMagnitude)),
      ),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: negateExactScalar(exactImaginaryMagnitude) }
        : undefined,
    },
    {
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
      approxValue: complex(
        exactScalarToNumber(real),
        Math.abs(exactScalarToNumber(imaginaryCoefficient)) * Math.sqrt(exactScalarToNumber(positiveDiscriminantMagnitude)),
      ),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: exactImaginaryMagnitude }
        : undefined,
    },
  ];
  const readback = buildBranchReadback(target, branches, outputStyle, complexExactForm);
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
    exactLatex: readback.exactLatex,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

function normalizeExactComplexScalar(value: ExactComplexScalar): ExactComplexScalar {
  return {
    re: normalizeExactScalar(value.re),
    im: normalizeExactScalar(value.im),
  };
}

function addExactComplexScalars(left: ExactComplexScalar, right: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: addExactScalars(left.re, right.re),
    im: addExactScalars(left.im, right.im),
  });
}

function negateExactComplexScalar(value: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: negateExactScalar(value.re),
    im: negateExactScalar(value.im),
  });
}

function multiplyExactComplexScalars(left: ExactComplexScalar, right: ExactComplexScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: subtractExactScalars(multiplyExactScalars(left.re, right.re), multiplyExactScalars(left.im, right.im)),
    im: addExactScalars(multiplyExactScalars(left.re, right.im), multiplyExactScalars(left.im, right.re)),
  });
}

function multiplyExactComplexByScalar(value: ExactComplexScalar, scalar: ExactScalar): ExactComplexScalar {
  return normalizeExactComplexScalar({
    re: multiplyExactScalars(value.re, scalar),
    im: multiplyExactScalars(value.im, scalar),
  });
}

function divideExactComplexByScalar(value: ExactComplexScalar, scalar: ExactScalar) {
  const real = divideExactScalars(value.re, scalar);
  const imaginary = divideExactScalars(value.im, scalar);
  return real && imaginary ? normalizeExactComplexScalar({ re: real, im: imaginary }) : null;
}

function parseExactComplexConstantNode(node: unknown): ExactComplexScalar | null {
  const real = readExactScalarNode(node);
  if (real) {
    return { re: real, im: ZERO_SCALAR };
  }

  if (node === 'ImaginaryUnit') {
    return { re: ZERO_SCALAR, im: ONE_SCALAR };
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Complex' && node.length === 3) {
    const re = readExactScalarNode(node[1]);
    const im = readExactScalarNode(node[2]);
    return re && im ? normalizeExactComplexScalar({ re, im }) : null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = parseExactComplexConstantNode(node[1]);
    return child ? negateExactComplexScalar(child) : null;
  }

  if (node[0] === 'Add') {
    return node.slice(1).reduce<ExactComplexScalar | null>((sum, part) => {
      if (!sum) {
        return null;
      }
      const parsed = parseExactComplexConstantNode(part);
      return parsed ? addExactComplexScalars(sum, parsed) : null;
    }, { re: ZERO_SCALAR, im: ZERO_SCALAR });
  }

  if (node[0] === 'Subtract' && node.length === 3) {
    const left = parseExactComplexConstantNode(node[1]);
    const right = parseExactComplexConstantNode(node[2]);
    return left && right ? addExactComplexScalars(left, negateExactComplexScalar(right)) : null;
  }

  if (node[0] === 'Multiply') {
    return node.slice(1).reduce<ExactComplexScalar | null>((product, part) => {
      if (!product) {
        return null;
      }
      const parsed = parseExactComplexConstantNode(part);
      return parsed ? multiplyExactComplexScalars(product, parsed) : null;
    }, { re: ONE_SCALAR, im: ZERO_SCALAR });
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const numerator = parseExactComplexConstantNode(node[1]);
    const denominator = readExactScalarNode(node[2]);
    return numerator && denominator ? divideExactComplexByScalar(numerator, denominator) : null;
  }

  return null;
}

function containsTarget(node: unknown, target: string): boolean {
  if (node === target) {
    return true;
  }
  if (isArrayNode(node)) {
    return node.some((part) => containsTarget(part, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((part) => containsTarget(part, target));
  }
  return false;
}

type LinearComplexExpression = {
  coefficient: ExactScalar;
  constant: ExactComplexScalar;
};

function addLinearComplex(
  left: LinearComplexExpression,
  right: LinearComplexExpression,
): LinearComplexExpression {
  return {
    coefficient: addExactScalars(left.coefficient, right.coefficient),
    constant: addExactComplexScalars(left.constant, right.constant),
  };
}

function negateLinearComplex(value: LinearComplexExpression): LinearComplexExpression {
  return {
    coefficient: negateExactScalar(value.coefficient),
    constant: negateExactComplexScalar(value.constant),
  };
}

function multiplyLinearComplexByScalar(
  value: LinearComplexExpression,
  scalar: ExactScalar,
): LinearComplexExpression {
  return {
    coefficient: multiplyExactScalars(value.coefficient, scalar),
    constant: multiplyExactComplexByScalar(value.constant, scalar),
  };
}

function collectLinearComplex(node: unknown, target: string): LinearComplexExpression | null {
  if (node === target) {
    return {
      coefficient: ONE_SCALAR,
      constant: { re: ZERO_SCALAR, im: ZERO_SCALAR },
    };
  }

  if (!containsTarget(node, target)) {
    const constant = parseExactComplexConstantNode(node);
    return constant
      ? { coefficient: ZERO_SCALAR, constant }
      : null;
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = collectLinearComplex(node[1], target);
    return child ? negateLinearComplex(child) : null;
  }

  if (node[0] === 'Add') {
    return node.slice(1).reduce<LinearComplexExpression | null>((sum, part) => {
      if (!sum) {
        return null;
      }
      const parsed = collectLinearComplex(part, target);
      return parsed ? addLinearComplex(sum, parsed) : null;
    }, {
      coefficient: ZERO_SCALAR,
      constant: { re: ZERO_SCALAR, im: ZERO_SCALAR },
    });
  }

  if (node[0] === 'Subtract' && node.length === 3) {
    const left = collectLinearComplex(node[1], target);
    const right = collectLinearComplex(node[2], target);
    return left && right ? addLinearComplex(left, negateLinearComplex(right)) : null;
  }

  if (node[0] === 'Multiply') {
    const targetParts = node.slice(1).filter((part) => containsTarget(part, target));
    if (targetParts.length !== 1) {
      return null;
    }
    const targetPart = collectLinearComplex(targetParts[0], target);
    if (!targetPart || !exactScalarIsZero(targetPart.constant.im) || !exactScalarIsZero(targetPart.constant.re)) {
      return null;
    }
    const scalar = node.slice(1)
      .filter((part) => !containsTarget(part, target))
      .reduce<ExactScalar | null>((product, part) => {
        if (!product) {
          return null;
        }
        const parsed = readExactScalarNode(part);
        return parsed ? multiplyExactScalars(product, parsed) : null;
      }, ONE_SCALAR);
    return scalar ? multiplyLinearComplexByScalar(targetPart, scalar) : null;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    if (containsTarget(node[2], target)) {
      return null;
    }
    const numerator = collectLinearComplex(node[1], target);
    const denominator = readExactScalarNode(node[2]);
    const reciprocal = denominator ? divideExactScalars(ONE_SCALAR, denominator) : null;
    return numerator && reciprocal ? multiplyLinearComplexByScalar(numerator, reciprocal) : null;
  }

  return null;
}

function solveDirectComplexLinearEquation(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
): EquationAlgebraicIsolationSuccess | null {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }
  const linear = collectLinearComplex(zeroForm, target);
  if (!linear || exactScalarIsZero(linear.coefficient) || exactScalarIsZero(linear.constant.im)) {
    return null;
  }
  const negatedConstant = negateExactComplexScalar(linear.constant);
  const root = divideExactComplexByScalar(negatedConstant, linear.coefficient);
  if (!root) {
    return null;
  }

  const readback = buildBranchReadback(target, [branchFromExactComplex(root)], outputStyle, complexExactForm);
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Linear Route',
      lines: [
        'Domain intent: Complex.',
        'Solved a direct one-variable linear equation with an explicit imaginary constant.',
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
    exactLatex: readback.exactLatex,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

function domainConstraintToLatex(constraint: SolveDomainConstraint) {
  if (constraint.kind === 'nonzero') {
    return `${constraint.expressionLatex}\\ne0`;
  }
  if (constraint.kind === 'positive') {
    return `${constraint.expressionLatex}>0`;
  }
  if (constraint.kind === 'nonnegative') {
    return `${constraint.expressionLatex}\\ge0`;
  }
  return undefined;
}

function solveRationalComplexEquation(
  equationLatex: string,
  target: string,
  outputStyle: OutputStyle = 'exact',
  complexExactForm: ComplexExactForm = 'rectangular',
): EquationAlgebraicIsolationSuccess | null {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }
  const rational = classifyRationalDomainNode(zeroForm, { variable: target, maxDegree: 4 });
  if (rational.kind !== 'success' || !rational.metadata.denominatorLatex) {
    return null;
  }

  const solved = solvePolynomialComplexBranchesFromNode(rational.metadata.numerator.node, target);
  if (!solved || !solved.hasComplexBranch) {
    return null;
  }

  const readback = buildBranchReadback(target, solved.branches, outputStyle, complexExactForm);
  const exactSupplementLatex = rational.metadata.domainConstraints
    .map(domainConstraintToLatex)
    .filter((line): line is string => Boolean(line));
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Rational Route',
      lines: [
        'Domain intent: Complex.',
        'Solved numerator roots for a supported rational equation over the complex domain.',
        `Numerator: ${rational.metadata.numeratorLatex}.`,
        `Denominator: ${rational.metadata.denominatorLatex}.`,
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
    exactLatex: readback.exactLatex,
    approxText: readback.approxText,
    exactSupplementLatex,
    detailSections,
    answerDomain: 'complex',
  };
}

function solveDirectComplexPowerEquation(
  equationLatex: string,
  target: string,
  options: ComplexEquationOptions,
): EquationAlgebraicIsolationSuccess | null {
  const power = solveEquationAlgebraicIsolation(equationLatex, target, {
    ...options,
    answerDomain: 'complex',
    complexExactForm: options.complexExactForm ?? 'rectangular',
  });
  if (power.kind !== 'success' || power.answerDomain !== 'complex') {
    return null;
  }

  const detailText = power.detailSections
    .flatMap((section) => section.lines)
    .join(' ');
  return /selected-target power of degree (3|4)/u.test(detailText)
    ? power
    : null;
}

export function solveBoundedComplexEquation(
  equationLatex: string,
  target: string,
  options: ComplexEquationOptions = {},
): EquationAlgebraicIsolationSuccess | null {
  const outputStyle = options.outputStyle ?? 'exact';
  const complexExactForm = options.complexExactForm ?? 'rectangular';
  const directLinear = solveDirectComplexLinearEquation(equationLatex, target, outputStyle, complexExactForm);
  if (directLinear) {
    return directLinear;
  }

  const directPower = solveDirectComplexPowerEquation(equationLatex, target, {
    ...options,
    outputStyle,
    complexExactForm,
  });
  if (directPower) {
    return directPower;
  }

  const rational = solveRationalComplexEquation(equationLatex, target, outputStyle, complexExactForm);
  if (rational) {
    return rational;
  }

  const factorable = solveFactorableComplexPolynomial(equationLatex, target, outputStyle, complexExactForm);
  if (factorable) {
    return factorable;
  }

  const quadratic = solveNegativeDiscriminantQuadratic(equationLatex, target, outputStyle, complexExactForm);
  if (quadratic) {
    return quadratic;
  }

  const power = solveEquationAlgebraicIsolation(equationLatex, target, {
    ...options,
    answerDomain: 'complex',
    complexExactForm,
  });

  return power.kind === 'success' && power.answerDomain === 'complex'
    ? power
    : null;
}
