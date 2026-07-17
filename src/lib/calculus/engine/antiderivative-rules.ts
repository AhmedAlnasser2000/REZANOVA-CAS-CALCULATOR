import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToNode,
  type ExactScalar,
  exactScalarToNumber,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  negateExactScalar,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  scaleExactPolynomial,
} from '../../algebra/polynomial-core';
import {
  tryAffineSinCosProductPowerAntiderivative,
  tryAffineSinCosProductPowerAntiderivativeNode,
  tryAffineSinCosPowerAntiderivative,
  tryAffineSinCosPowerAntiderivativeNode,
  tryAffineTanSecCotCscPowerAntiderivative,
  tryAffineTanSecCotCscPowerAntiderivativeNode,
} from './trig-power-identities';
import {
  scaleStandardMathJson,
  standardAntiderivativeExpression,
  type CalculusAntiderivativeBaseExpression,
} from './antiderivative-expression';
import {
  repeatedSinCosProductAsPower,
  scaledByLinearSlope,
} from './antiderivative-linear-helpers';

const ce = new ComputeEngine();

type AffineForm = {
  a: number;
  aScalar: ExactScalar;
  b: number;
  latex: string;
};

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isFiniteNumber(node: unknown): node is number {
  return typeof node === 'number' && Number.isFinite(node);
}

function finiteScalarValue(node: unknown): number | undefined {
  if (isFiniteNumber(node)) {
    return node;
  }

  const exact = readExactScalarNode(node);
  return exact ? exactScalarToNumber(exact) : undefined;
}

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }

  if (!isNodeArray(node)) {
    return false;
  }

  return node.some((child, index) => index > 0 && dependsOnVariable(child, variable));
}

function wrapGroupedLatex(latex: string) {
  if (/^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex)) {
    return latex;
  }

  if (/^\\(?:sin|cos|tan|cot|sec|csc|ln|log|arcsin|arccos|arctan|arcsec|arccsc|arccot)\\left\(.+\\right\)(?:\^\{?[-+]?\d+\}?)?$/.test(latex)) {
    return latex;
  }

  return `\\left(${latex}\\right)`;
}

function multiplyLatex(left: string, right: string) {
  if (left === '1') {
    return right;
  }

  if (left === '-1') {
    return `-${wrapGroupedLatex(right)}`;
  }

  return `${left}${wrapGroupedLatex(right)}`;
}

function divideByNumericCoefficient(numeratorLatex: string, denominator: number) {
  if (denominator === 1) {
    return numeratorLatex;
  }

  if (denominator === -1) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  return `\\frac{${numeratorLatex}}{${boxLatex(denominator)}}`;
}

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function scaleExactScalarByInteger(value: ExactScalar, factor: number): ExactScalar {
  return normalizeExactScalar({
    numerator: value.numerator * factor,
    denominator: value.denominator,
  });
}

function scaledAffineArgumentNode(affine: AffineForm, factor: number, variable: string): unknown {
  const slope = scaleExactScalarByInteger(affine.aScalar, factor);
  const slopeNode = buildExactScalarNode(slope);
  const variableTerm = slope.numerator === slope.denominator
    ? variable
    : ['Multiply', slopeNode, variable];
  const offset = affine.b * factor;
  if (offset === 0) {
    return variableTerm;
  }
  return ['Add', variableTerm, offset];
}

function scaledAffineArgumentLatex(affine: AffineForm, factor: number, variable: string) {
  return boxLatex(scaledAffineArgumentNode(affine, factor, variable));
}

function divideByExactCoefficient(numeratorLatex: string, denominator: ExactScalar) {
  const normalized = normalizeExactScalar(denominator);
  if (normalized.numerator === normalized.denominator) {
    return numeratorLatex;
  }

  if (normalized.numerator === -normalized.denominator) {
    return `-${wrapGroupedLatex(numeratorLatex)}`;
  }

  const reciprocal = divideExactScalars(EXACT_ONE, normalized);
  if (reciprocal) {
    const normalizedReciprocal = normalizeExactScalar(reciprocal);
    if (normalizedReciprocal.denominator === 1) {
      return multiplyLatex(exactScalarLatex(normalizedReciprocal), numeratorLatex);
    }
  }

  return `\\frac{${numeratorLatex}}{${exactScalarLatex(normalized)}}`;
}

function positiveNonUnitExactScalar(node: unknown): ExactScalar | undefined {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return undefined;
  }

  const normalized = normalizeExactScalar(scalar);
  if (
    normalized.denominator === 0
    || normalized.numerator <= 0
    || normalized.numerator === normalized.denominator
  ) {
    return undefined;
  }

  return normalized;
}

function divideExponentialByExactSlopeAndLog(
  numeratorLatex: string,
  slope: ExactScalar,
  baseLatex: string,
) {
  const logLatex = `\\ln\\left(${baseLatex}\\right)`;
  const normalized = normalizeExactScalar(slope);
  if (normalized.numerator === normalized.denominator) {
    return `\\frac{${numeratorLatex}}{${logLatex}}`;
  }

  if (normalized.numerator === -normalized.denominator) {
    return `-\\frac{${numeratorLatex}}{${logLatex}}`;
  }

  const reciprocal = divideExactScalars(EXACT_ONE, normalized);
  if (reciprocal) {
    const normalizedReciprocal = normalizeExactScalar(reciprocal);
    if (normalizedReciprocal.denominator === 1) {
      return `\\frac{${multiplyLatex(exactScalarLatex(normalizedReciprocal), numeratorLatex)}}{${logLatex}}`;
    }
  }

  return `\\frac{${numeratorLatex}}{${exactScalarLatex(normalized)}${wrapGroupedLatex(logLatex)}}`;
}

type LinearTerm = {
  value: number;
  scalar: ExactScalar;
};

function parseLinearTerm(node: unknown, variable: string): LinearTerm | undefined {
  if (node === variable) {
    return { value: 1, scalar: EXACT_ONE };
  }

  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  const rightScalar = readExactScalarNode(right);
  if (left === variable && rightScalar) {
    return { value: exactScalarToNumber(rightScalar), scalar: rightScalar };
  }

  const leftScalar = readExactScalarNode(left);
  if (right === variable && leftScalar) {
    return { value: exactScalarToNumber(leftScalar), scalar: leftScalar };
  }

  return undefined;
}

function parseAffine(node: unknown, variable: string): AffineForm | undefined {
  if (node === variable) {
    return { a: 1, aScalar: EXACT_ONE, b: 0, latex: variable };
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const affine = parseAffine(node[1], variable);
    return affine
      ? {
        a: -affine.a,
        aScalar: negateExactScalar(affine.aScalar),
        b: -affine.b,
        latex: boxLatex(node),
      }
      : undefined;
  }

  const linear = parseLinearTerm(node, variable);
  if (linear !== undefined) {
    return {
      a: linear.value,
      aScalar: linear.scalar,
      b: 0,
      latex: boxLatex(node),
    };
  }

  if (!isNodeArray(node) || node[0] !== 'Add' || node.length !== 3) {
    return undefined;
  }

  const left = node[1];
  const right = node[2];
  const leftScalar = finiteScalarValue(left);
  if (leftScalar !== undefined) {
    const affine = parseAffine(right, variable);
    if (!affine) {
      return undefined;
    }

    return {
      a: affine.a,
      aScalar: affine.aScalar,
      b: affine.b + leftScalar,
      latex: boxLatex(node),
    };
  }

  const rightScalar = finiteScalarValue(right);
  if (rightScalar !== undefined) {
    const affine = parseAffine(left, variable);
    if (!affine) {
      return undefined;
    }

    return {
      a: affine.a,
      aScalar: affine.aScalar,
      b: affine.b + rightScalar,
      latex: boxLatex(node),
    };
  }

  return undefined;
}

function integralOfPower(variable: string, exponent: number) {
  if (exponent === -1) {
    return `\\ln\\left|${variable}\\right|`;
  }

  if (exponent === 0) {
    return variable;
  }

  const nextExponent = exponent + 1;
  if (nextExponent === 1) {
    return variable;
  }

  return `\\frac{${variable}^{${boxLatex(nextExponent)}}}{${boxLatex(nextExponent)}}`;
}

function integralOfAffinePower(affine: AffineForm, exponent: number) {
  if (affine.a === 0) {
    return undefined;
  }

  if (exponent === -1) {
    return divideByNumericCoefficient(
      `\\ln\\left|${wrapGroupedLatex(affine.latex)}\\right|`,
      affine.a,
    );
  }

  const nextExponent = exponent + 1;
  const powered =
    nextExponent === 1
      ? wrapGroupedLatex(affine.latex)
      : `${wrapGroupedLatex(affine.latex)}^{${boxLatex(nextExponent)}}`;

  return divideByNumericCoefficient(powered, affine.a * nextExponent);
}

function integralOfAffineTrigSquare(
  kind: 'Sin' | 'Cos' | 'Tan' | 'Cot',
  affine: AffineForm,
  variable: string,
) {
  const doubleAngleLatex = scaledAffineArgumentLatex(affine, 2, variable);
  if (kind === 'Sin') {
    return joinAdditiveLatex([
      divideByExactCoefficient(wrapGroupedLatex(affine.latex), scaleExactScalarByInteger(affine.aScalar, 2)),
      `-${wrapGroupedLatex(divideByExactCoefficient(
        `\\sin\\left(${doubleAngleLatex}\\right)`,
        scaleExactScalarByInteger(affine.aScalar, 4),
      ))}`,
    ]);
  }

  if (kind === 'Cos') {
    return joinAdditiveLatex([
      divideByExactCoefficient(wrapGroupedLatex(affine.latex), scaleExactScalarByInteger(affine.aScalar, 2)),
      divideByExactCoefficient(
        `\\sin\\left(${doubleAngleLatex}\\right)`,
        scaleExactScalarByInteger(affine.aScalar, 4),
      ),
    ]);
  }

  if (kind === 'Tan') {
    return joinAdditiveLatex([
      divideByExactCoefficient(`\\tan\\left(${affine.latex}\\right)`, affine.aScalar),
      `-${variable}`,
    ]);
  }

  return joinAdditiveLatex([
    divideByExactCoefficient(`-\\cot\\left(${affine.latex}\\right)`, affine.aScalar),
    `-${variable}`,
  ]);
}

type ProductToSumTerm = {
  coefficient: ExactScalar;
  head: 'Sin' | 'Cos';
  argument: unknown;
};

type ScaledTrigProduct = {
  coefficient: ExactScalar;
  left: {
    head: 'Sin' | 'Cos';
    argument: unknown;
  };
  right: {
    head: 'Sin' | 'Cos';
    argument: unknown;
  };
};

function trigProductFactor(node: unknown, variable: string) {
  if (!isNodeArray(node) || node.length !== 2 || (node[0] !== 'Sin' && node[0] !== 'Cos')) {
    return undefined;
  }

  const polynomial = parseExactPolynomial(node[1], variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  return {
    head: node[0] as 'Sin' | 'Cos',
    argument: node[1],
  };
}

function scaledTrigProduct(node: unknown, variable: string): ScaledTrigProduct | undefined {
  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length < 3) {
    return undefined;
  }

  let coefficient: ExactScalar = EXACT_ONE;
  const trigFactors: Array<ScaledTrigProduct['left']> = [];

  for (const factor of node.slice(1)) {
    const trig = trigProductFactor(factor, variable);
    if (trig) {
      trigFactors.push(trig);
      continue;
    }

    const scalar = readExactScalarNode(factor);
    if (!scalar) {
      return undefined;
    }

    coefficient = multiplyExactScalars(coefficient, scalar);
  }

  if (trigFactors.length !== 2) {
    return undefined;
  }

  return {
    coefficient,
    left: trigFactors[0],
    right: trigFactors[1],
  };
}

function combineTrigArguments(left: unknown, right: unknown, sign: 1 | -1, variable: string) {
  const combined = parseExactPolynomial(
    ['Add', left, sign === 1 ? right : ['Negate', right]],
    variable,
    1,
  );
  return combined ? exactPolynomialToNode(combined) : undefined;
}

function integrateProductToSumTerm(term: ProductToSumTerm, variable: string) {
  const normalizedTerm = normalizeProductToSumTerm(term, variable);
  return resolveAntiderivativeRule(
    [
      'Multiply',
      buildExactScalarNode(normalizedTerm.coefficient),
      [normalizedTerm.head, normalizedTerm.argument],
    ],
    variable,
  );
}

function normalizeProductToSumTerm(term: ProductToSumTerm, variable: string): ProductToSumTerm {
  const polynomial = parseExactPolynomial(term.argument, variable, 1);
  if (!polynomial) {
    return term;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (slope.numerator >= 0) {
    return { ...term, argument: exactPolynomialToNode(polynomial) };
  }

  const negated = scaleExactPolynomial(polynomial, { numerator: -1, denominator: 1 });
  return {
    coefficient: term.head === 'Sin' ? negateExactScalar(term.coefficient) : term.coefficient,
    head: term.head,
    argument: exactPolynomialToNode(negated),
  };
}

function productToSumExpansion(node: unknown, variable: string) {
  const product = scaledTrigProduct(node, variable);
  if (!product) {
    return undefined;
  }

  const { left, right } = product;
  const sumArgument = combineTrigArguments(left.argument, right.argument, 1, variable);
  const differenceArgument = combineTrigArguments(left.argument, right.argument, -1, variable);
  if (!sumArgument || !differenceArgument) {
    return undefined;
  }

  const half: ExactScalar = { numerator: 1, denominator: 2 };
  const negativeHalf: ExactScalar = { numerator: -1, denominator: 2 };
  let terms: ProductToSumTerm[];

  if (left.head === 'Sin' && right.head === 'Cos') {
    terms = [
      { coefficient: half, head: 'Sin', argument: sumArgument },
      { coefficient: half, head: 'Sin', argument: differenceArgument },
    ];
  } else if (left.head === 'Cos' && right.head === 'Sin') {
    terms = [
      { coefficient: half, head: 'Sin', argument: sumArgument },
      { coefficient: negativeHalf, head: 'Sin', argument: differenceArgument },
    ];
  } else {
    terms = [
      { coefficient: half, head: 'Cos', argument: differenceArgument },
      {
        coefficient: left.head === 'Sin' ? negativeHalf : half,
        head: 'Cos',
        argument: sumArgument,
      },
    ];
  }

  terms = terms.map((term) => ({
    ...term,
    coefficient: multiplyExactScalars(product.coefficient, term.coefficient),
  }));

  return terms;
}

function tryTrigProductToSumRule(node: unknown, variable: string) {
  const terms = productToSumExpansion(node, variable);
  if (!terms) return undefined;
  const integrated = terms.map((term) => integrateProductToSumTerm(term, variable));
  return integrated.some((term) => !term) ? undefined : joinAdditiveLatex(integrated as string[]);
}

function tryTrigProductToSumRuleNode(node: unknown, variable: string) {
  const terms = productToSumExpansion(node, variable);
  if (!terms) return undefined;
  const integrated = terms.map((term) => {
    const normalized = normalizeProductToSumTerm(term, variable);
    return directRuleMathJson([
      'Multiply',
      buildExactScalarNode(normalized.coefficient),
      [normalized.head, normalized.argument],
    ], variable);
  });
  return integrated.some((term) => term === undefined)
    ? undefined
    : ['Add', ...integrated];
}

function separateConstantFactor(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply' || node.length < 3) {
    return undefined;
  }

  const factors = node.slice(1);
  const constantFactors = factors.filter((factor) => !dependsOnVariable(factor, variable));
  const variableFactors = factors.filter((factor) => dependsOnVariable(factor, variable));

  if (constantFactors.length === 0 || variableFactors.length !== 1) {
    return undefined;
  }

  const constantNode =
    constantFactors.length === 1 ? constantFactors[0] : ['Multiply', ...constantFactors];

  return {
    constantNode,
    constantLatex: boxLatex(constantNode),
    body: variableFactors[0],
  };
}

function joinAdditiveLatex(parts: string[]) {
  if (parts.length === 0) {
    return undefined;
  }

  return parts.reduce((result, current, index) => {
    if (index === 0) {
      return current;
    }

    return current.startsWith('-') ? `${result}${current}` : `${result}+${current}`;
  }, '');
}

function directRuleMathJson(node: unknown, variable: string): unknown | undefined {
  if (!dependsOnVariable(node, variable)) {
    return finiteScalarValue(node) === 0 ? 0 : ['Multiply', structuredClone(node), variable];
  }

  if (node === variable) {
    return ['Divide', ['Power', variable, 2], 2];
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const terms = node.slice(1).map((term) => directRuleMathJson(term, variable));
    return terms.some((term) => term === undefined)
      ? undefined
      : ['Add', ...terms];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    const primitive = directRuleMathJson(node[1], variable);
    return primitive === undefined ? undefined : ['Negate', primitive];
  }

  const separated = separateConstantFactor(node, variable);
  if (separated) {
    const primitive = directRuleMathJson(separated.body, variable);
    return primitive === undefined
      ? undefined
      : scaleStandardMathJson(separated.constantNode, primitive);
  }

  const repeatedSinCosProduct = repeatedSinCosProductAsPower(node);
  if (repeatedSinCosProduct) {
    const primitive = directRuleMathJson(repeatedSinCosProduct, variable);
    if (primitive) return primitive;
  }

  const sinCosProductPower = tryAffineSinCosProductPowerAntiderivativeNode(node, variable);
  if (sinCosProductPower) return sinCosProductPower;

  const trigProductToSum = tryTrigProductToSumRuleNode(node, variable);
  if (trigProductToSum) return trigProductToSum;

  const tanSecCotCscPower = tryAffineTanSecCotCscPowerAntiderivativeNode(node, variable);
  if (tanSecCotCscPower) return tanSecCotCscPower;

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    if (node[2] === variable) {
      return ['Ln', ['Abs', variable]];
    }
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const sinCosPower = tryAffineSinCosPowerAntiderivativeNode(node, variable);
    if (sinCosPower) return sinCosPower;
    const [base, exponent] = node.slice(1);
    if (base === variable && isFiniteNumber(exponent)) {
      if (exponent === -1) {
        return ['Ln', ['Abs', variable]];
      }
      const nextExponent = exponent + 1;
      return nextExponent === 0
        ? undefined
        : ['Divide', ['Power', variable, nextExponent], nextExponent];
    }


    if (base === 'ExponentialE') {
      const affine = parseAffine(exponent, variable);
      const reciprocal = affine
        ? divideExactScalars(EXACT_ONE, affine.aScalar)
        : undefined;
      return reciprocal
        ? scaleStandardMathJson(buildExactScalarNode(reciprocal), structuredClone(node))
        : undefined;
    }

    const positiveBase = positiveNonUnitExactScalar(base);
    if (positiveBase) {
      const affine = parseAffine(exponent, variable);
      const reciprocal = affine
        ? divideExactScalars(EXACT_ONE, affine.aScalar)
        : undefined;
      return reciprocal
        ? [
            'Divide',
            scaleStandardMathJson(buildExactScalarNode(reciprocal), structuredClone(node)),
            ['Ln', buildExactScalarNode(positiveBase)],
          ]
        : undefined;
    }

    if (exponent === 2 && isNodeArray(base) && base.length === 2) {
      const affine = parseAffine(base[1], variable);
      if (affine && (base[0] === 'Sin' || base[0] === 'Cos')) {
        const reciprocalHalf = divideExactScalars(EXACT_ONE, scaleExactScalarByInteger(affine.aScalar, 2));
        const reciprocalQuarter = divideExactScalars(EXACT_ONE, scaleExactScalarByInteger(affine.aScalar, 4));
        if (reciprocalHalf && reciprocalQuarter) {
          const angle = structuredClone(base[1]);
          const doubleAngle = scaledAffineArgumentNode(affine, 2, variable);
          const sign = base[0] === 'Sin' ? -1 : 1;
          return [
            'Add',
            scaleStandardMathJson(buildExactScalarNode(reciprocalHalf), angle),
            scaleStandardMathJson(
              buildExactScalarNode(sign === 1 ? reciprocalQuarter : negateExactScalar(reciprocalQuarter)),
              ['Sin', doubleAngle],
            ),
          ];
        }
      }
      if (affine && (base[0] === 'Tan' || base[0] === 'Cot')) {
        const reciprocal = divideExactScalars(EXACT_ONE, affine.aScalar);
        if (reciprocal) {
          return [
            'Add',
            scaleStandardMathJson(
              buildExactScalarNode(base[0] === 'Tan' ? reciprocal : negateExactScalar(reciprocal)),
              [base[0] === 'Tan' ? 'Tan' : 'Cot', structuredClone(base[1])],
            ),
            ['Negate', variable],
          ];
        }
      }
      const reciprocal = affine
        ? divideExactScalars(EXACT_ONE, affine.aScalar)
        : undefined;
      if (reciprocal && base[0] === 'Sec') {
        return scaleStandardMathJson(
          buildExactScalarNode(reciprocal),
          ['Tan', structuredClone(base[1])],
        );
      }
      if (reciprocal && base[0] === 'Csc') {
        return scaleStandardMathJson(
          buildExactScalarNode(negateExactScalar(reciprocal)),
          ['Cot', structuredClone(base[1])],
        );
      }
    }
  }

  if (isNodeArray(node) && node.length === 2) {
    if (node[0] === 'Sin') {
      return scaledByLinearSlope(['Negate', ['Cos', structuredClone(node[1])]], node[1], variable);
    }
    if (node[0] === 'Cos') {
      return scaledByLinearSlope(['Sin', structuredClone(node[1])], node[1], variable);
    }
    if (node[0] === 'Tan') {
      return scaledByLinearSlope(['Negate', ['Ln', ['Cos', structuredClone(node[1])]]], node[1], variable);
    }
    if (node[0] === 'Cot') {
      return scaledByLinearSlope(['Ln', ['Sin', structuredClone(node[1])]], node[1], variable);
    }
    if (node[0] === 'Sec') {
      return scaledByLinearSlope(
        ['Ln', ['Abs', ['Add', ['Sec', structuredClone(node[1])], ['Tan', structuredClone(node[1])]]]],
        node[1],
        variable,
      );
    }
    if (node[0] === 'Csc') {
      return scaledByLinearSlope(
        ['Ln', ['Abs', ['Subtract', ['Csc', structuredClone(node[1])], ['Cot', structuredClone(node[1])]]]],
        node[1],
        variable,
      );
    }
    if (node[0] === 'Sinh') {
      return scaledByLinearSlope(['Cosh', structuredClone(node[1])], node[1], variable);
    }
    if (node[0] === 'Cosh') {
      return scaledByLinearSlope(['Sinh', structuredClone(node[1])], node[1], variable);
    }
  }

  return undefined;
}

export function resolveAntiderivativeRuleExpression(
  node: unknown,
  variable = 'x',
): CalculusAntiderivativeBaseExpression | undefined {
  const mathJson = directRuleMathJson(node, variable);
  if (mathJson === undefined) {
    return undefined;
  }

  try {
    return standardAntiderivativeExpression({
      mathJson,
      source: 'calculus.integration:direct-rule-native-result',
    });
  } catch {
    return undefined;
  }
}

export function resolveAntiderivativeRule(
  node: unknown,
  variable = 'x',
): string | undefined {
  if (!dependsOnVariable(node, variable)) {
    const latex = boxLatex(node);
    return latex === '0' ? '0' : multiplyLatex(latex, variable);
  }

  if (node === variable) {
    return `\\frac{${variable}^{2}}{2}`;
  }

  if (isNodeArray(node) && node[0] === 'Add') {
    const integrals = node
      .slice(1)
      .map((term) => resolveAntiderivativeRule(term, variable));
    if (integrals.some((term) => !term)) {
      return undefined;
    }

    return joinAdditiveLatex(integrals as string[]);
  }

  const separated = separateConstantFactor(node, variable);
  if (separated) {
    const integral = resolveAntiderivativeRule(separated.body, variable);
    if (!integral) {
      return undefined;
    }

    return multiplyLatex(separated.constantLatex, integral);
  }

  const repeatedSinCosProduct = repeatedSinCosProductAsPower(node);
  if (repeatedSinCosProduct) {
    const integral = resolveAntiderivativeRule(repeatedSinCosProduct, variable);
    if (integral) {
      return integral;
    }
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    if (node[2] === variable) {
      return `\\ln\\left|${variable}\\right|`;
    }

    const affine = parseAffine(node[2], variable);
    if (affine) {
      return divideByNumericCoefficient(
        `\\ln\\left|${wrapGroupedLatex(affine.latex)}\\right|`,
        affine.a,
      );
    }
  }

  const trigProductToSum = tryTrigProductToSumRule(node, variable);
  if (trigProductToSum) {
    return trigProductToSum;
  }

  const sinCosProductPower = tryAffineSinCosProductPowerAntiderivative(node, variable);
  if (sinCosProductPower) {
    return sinCosProductPower;
  }

  const tanSecCotCscPower = tryAffineTanSecCotCscPowerAntiderivative(node, variable);
  if (tanSecCotCscPower) {
    return tanSecCotCscPower;
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
    const sinCosPower = tryAffineSinCosPowerAntiderivative(node, variable);
    if (sinCosPower) {
      return sinCosPower;
    }

    const base = node[1];
    const exponent = node[2];
    if (base === variable && isFiniteNumber(exponent)) {
      return integralOfPower(variable, exponent);
    }

    if (base === 'ExponentialE') {
      const affine = parseAffine(exponent, variable);
      if (affine) {
        return divideByExactCoefficient(
          `${boxLatex(base)}^{${wrapGroupedLatex(affine.latex)}}`,
          affine.aScalar,
        );
      }
    }

    const positiveBase = positiveNonUnitExactScalar(base);
    if (positiveBase) {
      const affine = parseAffine(exponent, variable);
      if (affine) {
        const baseLatex = exactScalarLatex(positiveBase);
        return divideExponentialByExactSlopeAndLog(
          `${wrapGroupedLatex(baseLatex)}^{${wrapGroupedLatex(affine.latex)}}`,
          affine.aScalar,
          baseLatex,
        );
      }
    }

    if (exponent === 2 && isNodeArray(base) && base.length === 2) {
      const affine = parseAffine(base[1], variable);
      if (affine && (base[0] === 'Sin' || base[0] === 'Cos' || base[0] === 'Tan' || base[0] === 'Cot')) {
        return integralOfAffineTrigSquare(base[0], affine, variable);
      }

      if (affine && base[0] === 'Sec') {
        return divideByExactCoefficient(
          `\\tan\\left(${affine.latex}\\right)`,
          affine.aScalar,
        );
      }

      if (affine && base[0] === 'Csc') {
        return divideByExactCoefficient(
          `-\\cot\\left(${affine.latex}\\right)`,
          affine.aScalar,
        );
      }
    }

    if (isFiniteNumber(exponent)) {
      const affine = parseAffine(base, variable);
      if (affine) {
        return integralOfAffinePower(affine, exponent);
      }
    }
  }

  if (isNodeArray(node) && node.length === 2) {
    const affine = parseAffine(node[1], variable);
    if (!affine) {
      return undefined;
    }

    if (node[0] === 'Sin') {
      return divideByExactCoefficient(
        `-\\cos\\left(${affine.latex}\\right)`,
        affine.aScalar,
      );
    }

    if (node[0] === 'Cos') {
      return divideByExactCoefficient(
        `\\sin\\left(${affine.latex}\\right)`,
        affine.aScalar,
      );
    }

    if (node[0] === 'Tan') {
      return divideByExactCoefficient(
        `-\\ln\\left(\\cos\\left(${affine.latex}\\right)\\right)`,
        affine.aScalar,
      );
    }

    if (node[0] === 'Cot') {
      return divideByExactCoefficient(
        `\\ln\\left(\\sin\\left(${affine.latex}\\right)\\right)`,
        affine.aScalar,
      );
    }

    if (node[0] === 'Sinh') {
      return divideByExactCoefficient(
        `\\cosh\\left(${affine.latex}\\right)`,
        affine.aScalar,
      );
    }

    if (node[0] === 'Cosh') {
      return divideByExactCoefficient(
        `\\sinh\\left(${affine.latex}\\right)`,
        affine.aScalar,
      );
    }
  }

  return undefined;
}
