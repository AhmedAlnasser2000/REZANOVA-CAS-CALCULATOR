import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { readExactScalarNode, type ExactScalar } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import {
  addMathJsonNodes,
  simplifyMathJsonNodeOrOriginal,
  subtractMathJsonNodes,
} from '../../primitives/simplification/simplification';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
  wrapGroupedLatex,
} from '../../patterns';
import { sameNode } from '../node-helpers';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import {
  addRischNormanCoefficients,
  parseRischNormanCoefficient,
  subtractRischNormanCoefficients,
  type RischNormanCoefficient,
  type RischNormanCoefficientFact,
  type RischNormanCoefficientStopReason,
} from './coefficient-field';

export type RischNormanSymbolicTrigProductStopReason =
  | 'coefficient-stop'
  | 'degenerate-symbolic-denominator'
  | 'extra-factor'
  | 'missing-trig-factor'
  | 'non-affine-argument'
  | 'unsupported-trig-factor';

export type RischNormanSymbolicTrigProductResult =
  | {
    kind: 'success';
    exactLatex: string;
    verification: AntiderivativeBackcheck;
    exactSupplementLatex: string[];
  }
  | {
    kind: 'stop';
    reason: RischNormanSymbolicTrigProductStopReason;
      coefficientReason?: RischNormanCoefficientStopReason;
  };

type RischNormanSymbolicTrigProductStop = Extract<
  RischNormanSymbolicTrigProductResult,
  { kind: 'stop' }
>;

type NonzeroSupplementEntry = ExactSupplementEntry & {
  kind: 'exclusion';
  expressionLatex: string;
  relation: '\\ne0';
};

type TrigFactor = {
  head: 'Sin' | 'Cos';
  argument: unknown;
  argumentLatex: string;
  slope: RischNormanCoefficient;
  slopeSource: unknown;
  facts: RischNormanCoefficientFact[];
};

type ParsedProduct = {
  scalar: ExactScalar;
  left: TrigFactor;
  right: TrigFactor;
};

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

function proof(): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason: 'verified by internal Risch-Norman symbolic trig product-to-sum rule proof',
  };
}

function coefficientStop(reason: RischNormanCoefficientStopReason): RischNormanSymbolicTrigProductStop {
  return {
    kind: 'stop',
    reason: 'coefficient-stop',
    coefficientReason: reason,
  };
}

function factEntry(expressionLatex: string): NonzeroSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function entriesForCoefficientFacts(facts: RischNormanCoefficientFact[]) {
  return facts.map((fact) => factEntry(fact.expressionLatex));
}

function supplements(entries: ExactSupplementEntry[]) {
  return mergeExactSupplementLatex({ entries, source: 'candidate-validation' });
}

function multiplyExactScalars(left: ExactScalar, right: ExactScalar): ExactScalar {
  return {
    numerator: left.numerator * right.numerator,
    denominator: left.denominator * right.denominator,
  };
}

function scalarIsOne(scalar: ExactScalar) {
  return scalar.numerator === scalar.denominator;
}

function scalarLatex(scalar: ExactScalar) {
  if (scalar.denominator === 1) {
    return String(scalar.numerator);
  }
  return `\\frac{${scalar.numerator}}{${scalar.denominator}}`;
}

function scalarPrefix(scalar: ExactScalar) {
  if (scalar.numerator === 0) {
    return '0';
  }
  if (scalarIsOne(scalar)) {
    return '';
  }
  if (scalar.numerator === -scalar.denominator) {
    return '-';
  }
  return `${wrapGroupedLatex(scalarLatex(scalar))}`;
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || '0';
}

function denominatorLatex(scalar: number, slopeLatex: string) {
  const parts = [String(scalar), slopeLatex].filter((part) => part !== '1');
  return parts.map((part) => wrapGroupedLatex(part)).join('');
}

function divideLatex(numeratorLatex: string, denominator: string, sign: 1 | -1 = 1) {
  if (denominator === '1') {
    return sign === 1 ? numeratorLatex : `-${wrapGroupedLatex(numeratorLatex)}`;
  }
  return sign === 1
    ? `\\frac{${numeratorLatex}}{${denominator}}`
    : `-\\frac{${numeratorLatex}}{${denominator}}`;
}

function scaledDivideLatex(
  numeratorLatex: string,
  denominator: string,
  scalar: ExactScalar,
  sign: 1 | -1 = 1,
) {
  const scalarSign = scalar.numerator < 0 ? -1 : 1;
  const unsignedScalar = {
    numerator: Math.abs(scalar.numerator),
    denominator: scalar.denominator,
  };
  const numeratorPrefix = scalarPrefix(unsignedScalar);
  return divideLatex(
    `${numeratorPrefix}${numeratorLatex}`,
    denominator,
    (sign * scalarSign) as 1 | -1,
  );
}

function exactZero(node: unknown) {
  const scalar = readExactScalarNode(node);
  return Boolean(scalar && scalar.numerator === 0);
}

function validateCoefficient(node: unknown, variable: string) {
  const coefficient = parseRischNormanCoefficient(node, variable);
  return coefficient.kind === 'success'
    ? coefficient.coefficient
    : coefficient;
}

function parseTrigFactor(node: unknown, variable: string): TrigFactor | RischNormanSymbolicTrigProductStop {
  if (!isNodeArray(node) || node.length !== 2 || (node[0] !== 'Sin' && node[0] !== 'Cos')) {
    return { kind: 'stop', reason: 'unsupported-trig-factor' };
  }

  const affine = parseSymbolicAffine(node[1], variable);
  if (!affine) {
    return { kind: 'stop', reason: 'non-affine-argument' };
  }

  const slope = validateCoefficient(affine.slope, variable);
  if ('kind' in slope) {
    return coefficientStop(slope.reason);
  }
  if (affine.offset !== undefined) {
    const offset = validateCoefficient(affine.offset, variable);
    if ('kind' in offset) {
      return coefficientStop(offset.reason);
    }
  }

  return {
    head: node[0],
    argument: node[1],
    argumentLatex: affine.latex,
    slope,
    slopeSource: affine.slope,
    facts: slope.facts,
  };
}

function splitProduct(node: unknown, variable: string): ParsedProduct | RischNormanSymbolicTrigProductResult {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const trigFactors: TrigFactor[] = [];
  let scalar = EXACT_ONE;

  for (const factor of factors) {
    const parsed = parseTrigFactor(factor, variable);
    if (!('kind' in parsed)) {
      trigFactors.push(parsed);
      continue;
    }

    const exactScalar = readExactScalarNode(factor);
    if (exactScalar) {
      scalar = multiplyExactScalars(scalar, exactScalar);
      continue;
    }

    if (dependsOnVariable(factor, variable)) {
      return parsed.reason === 'unsupported-trig-factor'
        ? { kind: 'stop', reason: 'extra-factor' }
        : parsed;
    }
    return { kind: 'stop', reason: 'extra-factor' };
  }

  if (trigFactors.length !== 2) {
    return {
      kind: 'stop',
      reason: trigFactors.length === 0 ? 'missing-trig-factor' : 'extra-factor',
    };
  }

  return {
    scalar,
    left: trigFactors[0],
    right: trigFactors[1],
  };
}

function addSlopes(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  const sum = addRischNormanCoefficients(left, right, variable);
  return sum.kind === 'success' ? sum.coefficient : sum;
}

function subtractSlopes(
  left: RischNormanCoefficient,
  right: RischNormanCoefficient,
  variable: string,
) {
  const difference = subtractRischNormanCoefficients(left, right, variable);
  return difference.kind === 'success' ? difference.coefficient : difference;
}

function argumentLatex(left: unknown, right: unknown, sign: 1 | -1) {
  const node = sign === 1
    ? addMathJsonNodes(left, right)
    : subtractMathJsonNodes(left, right);
  return boxLatex(simplifyMathJsonNodeOrOriginal(node));
}

function generatedTermLatex(input: {
  coefficientSign: 1 | -1;
  head: 'Sin' | 'Cos';
  argumentLatex: string;
  slope: RischNormanCoefficient;
  scalar: ExactScalar;
}) {
  const denominator = denominatorLatex(2, input.slope.latex);
  const primitiveSign = input.head === 'Sin' ? -input.coefficientSign : input.coefficientSign;
  const primitive = input.head === 'Sin'
    ? `\\cos\\left(${input.argumentLatex}\\right)`
    : `\\sin\\left(${input.argumentLatex}\\right)`;
  return scaledDivideLatex(primitive, denominator, input.scalar, primitiveSign as 1 | -1);
}

function sameArgumentProductLatex(product: ParsedProduct, variable: string) {
  const angle = product.left.argumentLatex;
  const slope = product.left.slope.latex;
  const scalar = product.scalar;

  if (product.left.head !== product.right.head) {
    return scaledDivideLatex(
      `\\left(\\sin\\left(${angle}\\right)\\right)^{2}`,
      denominatorLatex(2, slope),
      scalar,
    );
  }

  const linear = scaledDivideLatex(variable, '2', scalar);
  const doubleAngle = `2${wrapGroupedLatex(angle)}`;
  const correctionSign = product.left.head === 'Sin' ? -1 : 1;
  const correction = scaledDivideLatex(
    `\\sin\\left(${doubleAngle}\\right)`,
    denominatorLatex(4, slope),
    scalar,
    correctionSign,
  );
  return joinAdditiveLatex([linear, correction]);
}

function factsFor(product: ParsedProduct, denominators: RischNormanCoefficient[]) {
  const entries: NonzeroSupplementEntry[] = [
    ...entriesForCoefficientFacts(product.left.facts),
    ...entriesForCoefficientFacts(product.right.facts),
    factEntry(product.left.slope.latex),
    ...denominators.map((denominator) => factEntry(denominator.latex)),
  ];
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.expressionLatex}:${entry.relation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function success(
  exactLatex: string,
  product: ParsedProduct,
  denominators: RischNormanCoefficient[],
): RischNormanSymbolicTrigProductResult {
  return {
    kind: 'success',
    exactLatex,
    verification: proof(),
    exactSupplementLatex: supplements(factsFor(product, denominators)),
  };
}

export function tryRischNormanSymbolicTrigProductToSumRule(
  node: unknown,
  variable: string,
): RischNormanSymbolicTrigProductResult | undefined {
  const product = splitProduct(node, variable);
  if ('kind' in product) {
    return undefined;
  }

  if (sameNode(product.left.argument, product.right.argument)) {
    if (exactZero(product.left.slope.node)) {
      return undefined;
    }
    return success(
      sameArgumentProductLatex(product, variable),
      product,
      [product.left.slope],
    );
  }

  if (sameNode(product.left.slopeSource, product.right.slopeSource)) {
    return undefined;
  }

  const sumSlope = addSlopes(product.left.slope, product.right.slope, variable);
  if ('kind' in sumSlope) {
    return undefined;
  }
  const differenceSlope = subtractSlopes(product.left.slope, product.right.slope, variable);
  if ('kind' in differenceSlope || exactZero(sumSlope.node) || exactZero(differenceSlope.node)) {
    return undefined;
  }

  const sumArgument = argumentLatex(product.left.argument, product.right.argument, 1);
  const differenceArgument = argumentLatex(product.left.argument, product.right.argument, -1);
  const mixedDifferenceSign = product.left.head === 'Sin' ? 1 : -1;
  const terms = product.left.head !== product.right.head
    ? [
      generatedTermLatex({
        coefficientSign: 1,
        head: 'Sin',
        argumentLatex: sumArgument,
        slope: sumSlope,
        scalar: product.scalar,
      }),
      generatedTermLatex({
        coefficientSign: mixedDifferenceSign,
        head: 'Sin',
        argumentLatex: differenceArgument,
        slope: differenceSlope,
        scalar: product.scalar,
      }),
    ]
    : [
      generatedTermLatex({
        coefficientSign: 1,
        head: 'Cos',
        argumentLatex: differenceArgument,
        slope: differenceSlope,
        scalar: product.scalar,
      }),
      generatedTermLatex({
        coefficientSign: product.left.head === 'Sin' ? -1 : 1,
        head: 'Cos',
        argumentLatex: sumArgument,
        slope: sumSlope,
        scalar: product.scalar,
      }),
    ];

  return success(
    joinAdditiveLatex(terms),
    product,
    [sumSlope, differenceSlope],
  );
}
