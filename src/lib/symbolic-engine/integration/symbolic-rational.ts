import type { ExactSupplementEntry } from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { readExactScalarNode } from '../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../calculus/engine/verification';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
  multiplyLatex,
  wrapGroupedLatex,
} from '../patterns';
import { parseSymbolicAffine } from './symbolic-coefficients';
import { normalizeGeneratedIntegrationLatex } from './readback-hygiene';

type SymbolicRuleResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex: string[];
};

export type SymbolicQuadratic = {
  quadraticLatex: string;
  linearLatex: string;
  constantLatex: string;
  latex: string;
};

type SignedNode = {
  node: unknown;
  sign: 1 | -1;
};

function proof(reason: string): AntiderivativeBackcheck {
  return { status: 'verified-exact', reason };
}

function nonzero(expressionLatex: string): ExactSupplementEntry {
  return {
    kind: 'exclusion',
    expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function success(
  exactLatex: string,
  reason: string,
  entries: ExactSupplementEntry[],
): SymbolicRuleResult {
  return {
    exactLatex,
    verification: proof(reason),
    exactSupplementLatex: mergeExactSupplementLatex({ entries, source: 'candidate-validation' }),
  };
}

function exactInteger(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar && scalar.denominator === 1 ? scalar.numerator : undefined;
}

function targetFree(node: unknown, variable: string) {
  return !dependsOnVariable(node, variable);
}

function negateNode(node: unknown): unknown {
  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : negateNode(node);
}

function multiplyNodes(factors: unknown[]): unknown {
  const meaningful = factors.filter((factor) => {
    const scalar = readExactScalarNode(factor);
    return !scalar || scalar.numerator !== 1 || scalar.denominator !== 1;
  });
  if (meaningful.length === 0) {
    return 1;
  }

  return meaningful.length === 1 ? meaningful[0] : ['Multiply', ...meaningful];
}

function addNodes(nodes: unknown[]): unknown {
  if (nodes.length === 0) {
    return 0;
  }
  return nodes.length === 1 ? nodes[0] : ['Add', ...nodes];
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedNode[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function parseVariablePower(node: unknown, variable: string) {
  if (node === variable) {
    return 1;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === variable
  ) {
    return exactInteger(node[2]) ?? (targetFree(node[2], variable) ? node[2] : undefined);
  }

  return undefined;
}

function divideBySymbolic(
  numeratorLatex: string,
  denominatorLatex: string,
  sign: 1 | -1 = 1,
) {
  const signedNumerator = sign === 1 ? numeratorLatex : `-${wrapGroupedLatex(numeratorLatex)}`;
  if (denominatorLatex === '1') {
    return signedNumerator;
  }

  return sign === 1
    ? `\\frac{${numeratorLatex}}{${denominatorLatex}}`
    : `-\\frac{${numeratorLatex}}{${denominatorLatex}}`;
}

function joinAdditiveLatex(parts: string[]) {
  return parts
    .filter((part) => part !== '0')
    .reduce((joined, part, index) => {
      if (index === 0) {
        return part;
      }
      return part.startsWith('-') ? `${joined}${part}` : `${joined}+${part}`;
    }, '') || undefined;
}

function compactLatexKey(latex: string) {
  return latex
    .replace(/\s+/g, '')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '');
}

function sameLatex(left: string, right: string) {
  return compactLatexKey(left) === compactLatexKey(right);
}

function multiplySymbolicLatex(factors: string[]) {
  const meaningful = factors.filter((factor) => factor !== '1');
  if (meaningful.some((factor) => factor === '0')) {
    return '0';
  }
  return meaningful.reduce((product, factor) => multiplyLatex(product, factor), '1');
}

function subtractSymbolicLatex(left: string, right: string) {
  if (right === '0') {
    return left;
  }
  if (left === '0') {
    return `-${wrapGroupedLatex(right)}`;
  }
  return `${left}-${wrapGroupedLatex(right)}`;
}

function symbolicQuadraticPositiveDiscriminant(a: string, b: string, c: string) {
  return `4${wrapGroupedLatex(a)}${wrapGroupedLatex(c)}-${wrapGroupedLatex(b)}^{2}`;
}

function symbolicQuadraticNegativeDiscriminant(a: string, b: string, c: string) {
  return `${wrapGroupedLatex(b)}^{2}-4${wrapGroupedLatex(a)}${wrapGroupedLatex(c)}`;
}

function symbolicQuadraticAffineCenter(a: string, b: string, variable: string) {
  const leading = `2${wrapGroupedLatex(a)}${variable}`;
  return b === '0' ? leading : `${leading}+${b}`;
}

function casewiseLatex(rows: Array<{ valueLatex: string; conditionLatex: string }>) {
  return `\\begin{cases}${rows
    .map((row) => `${row.valueLatex},&${row.conditionLatex}`)
    .join('\\\\')}\\end{cases}`;
}

function reciprocalQuadraticPositiveBranch(input: {
  centerLatex: string;
  positiveDiscriminantLatex: string;
}) {
  return `\\frac{2}{\\sqrt{${input.positiveDiscriminantLatex}}}\\cdot \\arctan\\left(\\frac{${input.centerLatex}}{\\sqrt{${input.positiveDiscriminantLatex}}}\\right)`;
}

function reciprocalQuadraticZeroBranch(centerLatex: string) {
  return `-\\frac{2}{${centerLatex}}`;
}

function reciprocalQuadraticNegativeBranch(input: {
  centerLatex: string;
  negativeDiscriminantLatex: string;
}) {
  return `\\frac{1}{\\sqrt{${input.negativeDiscriminantLatex}}}\\cdot \\ln\\left|\\frac{${input.centerLatex}-\\sqrt{${input.negativeDiscriminantLatex}}}{${input.centerLatex}+\\sqrt{${input.negativeDiscriminantLatex}}}\\right|`;
}

function parseSymbolicLinearFactorPower(node: unknown, variable: string) {
  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const power = exactInteger(node[2]);
    const affine = parseSymbolicAffine(node[1], variable);
    return power && affine ? { affine, power } : undefined;
  }

  const affine = parseSymbolicAffine(node, variable);
  return affine ? { affine, power: 1 } : undefined;
}

export function trySymbolicTwoLinearPartialFractionRule(
  node: unknown,
  variable: string,
): SymbolicRuleResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = parseSymbolicAffine(node[1], variable);
  if (!numerator || !isNodeArray(node[2]) || node[2][0] !== 'Multiply') {
    return undefined;
  }

  const denominatorFactors = flattenMultiply(node[2]);
  if (denominatorFactors.length !== 2) {
    return undefined;
  }

  const parsedFirst = parseSymbolicLinearFactorPower(denominatorFactors[0], variable);
  const parsedSecond = parseSymbolicLinearFactorPower(denominatorFactors[1], variable);
  const first = parsedFirst?.power === 2 ? parsedFirst : parsedSecond?.power === 2 ? parsedSecond : undefined;
  const second = parsedFirst?.power === 1 ? parsedFirst : parsedSecond?.power === 1 ? parsedSecond : undefined;
  if (!first || !second) {
    return undefined;
  }

  const a = first.affine.slopeLatex;
  const b = first.affine.offset ? boxLatex(first.affine.offset) : '0';
  const c = second.affine.slopeLatex;
  const d = second.affine.offset ? boxLatex(second.affine.offset) : '0';
  const A = numerator.slopeLatex;
  const B = numerator.offset ? boxLatex(numerator.offset) : '0';
  const delta = `${wrapGroupedLatex(a)}${wrapGroupedLatex(d)}-${wrapGroupedLatex(b)}${wrapGroupedLatex(c)}`;
  const k = `\\frac{${wrapGroupedLatex(a)}\\left(${wrapGroupedLatex(d)}${wrapGroupedLatex(A)}-${wrapGroupedLatex(B)}${wrapGroupedLatex(c)}\\right)}{${wrapGroupedLatex(delta)}^{2}}`;
  const l = `\\frac{${wrapGroupedLatex(a)}${wrapGroupedLatex(B)}-${wrapGroupedLatex(b)}${wrapGroupedLatex(A)}}{${delta}}`;
  const m = `\\frac{${wrapGroupedLatex(c)}\\left(${wrapGroupedLatex(B)}${wrapGroupedLatex(c)}-${wrapGroupedLatex(d)}${wrapGroupedLatex(A)}\\right)}{${wrapGroupedLatex(delta)}^{2}}`;
  const pieces = [
    divideBySymbolic(`${k}\\ln\\left|${wrapGroupedLatex(first.affine.latex)}\\right|`, a),
    divideBySymbolic(l, `${wrapGroupedLatex(a)}${wrapGroupedLatex(first.affine.latex)}`, -1),
    divideBySymbolic(`${m}\\ln\\left|${wrapGroupedLatex(second.affine.latex)}\\right|`, c),
  ];
  return success(
    joinAdditiveLatex(pieces) ?? '',
    'verified by symbolic repeated-linear partial-fraction identity proof',
    [nonzero(a), nonzero(c), nonzero(delta)],
  );
}

export function parseSymbolicQuadratic(node: unknown, variable: string): SymbolicQuadratic | undefined {
  const degreeParts = new Map<number, unknown[]>();
  for (const term of signedAddTerms(node)) {
    const signed = signedNode(term.node, term.sign);
    if (targetFree(term.node, variable)) {
      degreeParts.set(0, [...(degreeParts.get(0) ?? []), signed]);
      continue;
    }

    const factors = isNodeArray(term.node) && term.node[0] === 'Multiply'
      ? flattenMultiply(term.node)
      : [term.node];
    const variablePowerFactor = factors.find((factor) => {
      const power = parseVariablePower(factor, variable);
      return power === 1 || power === 2;
    });
    const degree = variablePowerFactor ? parseVariablePower(variablePowerFactor, variable) : undefined;
    if (degree !== 1 && degree !== 2) {
      return undefined;
    }
    const coefficientFactors = factors.filter((factor) => factor !== variablePowerFactor);
    if (!coefficientFactors.every((factor) => targetFree(factor, variable))) {
      return undefined;
    }
    degreeParts.set(degree, [
      ...(degreeParts.get(degree) ?? []),
      signedNode(multiplyNodes(coefficientFactors), term.sign),
    ]);
  }

  const quadratic = addNodes(degreeParts.get(2) ?? []);
  const linear = addNodes(degreeParts.get(1) ?? []);
  const constant = addNodes(degreeParts.get(0) ?? []);
  if (boxLatex(quadratic) === '0') {
    return undefined;
  }

  return {
    quadraticLatex: boxLatex(quadratic),
    linearLatex: boxLatex(linear),
    constantLatex: boxLatex(constant),
    latex: boxLatex(node),
  };
}

export function trySymbolicQuadraticReciprocalRule(
  node: unknown,
  variable: string,
): SymbolicRuleResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = readExactScalarNode(node[1]);
  const quadratic = numerator?.numerator === 1 && numerator.denominator === 1
    ? parseSymbolicQuadratic(node[2], variable)
    : undefined;
  if (!quadratic) {
    return undefined;
  }

  const a = quadratic.quadraticLatex;
  const b = quadratic.linearLatex;
  const c = quadratic.constantLatex;
  const positiveDiscriminant = symbolicQuadraticPositiveDiscriminant(a, b, c);
  const negativeDiscriminant = symbolicQuadraticNegativeDiscriminant(a, b, c);
  const center = symbolicQuadraticAffineCenter(a, b, variable);
  const exactLatex = casewiseLatex([
    {
      valueLatex: reciprocalQuadraticPositiveBranch({
        centerLatex: center,
        positiveDiscriminantLatex: positiveDiscriminant,
      }),
      conditionLatex: `${positiveDiscriminant}>0`,
    },
    {
      valueLatex: reciprocalQuadraticZeroBranch(center),
      conditionLatex: `${positiveDiscriminant}=0`,
    },
    {
      valueLatex: reciprocalQuadraticNegativeBranch({
        centerLatex: center,
        negativeDiscriminantLatex: negativeDiscriminant,
      }),
      conditionLatex: `${positiveDiscriminant}<0`,
    },
  ]);

  return success(
    normalizeGeneratedIntegrationLatex(exactLatex, variable),
    'verified by symbolic quadratic reciprocal casewise rule proof',
    [nonzero(quadratic.quadraticLatex)],
  );
}

export function trySymbolicQuadraticLinearNumeratorRule(
  node: unknown,
  variable: string,
): SymbolicRuleResult | undefined {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const numerator = parseSymbolicAffine(node[1], variable);
  const quadratic = numerator ? parseSymbolicQuadratic(node[2], variable) : undefined;
  if (!numerator || !quadratic) {
    return undefined;
  }

  const a = quadratic.quadraticLatex;
  const b = quadratic.linearLatex;
  const c = quadratic.constantLatex;
  const A = numerator.slopeLatex;
  const B = numerator.offset ? boxLatex(numerator.offset) : '0';
  const denominatorDerivativeSlope = multiplySymbolicLatex(['2', a]);

  if (sameLatex(A, denominatorDerivativeSlope) && sameLatex(B, b)) {
    return success(
      normalizeGeneratedIntegrationLatex(`\\ln\\left|${wrapGroupedLatex(quadratic.latex)}\\right|`, variable),
      'verified by symbolic quadratic derivative-numerator rule proof',
      [nonzero(a)],
    );
  }

  const discriminantPositive = symbolicQuadraticPositiveDiscriminant(a, b, c);
  const discriminantNegative = symbolicQuadraticNegativeDiscriminant(a, b, c);
  const center = symbolicQuadraticAffineCenter(a, b, variable);
  const logCoefficientDenominator = `2${wrapGroupedLatex(a)}`;
  const logTerm = `\\frac{${A}}{${logCoefficientDenominator}}\\cdot \\ln\\left|${wrapGroupedLatex(quadratic.latex)}\\right|`;
  const residualNumerator = subtractSymbolicLatex(
    multiplySymbolicLatex(['2', a, B]),
    multiplySymbolicLatex([A, b]),
  );
  const positiveResidualTerm = residualNumerator === '0'
    ? undefined
    : `\\frac{${residualNumerator}}{${wrapGroupedLatex(a)}\\sqrt{${discriminantPositive}}}\\cdot \\arctan\\left(\\frac{${center}}{\\sqrt{${discriminantPositive}}}\\right)`;
  const zeroResidualTerm = residualNumerator === '0'
    ? undefined
    : `-\\frac{${residualNumerator}}{${wrapGroupedLatex(a)}${wrapGroupedLatex(center)}}`;
  const negativeResidualTerm = residualNumerator === '0'
    ? undefined
    : `\\frac{${residualNumerator}}{2${wrapGroupedLatex(a)}\\sqrt{${discriminantNegative}}}\\cdot \\ln\\left|\\frac{${center}-\\sqrt{${discriminantNegative}}}{${center}+\\sqrt{${discriminantNegative}}}\\right|`;
  const exactLatex = normalizeGeneratedIntegrationLatex(
    casewiseLatex([
      {
        valueLatex: joinAdditiveLatex([logTerm, positiveResidualTerm ?? '0']) ?? logTerm,
        conditionLatex: `${discriminantPositive}>0`,
      },
      {
        valueLatex: joinAdditiveLatex([logTerm, zeroResidualTerm ?? '0']) ?? logTerm,
        conditionLatex: `${discriminantPositive}=0`,
      },
      {
        valueLatex: joinAdditiveLatex([logTerm, negativeResidualTerm ?? '0']) ?? logTerm,
        conditionLatex: `${discriminantPositive}<0`,
      },
    ]),
    variable,
  );

  return success(
    exactLatex,
    'verified by symbolic quadratic linear-numerator casewise decomposition rule proof',
    [nonzero(a)],
  );
}
