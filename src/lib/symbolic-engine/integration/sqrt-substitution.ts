import {
  buildExactPolynomialFromCoefficients,
  buildExactScalarNode,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactPolynomialToNode,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  parseExactPolynomial,
  type ExactPolynomial,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { substituteMathJsonSymbols } from '../primitives/substitution/substitution';
import {
  boxLatex,
  flattenMultiply,
  isNodeArray,
} from '../patterns';
import { numericNodeValue, sameNode } from './node-helpers';
import {
  solveExactPolynomialTimesExponential,
  solveExactPolynomialTimesTrig,
} from './exact-parts';
import { tryTextbookByPartsRule as tryTextbookIbpRule } from './by-parts-textbook';

const SQRT_SUBSTITUTION_POLYNOMIAL_DEGREE_CAP = 6;
const EXACT_TWO: ExactScalar = { numerator: 2, denominator: 1 };

type NativeSqrtSubstitutionResult = {
  exactLatex: string;
  antiderivativeNode: unknown;
};

type SupportedSqrtFunction =
  | { kind: 'sin' | 'cos' | 'arctan'; factor: unknown }
  | { kind: 'exp'; factor: unknown };

function productNodeFromFactors(factors: unknown[]) {
  if (factors.length === 0) {
    return 1;
  }
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function isSquareRootOfVariable(node: unknown, variable: string) {
  if (isNodeArray(node) && node[0] === 'Sqrt' && node.length === 2) {
    return sameNode(node[1], variable);
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = numericNodeValue(node[2]);
    return sameNode(node[1], variable) && exponent !== undefined && Math.abs(exponent - 0.5) < 1e-10;
  }

  return false;
}

function supportedSqrtFunction(factor: unknown, variable: string): SupportedSqrtFunction | undefined {
  if (isNodeArray(factor) && factor.length === 2 && isSquareRootOfVariable(factor[1], variable)) {
    if (factor[0] === 'Sin') {
      return { kind: 'sin', factor };
    }
    if (factor[0] === 'Cos') {
      return { kind: 'cos', factor };
    }
    if (factor[0] === 'Arctan') {
      return { kind: 'arctan', factor };
    }
  }

  if (
    isNodeArray(factor)
    && factor[0] === 'Power'
    && factor.length === 3
    && factor[1] === 'ExponentialE'
    && isSquareRootOfVariable(factor[2], variable)
  ) {
    return { kind: 'exp', factor };
  }

  return undefined;
}

function findSqrtSubstitutionProduct(node: unknown, variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];

  for (let index = 0; index < factors.length; index += 1) {
    const sqrtFunction = supportedSqrtFunction(factors[index], variable);
    if (!sqrtFunction) {
      continue;
    }

    const polynomial = parseExactPolynomial(
      productNodeFromFactors(factors.filter((_, factorIndex) => factorIndex !== index)),
      variable,
      SQRT_SUBSTITUTION_POLYNOMIAL_DEGREE_CAP,
    );
    if (!polynomial || exactPolynomialDegree(polynomial) > SQRT_SUBSTITUTION_POLYNOMIAL_DEGREE_CAP) {
      return undefined;
    }

    return { sqrtFunction, polynomial };
  }

  return undefined;
}

function transformedPolynomialForSqrtSubstitution(
  polynomial: ExactPolynomial,
  carrierVariable: string,
) {
  const originalDegree = exactPolynomialDegree(polynomial);
  const transformedDegree = originalDegree * 2 + 1;
  const coefficients: ExactScalar[] = Array.from(
    { length: transformedDegree + 1 },
    (): ExactScalar => ({ numerator: 0, denominator: 1 }),
  );

  for (let degree = 0; degree <= originalDegree; degree += 1) {
    const coefficient = getExactPolynomialCoefficient(polynomial, degree);
    coefficients[transformedDegree - (2 * degree + 1)] = multiplyExactScalars(coefficient, EXACT_TWO);
  }

  const transformed = buildExactPolynomialFromCoefficients(carrierVariable, coefficients);
  return exactPolynomialIsZero(transformed) ? undefined : transformed;
}

function scaleNodeByExactScalar(node: unknown, coefficient: ExactScalar) {
  if (coefficient.numerator === coefficient.denominator) {
    return node;
  }
  if (coefficient.numerator === -coefficient.denominator) {
    return ['Negate', node];
  }
  return ['Multiply', buildExactScalarNode(coefficient), node];
}

function directConstantSqrtPrimitive(
  polynomial: ExactPolynomial,
  sqrtFunction: SupportedSqrtFunction,
  variable: string,
): unknown | undefined {
  if (exactPolynomialDegree(polynomial) !== 0) {
    return undefined;
  }

  const coefficient = getExactPolynomialCoefficient(polynomial, 0);
  const root = () => ['Sqrt', variable];

  let primitive: unknown;
  if (sqrtFunction.kind === 'arctan') {
    primitive = [
      'Subtract',
      ['Multiply', ['Add', variable, 1], ['Arctan', root()]],
      root(),
    ];
  } else if (sqrtFunction.kind === 'sin') {
    primitive = [
      'Multiply',
      2,
      ['Subtract', ['Sin', root()], ['Multiply', root(), ['Cos', root()]]],
    ];
  } else if (sqrtFunction.kind === 'cos') {
    primitive = [
      'Multiply',
      2,
      ['Add', ['Multiply', root(), ['Sin', root()]], ['Cos', root()]],
    ];
  } else {
    primitive = [
      'Multiply',
      2,
      ['Power', 'ExponentialE', root()],
      ['Subtract', root(), 1],
    ];
  }

  return scaleNodeByExactScalar(primitive, coefficient);
}

function transformedFunction(kind: SupportedSqrtFunction['kind'], carrierVariable: string) {
  if (kind === 'sin') {
    return ['Sin', carrierVariable];
  }
  if (kind === 'cos') {
    return ['Cos', carrierVariable];
  }
  if (kind === 'arctan') {
    return ['Arctan', carrierVariable];
  }
  return ['Power', 'ExponentialE', carrierVariable];
}

function solveTransformedSqrtSubstitution(
  transformedPolynomial: ExactPolynomial,
  sqrtFunction: SupportedSqrtFunction,
  carrierVariable: string,
) {
  const slope = { numerator: 1, denominator: 1 };
  const carrierNode = carrierVariable;

  if (sqrtFunction.kind === 'sin' || sqrtFunction.kind === 'cos') {
    return solveExactPolynomialTimesTrig(
      transformedPolynomial,
      slope,
      carrierVariable,
      carrierNode,
      sqrtFunction.kind,
    );
  }

  if (sqrtFunction.kind === 'exp') {
    return solveExactPolynomialTimesExponential(
      transformedPolynomial,
      slope,
      carrierVariable,
      carrierNode,
    );
  }

  const transformedIntegrand = [
    'Multiply',
    exactPolynomialToNode(transformedPolynomial),
    transformedFunction(sqrtFunction.kind, carrierVariable),
  ];
  const solved = tryTextbookIbpRule(transformedIntegrand, carrierVariable);
  return solved?.antiderivativeNode === undefined ? undefined : solved;
}

export function trySquareRootSubstitutionRule(
  node: unknown,
  variable: string,
): NativeSqrtSubstitutionResult | undefined {
  const product = findSqrtSubstitutionProduct(node, variable);
  if (!product) {
    return undefined;
  }

  const directPrimitive = directConstantSqrtPrimitive(
    product.polynomial,
    product.sqrtFunction,
    variable,
  );
  if (directPrimitive) {
    return {
      exactLatex: boxLatex(directPrimitive),
      antiderivativeNode: directPrimitive,
    };
  }

  const carrierVariable = variable === 'u' ? 'z' : 'u';
  const transformedPolynomial = transformedPolynomialForSqrtSubstitution(
    product.polynomial,
    carrierVariable,
  );
  if (!transformedPolynomial) {
    return undefined;
  }

  const solved = solveTransformedSqrtSubstitution(
    transformedPolynomial,
    product.sqrtFunction,
    carrierVariable,
  );
  if (!solved?.antiderivativeNode) {
    return undefined;
  }

  const substituted = substituteMathJsonSymbols(
    solved.antiderivativeNode,
    { [carrierVariable]: ['Sqrt', variable] },
    { maxNodeCount: 2000 },
  );
  if (substituted.kind !== 'ok') {
    return undefined;
  }

  return {
    exactLatex: boxLatex(substituted.node),
    antiderivativeNode: substituted.node,
  };
}
