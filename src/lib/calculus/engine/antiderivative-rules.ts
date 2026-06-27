import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildExactScalarNode,
  divideExactScalars,
  type ExactScalar,
  exactScalarToNumber,
  normalizeExactScalar,
  readExactScalarNode,
} from '../../algebra/polynomial-core';

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
  return /^[-+]?\w+(?:\^\{?[-+]?\d+\}?)?$/.test(latex) ? latex : `\\left(${latex}\\right)`;
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
    return '\\ln\\left|x\\right|';
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

export function resolveAntiderivativeRule(
  node: unknown,
  variable = 'x',
): string | undefined {
  if (!dependsOnVariable(node, variable)) {
    const latex = boxLatex(node);
    return latex === '0' ? '0' : multiplyLatex(latex, variable);
  }

  if (node === variable) {
    return '\\frac{x^{2}}{2}';
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

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3 && node[1] === 1) {
    if (node[2] === variable) {
      return '\\ln\\left|x\\right|';
    }

    const affine = parseAffine(node[2], variable);
    if (affine) {
      return divideByNumericCoefficient(
        `\\ln\\left|${wrapGroupedLatex(affine.latex)}\\right|`,
        affine.a,
      );
    }
  }

  if (isNodeArray(node) && node[0] === 'Power' && node.length === 3) {
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
  }

  return undefined;
}
