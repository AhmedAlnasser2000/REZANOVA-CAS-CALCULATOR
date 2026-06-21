import type { DisplayBranchReadback, DisplayDetailSection } from '../../../types/calculator';
import {
  buildExactScalarNode,
  exactScalarIsZero,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import {
  buildParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from './readback';
import {
  createArithmeticHelpers,
  hasTarget,
  isArrayNode,
  isOneNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';
import {
  addSymbolicPolynomials,
  symbolicPolynomialFromDegree,
  type SymbolicTargetPolynomial,
  zeroSymbolicPolynomial,
} from './symbolic-polynomial';

const SOURCE = 'equation-special-form-roots';
const EXACT_ZERO = { numerator: 0, denominator: 1 };
const EXACT_ONE = { numerator: 1, denominator: 1 };

const {
  addNodes,
  divideNodes,
  multiplyNodes,
  negateNode,
  squareNode,
  subtractNodes,
} = createArithmeticHelpers(simplifyNode);

type SymbolicCarrierBase = {
  base: MathJson;
  coefficient: ExactScalar;
  offset: MathJson;
  key: string;
};

type SymbolicCarrierCollectResult =
  | {
      kind: 'ok';
      carrier: SymbolicCarrierBase;
      carrierDegree: number;
      totalDegree: number;
      polynomial: SymbolicTargetPolynomial;
    }
  | { kind: 'degree-limit' }
  | { kind: 'unsupported-carrier' }
  | { kind: 'no-special-form' };

type DecomposedCarrierTerm = {
  coefficient: MathJson;
  exponent: number;
  carrier: SymbolicCarrierBase | null;
};

export type SymbolicCarrierSpecialFormSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type SymbolicCarrierSpecialFormResult =
  | SymbolicCarrierSpecialFormSuccess
  | { kind: 'unsupported'; reason: 'degree-limit' | 'unsupported-carrier-shape' | 'no-special-form' };

export type SymbolicCarrierSpecialFormInput = {
  zeroForm: MathJson;
  target: string;
  parameterNames: string[];
  maxTotalDegree: number;
};

function splitTerms(node: MathJson) {
  const simplified = simplifyNode(node);
  return isArrayNode(simplified) && simplified[0] === 'Add'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
}

function exactScalarKey(value: ExactScalar) {
  return `${value.numerator}/${value.denominator}`;
}

function carrierKey(coefficient: ExactScalar, offset: MathJson) {
  return `${exactScalarKey(coefficient)}|${JSON.stringify(simplifyNode(offset))}`;
}

function multiplyExactScalarsLocal(left: ExactScalar, right: ExactScalar): ExactScalar {
  return {
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  };
}

function readLinearTargetTerm(node: MathJson, target: string): ExactScalar | null {
  if (node === target) {
    return EXACT_ONE;
  }

  if (isArrayNode(node) && node[0] === 'Negate' && node[1] === target) {
    return { numerator: -1, denominator: 1 };
  }

  if (!isArrayNode(node) || node[0] !== 'Multiply') {
    return null;
  }

  let coefficient = EXACT_ONE;
  let targetCount = 0;
  for (const factor of node.slice(1) as MathJson[]) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      coefficient = multiplyExactScalarsLocal(coefficient, exact);
      continue;
    }
    if (factor === target) {
      targetCount += 1;
      continue;
    }
    return null;
  }

  return targetCount === 1 ? coefficient : null;
}

function readCarrierBase(node: MathJson, target: string): SymbolicCarrierBase | null {
  const simplified = simplifyNode(node);
  if (simplified === target) {
    return {
      base: simplified,
      coefficient: EXACT_ONE,
      offset: 0,
      key: carrierKey(EXACT_ONE, 0),
    };
  }

  let coefficient = EXACT_ZERO;
  const offsetTerms: MathJson[] = [];
  for (const term of splitTerms(simplified)) {
    if (!hasTarget(term, target)) {
      offsetTerms.push(term);
      continue;
    }

    const termCoefficient = readLinearTargetTerm(term, target);
    if (!termCoefficient) {
      return null;
    }
    coefficient = {
      numerator: coefficient.numerator * termCoefficient.denominator
        + termCoefficient.numerator * coefficient.denominator,
      denominator: coefficient.denominator * termCoefficient.denominator,
    };
  }

  if (exactScalarIsZero(coefficient)) {
    return null;
  }

  const offset = offsetTerms.length === 0 ? 0 : addNodes(...offsetTerms);
  return {
    base: simplified,
    coefficient,
    offset,
    key: carrierKey(coefficient, offset),
  };
}

function parsePowerFactor(node: MathJson): { base: MathJson; exponent: number } | null {
  if (
    isArrayNode(node)
    && node[0] === 'Power'
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
    && node[2] > 0
  ) {
    return { base: node[1] as MathJson, exponent: node[2] };
  }

  return null;
}

function negateCoefficient(node: MathJson) {
  return negateNode(node);
}

function decomposeTerm(term: MathJson, target: string): DecomposedCarrierTerm | null {
  const simplified = simplifyNode(term);
  if (isArrayNode(simplified) && simplified[0] === 'Negate') {
    const decomposed = decomposeTerm(simplified[1] as MathJson, target);
    return decomposed
      ? { ...decomposed, coefficient: negateCoefficient(decomposed.coefficient) }
      : null;
  }

  const rawFactors = isArrayNode(simplified) && simplified[0] === 'Multiply'
    ? simplified.slice(1) as MathJson[]
    : [simplified];
  const coefficientFactors: MathJson[] = [];
  let carrierPower: { base: MathJson; exponent: number } | null = null;

  for (const factor of rawFactors) {
    if (!hasTarget(factor, target)) {
      coefficientFactors.push(factor);
      continue;
    }

    const power = parsePowerFactor(factor);
    if (!power || carrierPower) {
      return null;
    }
    carrierPower = power;
  }

  const coefficient = coefficientFactors.length === 0 ? 1 : multiplyNodes(...coefficientFactors);
  if (!carrierPower) {
    return { coefficient, exponent: 0, carrier: null };
  }

  const carrier = readCarrierBase(carrierPower.base, target);
  return carrier
    ? { coefficient, exponent: carrierPower.exponent, carrier }
    : null;
}

function collectSymbolicCarrierQuadratic(
  node: MathJson,
  target: string,
  maxTotalDegree: number,
): SymbolicCarrierCollectResult {
  let polynomial = zeroSymbolicPolynomial();
  const positiveExponents = new Set<number>();
  let carrier: SymbolicCarrierBase | null = null;

  for (const term of splitTerms(node)) {
    const decomposed = decomposeTerm(term, target);
    if (!decomposed) {
      return { kind: 'unsupported-carrier' };
    }

    if (!decomposed.carrier) {
      polynomial = addSymbolicPolynomials(
        polynomial,
        symbolicPolynomialFromDegree(0, decomposed.coefficient),
      );
      continue;
    }

    if (carrier && decomposed.carrier.key !== carrier.key) {
      return { kind: 'unsupported-carrier' };
    }
    carrier = decomposed.carrier;
    positiveExponents.add(decomposed.exponent);
    if (decomposed.exponent > maxTotalDegree) {
      return { kind: 'degree-limit' };
    }
  }

  if (!carrier || positiveExponents.size < 2) {
    return { kind: 'no-special-form' };
  }

  const exponents = [...positiveExponents].sort((left, right) => left - right);
  const totalDegree = exponents[exponents.length - 1];
  if (totalDegree > maxTotalDegree) {
    return { kind: 'degree-limit' };
  }
  if (totalDegree < 6 || totalDegree % 2 !== 0 || exponents.some((degree) =>
    degree !== totalDegree / 2 && degree !== totalDegree)) {
    return { kind: 'no-special-form' };
  }

  const carrierDegree = totalDegree / 2;
  let normalized = zeroSymbolicPolynomial();
  for (const term of splitTerms(node)) {
    const decomposed = decomposeTerm(term, target);
    if (!decomposed) {
      return { kind: 'unsupported-carrier' };
    }
    const carrierPower = decomposed.exponent === 0 ? 0 : decomposed.exponent / carrierDegree;
    if (!Number.isInteger(carrierPower) || carrierPower < 0 || carrierPower > 2) {
      return { kind: 'no-special-form' };
    }
    normalized = addSymbolicPolynomials(
      normalized,
      symbolicPolynomialFromDegree(carrierPower, decomposed.coefficient),
    );
  }

  if (isZeroNode(normalized.terms[2])) {
    return { kind: 'no-special-form' };
  }

  return { kind: 'ok', carrier, carrierDegree, totalDegree, polynomial: normalized };
}

function nodeHasSymbol(node: MathJson) {
  return typeof node !== 'number';
}

function rootValueLatex(value: MathJson) {
  return latexForNode(value);
}

function nthRootOfLatex(valueLatex: string, degree: number) {
  return degree === 2
    ? `\\sqrt{${valueLatex}}`
    : `\\sqrt[${degree}]{${valueLatex}}`;
}

function subtractOffsetLatex(valueLatex: string, offset: MathJson) {
  const simplifiedOffset = simplifyNode(offset);
  if (isZeroNode(simplifiedOffset)) {
    return valueLatex;
  }

  const offsetLatex = latexForNode(simplifiedOffset);
  return offsetLatex.startsWith('-')
    ? `${valueLatex}+${offsetLatex.slice(1)}`
    : `${valueLatex}-${offsetLatex}`;
}

function exactScalarLatex(value: ExactScalar) {
  return latexForNode(buildExactScalarNode(value) as MathJson);
}

function exactScalarIsOne(value: ExactScalar) {
  return value.numerator === 1 && value.denominator === 1;
}

function solveAffineCarrierLatex(carrier: SymbolicCarrierBase, carrierValueLatex: string) {
  const numerator = subtractOffsetLatex(carrierValueLatex, carrier.offset);
  return exactScalarIsOne(carrier.coefficient)
    ? numerator
    : `\\frac{${numerator}}{${exactScalarLatex(carrier.coefficient)}}`;
}

function targetRootsForCarrierRoot(
  carrier: SymbolicCarrierBase,
  carrierRootLatex: string,
  carrierDegree: number,
) {
  const positive = nthRootOfLatex(carrierRootLatex, carrierDegree);
  const branches = carrierDegree % 2 === 0 ? [`-${positive}`, positive] : [positive];
  return branches.map((branch) => solveAffineCarrierLatex(carrier, branch));
}

function carrierQuadraticRoots(polynomial: SymbolicTargetPolynomial) {
  const [c, b, a] = polynomial.terms;
  const discriminant = subtractNodes(squareNode(b), multiplyNodes(4, a, c));
  const denominator = multiplyNodes(2, a);
  const negativeB = negateNode(b);
  const sqrtDiscriminant = simplifyNode(['Sqrt', discriminant] as MathJson);
  const roots = [
    divideNodes(subtractNodes(negativeB, sqrtDiscriminant), denominator),
    divideNodes(addNodes(negativeB, sqrtDiscriminant), denominator),
  ];
  return { a, discriminant, roots };
}

function supplementFacts(a: MathJson, discriminant: MathJson, carrierRoots: string[], carrierDegree: number) {
  const facts: string[] = [];
  if (!isOneNode(a) && nodeHasSymbol(a)) {
    facts.push(`${latexForNode(a)}\\ne0`);
  }
  if (nodeHasSymbol(discriminant)) {
    facts.push(`${latexForNode(discriminant)}\\ge0`);
  }
  if (carrierDegree % 2 === 0) {
    facts.push(...carrierRoots.map((root) => `${root}\\ge0`));
  }
  return normalizeParameterizedSupplementLatex(facts);
}

export function solveSymbolicCarrierCoefficientSpecialForm(
  input: SymbolicCarrierSpecialFormInput,
): SymbolicCarrierSpecialFormResult {
  const collected = collectSymbolicCarrierQuadratic(
    input.zeroForm,
    input.target,
    input.maxTotalDegree,
  );
  if (collected.kind === 'degree-limit') {
    return { kind: 'unsupported', reason: 'degree-limit' };
  }
  if (collected.kind === 'unsupported-carrier') {
    return { kind: 'unsupported', reason: 'unsupported-carrier-shape' };
  }
  if (collected.kind === 'no-special-form') {
    return { kind: 'unsupported', reason: 'no-special-form' };
  }

  const carrierRoots = carrierQuadraticRoots(collected.polynomial);
  const carrierRootLatex = carrierRoots.roots.map(rootValueLatex);
  const rootLatex = carrierRootLatex.flatMap((root) =>
    targetRootsForCarrierRoot(collected.carrier, root, collected.carrierDegree));
  const uniqueRootLatex = [...new Set(rootLatex)];
  const exactLatex = uniqueRootLatex.length === 1
    ? `${input.target}=${uniqueRootLatex[0]}`
    : `${input.target}\\in\\left\\{${uniqueRootLatex.join(',\\ ')}\\right\\}`;
  const branchReadback = finiteBranchReadbackMetadata({
    targetLatex: input.target,
    branchesLatex: uniqueRootLatex,
    source: SOURCE,
  });
  const carrierLatex = latexForNode(['Power', collected.carrier.base, collected.carrierDegree] as MathJson);
  const exactSupplementLatex = supplementFacts(
    carrierRoots.a,
    carrierRoots.discriminant,
    carrierRootLatex,
    collected.carrierDegree,
  );
  const detailSections = buildParameterizedDetailSections({
    target: input.target,
    parameterNames: input.parameterNames,
    familyTitle: 'Special-Form Root Solve',
    familyLines: [
      `Detected a symbolic-coefficient quadratic in the carrier u=${carrierLatex}.`,
      `Solved the carrier quadratic symbolically, then solved ${carrierLatex}=u for real ${input.target} branches.`,
      `Total selected-target degree: ${collected.totalDegree}.`,
    ],
  });

  return {
    kind: 'success',
    target: input.target,
    parameterNames: input.parameterNames,
    exactLatex,
    branchReadback,
    exactSupplementLatex,
    detailSections,
  };
}
