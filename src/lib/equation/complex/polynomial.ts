import type { ComplexExactForm, DisplayDetailSection, OutputStyle } from '../../../types/calculator';
import { factorBoundedPolynomialAst } from '../../algebra/polynomial-factor-solve';
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
} from '../../algebra/polynomial-core';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { equationLabelLineParts } from '../../display/result-detail-lines';
import { complex } from '../../numeric/complex';
import { solveEquationAlgebraicIsolation, type EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { extractEquationPolynomialDomain } from '../equation-polynomial-domain';
import { branchFromRealScalar, buildBranchReadback, complexBranchLatex } from './branches';
import {
  coefficientTimesSqrtLatex,
  exactScalarToLatex,
  sqrtExactScalar,
  sqrtExactScalarLatex,
} from './exact';
import { ce, isArrayNode, simplifyNode } from './math-json';
import { type ComplexEquationBranch, type ComplexEquationOptions, type ComplexPolynomialBranchResult, type MathJson } from './types';
import { profileEquationResult } from '../../display/printer';

export function realLinearEquationBranch(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>) {
  const root = divideExactScalars(
    negateExactScalar(getExactPolynomialCoefficient(polynomial, 0)),
    getExactPolynomialCoefficient(polynomial, 1),
  );
  return root ? branchFromRealScalar(root) : null;
}

export function realQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>): ComplexEquationBranch[] | null {
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
    profileEquationResult({
      exactLatex: `\\frac{${exactScalarToLatex(negativeB)}-${discriminantLatex}}{${denominatorLatex}}`,
      approxValue: complex((negativeBNumber - Math.sqrt(discriminantNumber)) / denominatorNumber, 0),
    }),
    profileEquationResult({
      exactLatex: `\\frac{${exactScalarToLatex(negativeB)}+${discriminantLatex}}{${denominatorLatex}}`,
      approxValue: complex((negativeBNumber + Math.sqrt(discriminantNumber)) / denominatorNumber, 0),
    }),
  ];
}

export function complexQuadraticBranches(polynomial: NonNullable<ReturnType<typeof parseExactPolynomial>>): ComplexEquationBranch[] | null {
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
    profileEquationResult({
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
      approxValue: complex(realNumber, -imaginaryMagnitudeNumber),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: negateExactScalar(exactImaginaryMagnitude) }
        : undefined,
    }),
    profileEquationResult({
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
      approxValue: complex(realNumber, imaginaryMagnitudeNumber),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: exactImaginaryMagnitude }
        : undefined,
    }),
  ];
}

export function solvePolynomialComplexBranchesFromNode(
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

export function solveFactorableComplexPolynomial(
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
      lineKind: 'text',
      lines: [
        'Domain intent: Complex.',
        'Factored the bounded polynomial and solved linear/quadratic factors over the complex domain.',
        `Polynomial degree: ${exactPolynomialDegree(extracted.metadata.polynomial)}.`,
        `Factorization: ${factorization.factorizedLatex}.`,
      ],
      lineParts: [
        [],
        [],
        [],
        equationLabelLineParts('Factorization', `${factorization.factorizedLatex}.`),
      ],
    },
    {
      title: 'Solve Target',
      lineKind: 'text',
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
    ...(readback.canonicalMath ? { canonicalMath: readback.canonicalMath } : {}),
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

export function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

export function parseEquationZeroForm(equationLatex: string): MathJson | null {
  const json = ce.parse(equationLatex).json as MathJson;
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }

  return simplifyNode(['Subtract', json[1] as MathJson, json[2] as MathJson]);
}

export function parseZeroPolynomial(equationLatex: string, target: string) {
  const zeroForm = parseEquationZeroForm(equationLatex);
  if (!zeroForm) {
    return null;
  }

  const polynomial = parseExactPolynomial(zeroForm, target, 2);
  return polynomial && exactPolynomialDegree(polynomial) === 2 ? polynomial : null;
}

export function solveNegativeDiscriminantQuadratic(
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
    profileEquationResult({
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, -1),
      approxValue: complex(
        exactScalarToNumber(real),
        -Math.abs(exactScalarToNumber(imaginaryCoefficient)) * Math.sqrt(exactScalarToNumber(positiveDiscriminantMagnitude)),
      ),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: negateExactScalar(exactImaginaryMagnitude) }
        : undefined,
    }),
    profileEquationResult({
      exactLatex: complexBranchLatex(real, imaginaryMagnitudeLatex, 1),
      approxValue: complex(
        exactScalarToNumber(real),
        Math.abs(exactScalarToNumber(imaginaryCoefficient)) * Math.sqrt(exactScalarToNumber(positiveDiscriminantMagnitude)),
      ),
      exactComplex: exactImaginaryMagnitude
        ? { re: real, im: exactImaginaryMagnitude }
        : undefined,
    }),
  ];
  const readback = buildBranchReadback(target, branches, outputStyle, complexExactForm);
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Domain',
      lineKind: 'text',
      lines: [
        'Domain intent: Complex.',
        'Used the bounded complex quadratic formula because the discriminant is negative.',
        `Discriminant: ${exactScalarToLatex(discriminant)}.`,
      ],
    },
    {
      title: 'Solve Target',
      lineKind: 'text',
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
    ...(readback.canonicalMath ? { canonicalMath: readback.canonicalMath } : {}),
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

export function solveDirectComplexPowerEquation(
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
