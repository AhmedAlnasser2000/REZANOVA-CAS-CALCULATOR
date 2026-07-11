import type {
  AnswerDomain,
  ComplexExactForm,
  DisplayBranchReadback,
  DisplayDetailSection,
  OutputStyle,
} from '../../../types/calculator';
import { equationLabelLineParts } from '../../display/result-detail-lines';
import {
  negateExactScalar,
  normalizeExactScalar,
  exactScalarToNumber,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { buildParameterizedDetailSections } from '../parameterized/readback';
import { solveParameterizedFactorablePolynomialEquation } from '../parameterized/factorable-polynomial';
import {
  exactLatexForFiniteBranches,
  finiteBranchReadbackForNormalizedBranches,
} from '../readback/finite-branches';
import { complexFromPolar, complexToApproxText, complexToLatex } from '../../numeric/complex';
import {
  hasTarget,
  isArrayNode,
  isNegativeOneNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  type MathJson,
} from './math-json';
import {
  MAX_ALGEBRAIC_POWER,
  polynomialDegreeInEquation,
  solvePowerExpression,
} from './algebraic-power';
import { peelOnce, type PeelPolicy, type PeelStep } from './peeling';
import { hasAmbiguousAdjacentProduct, parseIsolationEquation } from './target-context';

export type EquationAlgebraicIsolationStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-on-both-sides'
  | 'multiple-target-islands'
  | 'target-in-shell-factor'
  | 'target-in-denominator'
  | 'unsupported-shell'
  | 'unsupported-power-base'
  | 'unsupported-power-degree'
  | 'formula-size-limit'
  | 'no-algebraic-isolation';

export type EquationAlgebraicIsolationSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  approxText?: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
  answerDomain?: AnswerDomain;
};

export type EquationAlgebraicIsolationStop = {
  kind: 'unsupported';
  reason: EquationAlgebraicIsolationStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type EquationAlgebraicIsolationResult =
  | EquationAlgebraicIsolationSuccess
  | EquationAlgebraicIsolationStop;

export type EquationAlgebraicIsolationOptions = {
  allowGeneratedImplicitProducts?: boolean;
  inheritedFacts?: string[];
  answerDomain?: AnswerDomain;
  outputStyle?: OutputStyle;
  complexExactForm?: ComplexExactForm;
};

const ALGEBRAIC_PEEL_POLICY: PeelPolicy<EquationAlgebraicIsolationStopReason> = {
  multipleTargetIslandsReason: 'multiple-target-islands',
  targetInShellFactorReason: 'target-in-shell-factor',
  targetInDenominatorReason: 'target-in-denominator',
  unsupportedShellReason: 'unsupported-shell',
  noIsolationReason: 'no-algebraic-isolation',
  multipleAdditiveTargetMessage: 'The selected target appears in more than one algebraic island.',
  noAdditiveTargetMessage: 'No selected-target term was found in this algebraic shell.',
  multipleFactorTargetMessage: 'The selected target appears in more than one multiplicative factor.',
  noFactorTargetMessage: 'No selected-target factor was found in this algebraic shell.',
  invalidQuotientMessage: 'Only simple quotient shells are supported by algebraic isolation.',
  denominatorTargetMessage: 'The selected target appears in a denominator shell.',
  noNumeratorTargetMessage: 'No selected-target numerator was found in this quotient shell.',
  noIsolationMessage: 'No algebraic power shell remains to isolate.',
};

function exactLatexForSolutions(target: string, roots: string[], options: { preserveOrder?: boolean } = {}) {
  return exactLatexForFiniteBranches({
    targetLatex: target,
    branchesLatex: roots.filter(Boolean),
    preserveOrder: options.preserveOrder,
  });
}

function branchReadbackForSolutions(
  target: string,
  roots: string[],
  options: { preserveOrder?: boolean; source?: string } = {},
) {
  return finiteBranchReadbackForNormalizedBranches({
    targetLatex: target,
    branchesLatex: roots.filter(Boolean),
    preserveOrder: options.preserveOrder,
    source: options.source ?? 'equation-algebraic-isolation',
  });
}

function exactScalarToLatex(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator === 1
    ? `${normalized.numerator}`
    : `\\frac{${normalized.numerator}}{${normalized.denominator}}`;
}

function normalizeImaginaryLatex(latex: string) {
  return latex.replace(/\\imaginaryI/gu, 'i');
}

function negateLatex(latex: string) {
  const normalized = normalizeImaginaryLatex(latex);
  return normalized.startsWith('-') ? normalized.slice(1) : `-${normalized}`;
}

function groupedFactorLatex(latex: string) {
  return /^[A-Za-z0-9\\]+(?:\{[^{}]*\})?$/u.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function signedRootFactor(latex: string): { sign: 1 | -1; magnitude: string } {
  return latex.startsWith('-')
    ? { sign: -1, magnitude: latex.slice(1) }
    : { sign: 1, magnitude: latex };
}

function halfFactorLatex(magnitude: string) {
  const numeric = Number(magnitude);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric % 2 === 0 ? `${numeric / 2}` : `\\frac{${numeric}}{2}`;
  }
  return magnitude === '1' ? '\\frac{1}{2}' : `\\frac{${magnitude}}{2}`;
}

function sqrtThreeHalfFactorLatex(magnitude: string) {
  const numeric = Number(magnitude);
  if (Number.isInteger(numeric) && numeric > 0) {
    if (numeric === 1) {
      return '\\frac{\\sqrt{3}}{2}';
    }
    if (numeric % 2 === 0) {
      const coefficient = numeric / 2;
      return coefficient === 1 ? '\\sqrt{3}' : `${coefficient}\\sqrt{3}`;
    }
    return `\\frac{${numeric}\\sqrt{3}}{2}`;
  }
  return magnitude === '1'
    ? '\\frac{\\sqrt{3}}{2}'
    : `\\frac{\\sqrt{3}${magnitude}}{2}`;
}

function sqrtTwoHalfFactorLatex(magnitude: string) {
  const numeric = Number(magnitude);
  if (Number.isInteger(numeric) && numeric > 0) {
    if (numeric === 1) {
      return '\\frac{\\sqrt{2}}{2}';
    }
    if (numeric % 2 === 0) {
      const coefficient = numeric / 2;
      return coefficient === 1 ? '\\sqrt{2}' : `${coefficient}\\sqrt{2}`;
    }
    return `\\frac{${numeric}\\sqrt{2}}{2}`;
  }
  return magnitude === '1'
    ? '\\frac{\\sqrt{2}}{2}'
    : `\\frac{\\sqrt{2}${magnitude}}{2}`;
}

function exactPositiveScalarRootLatex(value: ExactScalar, degree: number) {
  const normalized = normalizeExactScalar(value);
  const numeric = normalized.numerator / normalized.denominator;
  const root = Math.pow(numeric, 1 / degree);
  if (Number.isInteger(root)) {
    return `${root}`;
  }
  return `\\sqrt[${degree}]{${exactScalarToLatex(normalized)}}`;
}

function imaginaryAxisBranchLatex(magnitude: string, sign: 1 | -1) {
  const groupedMagnitude = groupedFactorLatex(magnitude);
  const imaginary = groupedMagnitude === '1' ? 'i' : `${groupedMagnitude}i`;
  return sign === -1 ? `-${imaginary}` : imaginary;
}

function negativeQuarticConstantBranches(otherSide: MathJson) {
  const scalar = readExactScalarNode(otherSide);
  if (!scalar || scalar.numerator / scalar.denominator >= 0) {
    return null;
  }

  const magnitude = exactPositiveScalarRootLatex(negateExactScalar(scalar), 4);
  const component = sqrtTwoHalfFactorLatex(magnitude);
  return [
    `-${component}-${component}i`,
    `-${component}+${component}i`,
    `${component}-${component}i`,
    `${component}+${component}i`,
  ];
}

function signedTermLatex(magnitude: string, sign: 1 | -1, first = false) {
  return sign === -1 ? `-${magnitude}` : first ? magnitude : `+${magnitude}`;
}

function cubicRootOfUnityBranchLatex(rootSign: 1 | -1, magnitude: string, omegaImaginarySign: 1 | -1) {
  const realSign = rootSign === 1 ? -1 : 1;
  const imaginarySign = (rootSign * omegaImaginarySign) as 1 | -1;
  return `${signedTermLatex(halfFactorLatex(magnitude), realSign, true)}${signedTermLatex(
    sqrtThreeHalfFactorLatex(magnitude),
    imaginarySign,
  )}i`;
}

function complexPowerBranchLatex(rootLatex: string, degree: number, otherSide: MathJson) {
  const root = normalizeImaginaryLatex(rootLatex);
  if (degree === 2) {
    return [negateLatex(root), root];
  }

  const signedRoot = signedRootFactor(root);
  const groupedRoot = groupedFactorLatex(root);
  if (degree === 3) {
    return [
      root,
      cubicRootOfUnityBranchLatex(signedRoot.sign, signedRoot.magnitude, 1),
      cubicRootOfUnityBranchLatex(signedRoot.sign, signedRoot.magnitude, -1),
    ];
  }

  if (degree === 4) {
    const negativeConstantBranches = negativeQuarticConstantBranches(otherSide);
    if (negativeConstantBranches) {
      return negativeConstantBranches;
    }

    if (signedRoot.sign === -1) {
      return [
        root,
        signedRoot.magnitude,
        imaginaryAxisBranchLatex(signedRoot.magnitude, -1),
        imaginaryAxisBranchLatex(signedRoot.magnitude, 1),
      ];
    }
    return [
      root,
      negateLatex(root),
      imaginaryAxisBranchLatex(groupedRoot, 1),
      imaginaryAxisBranchLatex(groupedRoot, -1),
    ];
  }

  return [];
}

type ComplexPowerBranchReadback = {
  exactLatex: string[];
  approxLatex?: string[];
  approxText?: string[];
  preserveOrder?: boolean;
};

function exactComplexUnitSign(node: MathJson): 1 | -1 | null {
  if (node === 'ImaginaryUnit' || node === 'i') {
    return 1;
  }

  if (!isArrayNode(node) || node.length === 0) {
    return null;
  }

  if (node[0] === 'Complex' && node.length === 3) {
    return isZeroNode(node[1]) && isOneNode(node[2])
      ? 1
      : isZeroNode(node[1]) && isNegativeOneNode(node[2])
        ? -1
        : null;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const childSign = exactComplexUnitSign(node[1] as MathJson);
    return childSign ? (childSign * -1) as 1 | -1 : null;
  }

  if (node[0] === 'Multiply' && node.length === 3) {
    if (isNegativeOneNode(node[1])) {
      const childSign = exactComplexUnitSign(node[2] as MathJson);
      return childSign ? (childSign * -1) as 1 | -1 : null;
    }
    if (isNegativeOneNode(node[2])) {
      const childSign = exactComplexUnitSign(node[1] as MathJson);
      return childSign ? (childSign * -1) as 1 | -1 : null;
    }
  }

  return null;
}

function exactComplexUnitSignFromLatex(latex: string): 1 | -1 | null {
  const normalized = normalizeImaginaryLatex(latex).replace(/\s+/gu, '');
  if (normalized === 'i') {
    return 1;
  }
  if (normalized === '-i') {
    return -1;
  }
  return null;
}

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

function piAngleLatex(numerator: number, denominator: number) {
  if (numerator === 0) {
    return '0';
  }

  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  const sign = reducedNumerator < 0 ? '-' : '';
  const magnitude = Math.abs(reducedNumerator);

  if (reducedDenominator === 1) {
    return `${sign}${magnitude === 1 ? '\\pi' : `${magnitude}\\pi`}`;
  }

  const numeratorLatex = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
  return `${sign}\\frac{${numeratorLatex}}{${reducedDenominator}}`;
}

function cisLatex(numerator: number, denominator: number) {
  return `\\operatorname{cis}\\left(${piAngleLatex(numerator, denominator)}\\right)`;
}

function polarLatex(numerator: number, denominator: number) {
  const angle = piAngleLatex(numerator, denominator);
  return `\\cos\\left(${angle}\\right)+i\\sin\\left(${angle}\\right)`;
}

function normalizeAngleFraction(numerator: number, denominator: number) {
  const period = denominator * 2;
  let normalizedNumerator = numerator % period;
  if (normalizedNumerator < 0) {
    normalizedNumerator += period;
  }
  const divisor = gcd(normalizedNumerator, denominator);
  return {
    numerator: normalizedNumerator / divisor,
    denominator: denominator / divisor,
  };
}

function unitCirclePartLatex(kind: 'cos' | 'sin', numerator: number, denominator: number): string | null {
  const angle = normalizeAngleFraction(numerator, denominator);
  const key = `${angle.numerator}/${angle.denominator}`;
  const values: Record<string, { cos: string; sin: string }> = {
    '0/1': { cos: '1', sin: '0' },
    '1/6': { cos: '\\frac{\\sqrt{3}}{2}', sin: '\\frac{1}{2}' },
    '1/4': { cos: '\\frac{\\sqrt{2}}{2}', sin: '\\frac{\\sqrt{2}}{2}' },
    '1/3': { cos: '\\frac{1}{2}', sin: '\\frac{\\sqrt{3}}{2}' },
    '1/2': { cos: '0', sin: '1' },
    '2/3': { cos: '-\\frac{1}{2}', sin: '\\frac{\\sqrt{3}}{2}' },
    '3/4': { cos: '-\\frac{\\sqrt{2}}{2}', sin: '\\frac{\\sqrt{2}}{2}' },
    '5/6': { cos: '-\\frac{\\sqrt{3}}{2}', sin: '\\frac{1}{2}' },
    '1/1': { cos: '-1', sin: '0' },
    '7/6': { cos: '-\\frac{\\sqrt{3}}{2}', sin: '-\\frac{1}{2}' },
    '5/4': { cos: '-\\frac{\\sqrt{2}}{2}', sin: '-\\frac{\\sqrt{2}}{2}' },
    '4/3': { cos: '-\\frac{1}{2}', sin: '-\\frac{\\sqrt{3}}{2}' },
    '3/2': { cos: '0', sin: '-1' },
    '5/3': { cos: '\\frac{1}{2}', sin: '-\\frac{\\sqrt{3}}{2}' },
    '7/4': { cos: '\\frac{\\sqrt{2}}{2}', sin: '-\\frac{\\sqrt{2}}{2}' },
    '11/6': { cos: '\\frac{\\sqrt{3}}{2}', sin: '-\\frac{1}{2}' },
    '1/8': {
      cos: '\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
      sin: '\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
    },
    '3/8': {
      cos: '\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
      sin: '\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
    },
    '5/8': {
      cos: '-\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
      sin: '\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
    },
    '7/8': {
      cos: '-\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
      sin: '\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
    },
    '9/8': {
      cos: '-\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
      sin: '-\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
    },
    '11/8': {
      cos: '-\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
      sin: '-\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
    },
    '13/8': {
      cos: '\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
      sin: '-\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
    },
    '15/8': {
      cos: '\\frac{\\sqrt{2+\\sqrt{2}}}{2}',
      sin: '-\\frac{\\sqrt{2-\\sqrt{2}}}{2}',
    },
  };
  return values[key]?.[kind] ?? null;
}

function stripLeadingMinus(latex: string) {
  return latex.startsWith('-') ? latex.slice(1) : latex;
}

function rectangularUnitCircleLatex(numerator: number, denominator: number) {
  const real = unitCirclePartLatex('cos', numerator, denominator);
  const imaginary = unitCirclePartLatex('sin', numerator, denominator);
  if (real === null || imaginary === null) {
    return null;
  }
  if (imaginary === '0') {
    return real;
  }
  const imaginaryMagnitudeTerm = imaginary === '1' || imaginary === '-1'
    ? 'i'
    : `${stripLeadingMinus(imaginary)}i`;
  if (real === '0') {
    return imaginary.startsWith('-') ? `-${imaginaryMagnitudeTerm}` : imaginaryMagnitudeTerm;
  }
  return `${real}${imaginary.startsWith('-') ? '-' : '+'}${imaginaryMagnitudeTerm}`;
}

function signedLatex(latex: string, sign: 1 | -1) {
  return sign === -1 ? `-${latex}` : latex;
}

function latexProduct(left: string, right: string) {
  if (left === '1') {
    return right;
  }
  if (right === '1') {
    return left;
  }
  return `${left}${right}`;
}

function multiplyUnitComponentLatex(radiusLatex: string, componentLatex: string): string | null {
  if (componentLatex === '0') {
    return '0';
  }

  const sign: 1 | -1 = componentLatex.startsWith('-') ? -1 : 1;
  const component = stripLeadingMinus(componentLatex);
  if (radiusLatex === '1') {
    return signedLatex(component, sign);
  }

  const numericRadius = Number(radiusLatex);
  if (component === '1') {
    return signedLatex(radiusLatex, sign);
  }
  if (component === '\\frac{1}{2}') {
    const magnitude = Number.isInteger(numericRadius) && numericRadius > 0
      ? halfFactorLatex(radiusLatex)
      : `\\frac{${radiusLatex}}{2}`;
    return signedLatex(magnitude, sign);
  }
  if (component === '\\frac{\\sqrt{2}}{2}') {
    const magnitude = Number.isInteger(numericRadius) && numericRadius > 0
      ? sqrtTwoHalfFactorLatex(radiusLatex)
      : `\\frac{${latexProduct(radiusLatex, '\\sqrt{2}')}}{2}`;
    return signedLatex(magnitude, sign);
  }
  if (component === '\\frac{\\sqrt{3}}{2}') {
    const magnitude = Number.isInteger(numericRadius) && numericRadius > 0
      ? sqrtThreeHalfFactorLatex(radiusLatex)
      : `\\frac{${latexProduct(radiusLatex, '\\sqrt{3}')}}{2}`;
    return signedLatex(magnitude, sign);
  }

  return null;
}

function rectangularPolarRootLatex(radiusLatex: string, numerator: number, denominator: number) {
  const realUnit = unitCirclePartLatex('cos', numerator, denominator);
  const imaginaryUnit = unitCirclePartLatex('sin', numerator, denominator);
  if (realUnit === null || imaginaryUnit === null) {
    return null;
  }

  const real = multiplyUnitComponentLatex(radiusLatex, realUnit);
  const imaginary = multiplyUnitComponentLatex(radiusLatex, imaginaryUnit);
  if (real === null || imaginary === null) {
    return null;
  }
  if (imaginary === '0') {
    return real;
  }

  const imaginaryMagnitude = stripLeadingMinus(imaginary);
  const imaginaryTerm = imaginaryMagnitude === '1' ? 'i' : `${imaginaryMagnitude}i`;
  if (real === '0') {
    return imaginary.startsWith('-') ? `-${imaginaryTerm}` : imaginaryTerm;
  }
  return `${real}${imaginary.startsWith('-') ? '-' : '+'}${imaginaryTerm}`;
}

function radiusPrefixLatex(radiusLatex: string) {
  return radiusLatex === '1' ? '' : groupedFactorLatex(radiusLatex);
}

function polarRootLatex(radiusLatex: string, numerator: number, denominator: number) {
  const unitPolar = polarLatex(numerator, denominator);
  return radiusLatex === '1' ? unitPolar : `${groupedFactorLatex(radiusLatex)}\\left(${unitPolar}\\right)`;
}

function cisRootLatex(radiusLatex: string, numerator: number, denominator: number) {
  return `${radiusPrefixLatex(radiusLatex)}${cisLatex(numerator, denominator)}`;
}

function exactImaginaryUnitRootLatex(
  numerator: number,
  denominator: number,
  complexExactForm: ComplexExactForm,
) {
  if (complexExactForm === 'cis') {
    return cisLatex(numerator, denominator);
  }
  if (complexExactForm === 'polar') {
    return polarLatex(numerator, denominator);
  }
  return rectangularUnitCircleLatex(numerator, denominator);
}

function imaginaryUnitPowerBranchReadback(
  degree: number,
  sign: 1 | -1,
  complexExactForm: ComplexExactForm,
): ComplexPowerBranchReadback | null {
  const argumentNumerator = sign === 1 ? 1 : -1;
  const denominator = degree * 2;
  const numerators = Array.from({ length: degree }, (_, index) => argumentNumerator + 4 * index);
  const approxValues = numerators.map((numerator) =>
    complexFromPolar(1, (numerator * Math.PI) / denominator));
  const exactLatex = numerators.map((numerator) =>
    exactImaginaryUnitRootLatex(numerator, denominator, complexExactForm));
  if (exactLatex.some((branch) => branch === null)) {
    return null;
  }

  return {
    exactLatex: exactLatex as string[],
    approxLatex: approxValues.map((value) => complexToLatex(value)),
    approxText: approxValues.map((value) => complexToApproxText(value)),
    preserveOrder: true,
  };
}

function principalAngle(value: ReturnType<typeof complexFromPolar>) {
  return Math.atan2(value.im, value.re);
}

function orderPowerBranchEntries<T extends { approxValue: ReturnType<typeof complexFromPolar>; exactLatex: string }>(
  entries: T[],
) {
  return [...entries].sort((left, right) => {
    const leftReal = Math.abs(left.approxValue.im) < 1e-10;
    const rightReal = Math.abs(right.approxValue.im) < 1e-10;
    if (leftReal !== rightReal) {
      return leftReal ? -1 : 1;
    }
    if (leftReal && rightReal) {
      return left.approxValue.re - right.approxValue.re;
    }
    const angleDifference = principalAngle(left.approxValue) - principalAngle(right.approxValue);
    return Math.abs(angleDifference) > 1e-12
      ? angleDifference
      : left.exactLatex.localeCompare(right.exactLatex);
  });
}

function realScalarPowerBranchReadback(
  scalar: ExactScalar,
  degree: number,
  complexExactForm: ComplexExactForm,
): ComplexPowerBranchReadback | null {
  const normalized = normalizeExactScalar(scalar);
  if (normalized.numerator === 0) {
    return {
      exactLatex: ['0'],
      approxLatex: ['0'],
      approxText: ['0'],
      preserveOrder: true,
    };
  }

  const absoluteScalar = normalizeExactScalar({
    numerator: Math.abs(normalized.numerator),
    denominator: normalized.denominator,
  });
  const radiusLatex = exactPositiveScalarRootLatex(absoluteScalar, degree);
  const radiusValue = Math.pow(exactScalarToNumber(absoluteScalar), 1 / degree);
  const rootNumerators = Array.from({ length: degree }, (_, index) =>
    normalized.numerator > 0 ? 2 * index : 1 + 2 * index);
  const denominator = degree;
  const entries = rootNumerators.map((numerator) => {
    const approxValue = complexFromPolar(radiusValue, (numerator * Math.PI) / denominator);
    const exactLatex = complexExactForm === 'cis'
      ? cisRootLatex(radiusLatex, numerator, denominator)
      : complexExactForm === 'polar'
        ? polarRootLatex(radiusLatex, numerator, denominator)
        : rectangularPolarRootLatex(radiusLatex, numerator, denominator);
    return exactLatex
      ? { exactLatex, approxValue }
      : null;
  });
  if (entries.some((entry) => entry === null)) {
    return null;
  }

  const ordered = orderPowerBranchEntries(entries as Array<{ exactLatex: string; approxValue: ReturnType<typeof complexFromPolar> }>);
  return {
    exactLatex: ordered.map((entry) => entry.exactLatex),
    approxLatex: ordered.map((entry) => complexToLatex(entry.approxValue)),
    approxText: ordered.map((entry) => complexToApproxText(entry.approxValue)),
    preserveOrder: true,
  };
}

function complexPowerBranchReadback(
  rootLatex: string,
  degree: number,
  otherSide: MathJson,
  complexExactForm: ComplexExactForm,
): ComplexPowerBranchReadback | null {
  const unitSign = exactComplexUnitSign(otherSide) ?? exactComplexUnitSignFromLatex(latexForNode(otherSide));
  if (unitSign && degree >= 3) {
    return imaginaryUnitPowerBranchReadback(degree, unitSign, complexExactForm);
  }
  const realScalar = readExactScalarNode(otherSide);
  if (realScalar && degree >= 3) {
    return realScalarPowerBranchReadback(realScalar, degree, complexExactForm);
  }

  return {
    exactLatex: complexPowerBranchLatex(rootLatex, degree, otherSide),
  };
}

function stop(
  reason: EquationAlgebraicIsolationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): EquationAlgebraicIsolationStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}


export function solveEquationAlgebraicIsolation(
  equationLatex: string,
  target: string,
  options: EquationAlgebraicIsolationOptions = {},
): EquationAlgebraicIsolationResult {
  const parsed = parseIsolationEquation(equationLatex, target);
  const sourceLatex = parsed.sourceLatex;
  const parameterNames = parsed.parameterNames;

  if (!options.allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(sourceLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before algebraic selected-target isolation.',
      target,
      parameterNames,
    );
  }

  if (parsed.kind === 'parse-error') {
    return stop('parse-error', 'The equation could not be parsed for algebraic selected-target isolation.', target, parameterNames);
  }

  if (parsed.kind === 'non-equation') {
    return stop('non-equation', 'Enter an = equation before algebraic selected-target isolation.', target, parameterNames);
  }

  const json = parsed.json;
  if (!hasTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (options.answerDomain !== 'complex') {
    const factorable = solveParameterizedFactorablePolynomialEquation(sourceLatex, target, {
      allowGeneratedImplicitProducts: true,
    });
    if (factorable.kind === 'success') {
      return {
        kind: 'success',
        target,
        parameterNames,
        generatedEquationLatex: sourceLatex,
        exactLatex: factorable.exactLatex,
        branchReadback: factorable.branchReadback,
        exactSupplementLatex: factorable.exactSupplementLatex,
        detailSections: buildParameterizedDetailSections({
          target,
          parameterNames,
          familyTitle: 'Algebraic Isolation',
          familyLines: [
            'Delegated a bounded degree-3/4 factorable polynomial to the existing exact factor solver.',
            `Generated equation: ${sourceLatex}`,
          ],
          familyLineParts: [
            [],
            equationLabelLineParts('Generated equation', sourceLatex),
          ],
          extraSections: factorable.detailSections.filter((section) => section.title !== 'Solve Target'),
        }),
      };
    }
  }

  let expression = json[1] as MathJson;
  let otherSide = json[2] as MathJson;
  const leftHasTarget = hasTarget(expression, target);
  const rightHasTarget = hasTarget(otherSide, target);

  if (leftHasTarget && rightHasTarget) {
    const degree = polynomialDegreeInEquation(json, target);
    return degree && degree >= 3 && degree <= MAX_ALGEBRAIC_POWER
      ? stop(
        'formula-size-limit',
        'The guarded exact cubic/quartic formula exceeded the symbolic readback cap.',
        target,
        parameterNames,
      )
      : stop(
        'target-on-both-sides',
        'The selected target appears on both sides of the equation.',
        target,
        parameterNames,
      );
  }

  if (!leftHasTarget && rightHasTarget) {
    expression = json[2] as MathJson;
    otherSide = json[1] as MathJson;
  }

  const steps: PeelStep[] = [];
  const facts = [...(options.inheritedFacts ?? [])];

  for (let depth = 0; depth < 8; depth += 1) {
    const solved = solvePowerExpression({
      expression,
      otherSide,
      target,
      parameterNames,
      steps,
      facts,
      answerDomain: options.answerDomain,
      outputStyle: options.outputStyle,
      complexExactForm: options.complexExactForm,
      callbacks: {
        exactLatexForSolutions,
        branchReadbackForSolutions,
        complexPowerBranchReadback,
      },
    });
    if (solved) {
      return solved;
    }

    const peel = peelOnce(expression, otherSide, target, ALGEBRAIC_PEEL_POLICY);
    if (peel.kind === 'unsupported') {
      const degree = polynomialDegreeInEquation(json, target);
      if (degree && degree >= 3 && degree <= MAX_ALGEBRAIC_POWER) {
        return stop(
          'formula-size-limit',
          'The guarded exact cubic/quartic formula exceeded the symbolic readback cap.',
          target,
          parameterNames,
        );
      }
      return stop(peel.reason, peel.message, target, parameterNames);
    }

    steps.push(peel.step);
    facts.push(...peel.step.facts);
    expression = peel.step.expression;
    otherSide = peel.step.otherSide;
  }

  return stop(
    'unsupported-shell',
    'Algebraic selected-target isolation reached its shell depth cap.',
    target,
    parameterNames,
  );
}
