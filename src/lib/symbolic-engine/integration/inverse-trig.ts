import {
  buildExactScalarNode,
  divideExactScalars,
  exactPolynomialDegree,
  exactPolynomialToLatex,
  exactScalarIsZero,
  getExactPolynomialCoefficient,
  multiplyExactScalars,
  normalizeExactScalar,
  parseExactPolynomial,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { boxLatex, isNodeArray } from '../patterns';
import { numericNodeValue } from './node-helpers';
import { completedSquareQuadraticDenominatorForm } from './quadratic-completion';
import { scaleByExactScalar, scaleByIrrationalDenominator } from './rational';

const EXACT_ONE: ExactScalar = { numerator: 1, denominator: 1 };

type ExactAffineForm = {
  slope: ExactScalar;
  latex: string;
};

function exactScalarLatex(value: ExactScalar) {
  return boxLatex(buildExactScalarNode(value));
}

function scalarSquareRoot(value: ExactScalar): ExactScalar | undefined {
  const normalized = normalizeExactScalar(value);
  if (normalized.numerator < 0 || normalized.denominator <= 0) {
    return undefined;
  }

  const numeratorRoot = Math.sqrt(normalized.numerator);
  const denominatorRoot = Math.sqrt(normalized.denominator);
  if (!Number.isInteger(numeratorRoot) || !Number.isInteger(denominatorRoot)) {
    return undefined;
  }

  return normalizeExactScalar({
    numerator: numeratorRoot,
    denominator: denominatorRoot,
  });
}

function positiveScalar(value: ExactScalar) {
  const normalized = normalizeExactScalar(value);
  return normalized.denominator > 0 && normalized.numerator > 0 ? normalized : undefined;
}

function parseExactAffineForm(node: unknown, variable: string): ExactAffineForm | undefined {
  const polynomial = parseExactPolynomial(node, variable, 1);
  if (!polynomial || exactPolynomialDegree(polynomial) !== 1) {
    return undefined;
  }

  const slope = getExactPolynomialCoefficient(polynomial, 1);
  if (exactScalarIsZero(slope)) {
    return undefined;
  }

  return {
    slope,
    latex: exactPolynomialToLatex(polynomial),
  };
}

function squaredExactAffineTerm(node: unknown, variable: string) {
  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === 2
  ) {
    return parseExactAffineForm(node[1], variable);
  }

  return undefined;
}

function affineRatioWithRootLatex(
  affineLatex: string,
  root: ExactScalar | undefined,
  rootLatex: string,
) {
  return root && normalizeExactScalar(root).numerator === normalizeExactScalar(root).denominator
    ? affineLatex
    : `\\frac{${affineLatex}}{${rootLatex}}`;
}

function reciprocalDenominatorForm(node: unknown): { coefficient: ExactScalar; denominator: unknown } | undefined {
  if (isNodeArray(node) && node[0] === 'Multiply' && node.length >= 3) {
    let coefficient: ExactScalar = EXACT_ONE;
    const nonScalarFactors: unknown[] = [];
    for (const factor of node.slice(1)) {
      const scalar = readExactScalarNode(factor);
      if (scalar) {
        coefficient = multiplyExactScalars(coefficient, scalar);
      } else {
        nonScalarFactors.push(factor);
      }
    }

    if (nonScalarFactors.length === 1) {
      const inner = reciprocalDenominatorForm(nonScalarFactors[0]);
      return inner
        ? { coefficient: multiplyExactScalars(coefficient, inner.coefficient), denominator: inner.denominator }
        : undefined;
    }
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const numerator = readExactScalarNode(node[1]);
    return numerator ? { coefficient: numerator, denominator: node[2] } : undefined;
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === -1
  ) {
    return { coefficient: EXACT_ONE, denominator: node[1] };
  }

  return undefined;
}

function reciprocalSqrtForm(node: unknown): { coefficient: ExactScalar; body: unknown } | undefined {
  if (isNodeArray(node) && node[0] === 'Multiply' && node.length >= 3) {
    let coefficient: ExactScalar = EXACT_ONE;
    const nonScalarFactors: unknown[] = [];
    for (const factor of node.slice(1)) {
      const scalar = readExactScalarNode(factor);
      if (scalar) {
        coefficient = multiplyExactScalars(coefficient, scalar);
      } else {
        nonScalarFactors.push(factor);
      }
    }

    if (nonScalarFactors.length === 1) {
      const inner = reciprocalSqrtForm(nonScalarFactors[0]);
      return inner
        ? { coefficient: multiplyExactScalars(coefficient, inner.coefficient), body: inner.body }
        : undefined;
    }
  }

  if (
    isNodeArray(node)
    && node[0] === 'Sqrt'
    && node.length === 2
    && isNodeArray(node[1])
    && node[1][0] === 'Divide'
    && node[1].length === 3
  ) {
    const numerator = readExactScalarNode(node[1][1]);
    const root = numerator ? scalarSquareRoot(numerator) : undefined;
    return root ? { coefficient: root, body: node[1][2] } : undefined;
  }

  if (isNodeArray(node) && node[0] === 'Divide' && node.length === 3) {
    const numerator = readExactScalarNode(node[1]);
    const denominator = node[2];
    if (numerator && isNodeArray(denominator) && denominator[0] === 'Sqrt' && denominator.length === 2) {
      return { coefficient: numerator, body: denominator[1] };
    }
  }

  if (
    isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && numericNodeValue(node[2]) === -0.5
  ) {
    return { coefficient: EXACT_ONE, body: node[1] };
  }

  return undefined;
}

function literalArctanDenominatorForm(
  denominator: unknown,
  variable: string,
): {
  scale: ExactScalar;
  constant: ExactScalar;
  root: ExactScalar | undefined;
  affine: ExactAffineForm;
} | undefined {
  if (!isNodeArray(denominator) || denominator[0] !== 'Add' || denominator.length !== 3) {
    return undefined;
  }

  const left = denominator[1];
  const right = denominator[2];
  const leftConstant = readExactScalarNode(left);
  const rightConstant = readExactScalarNode(right);
  const constant = leftConstant ? positiveScalar(leftConstant) : rightConstant ? positiveScalar(rightConstant) : undefined;
  const square = leftConstant ? right : rightConstant ? left : undefined;
  const affine = square ? squaredExactAffineTerm(square, variable) : undefined;
  if (!constant || !affine) {
    return undefined;
  }

  return {
    scale: EXACT_ONE,
    constant,
    root: scalarSquareRoot(constant),
    affine,
  };
}

function arctanDenominatorForm(denominator: unknown, variable: string) {
  const literal = literalArctanDenominatorForm(denominator, variable);
  if (literal) {
    return literal;
  }

  const completed = completedSquareQuadraticDenominatorForm(denominator, variable);
  return completed
    ? {
      scale: completed.baseScale,
      constant: completed.constant,
      root: completed.constantRoot,
      affine: {
        slope: completed.affine.slope,
        latex: completed.affine.latex,
      },
    }
    : undefined;
}

function literalArcsinRadicandForm(
  body: unknown,
  variable: string,
): {
  constant: ExactScalar;
  root: ExactScalar | undefined;
  affine: ExactAffineForm;
} | undefined {
  if (!isNodeArray(body) || body[0] !== 'Add' || body.length !== 3) {
    return undefined;
  }

  const left = body[1];
  const right = body[2];
  const leftConstant = readExactScalarNode(left);
  const rightConstant = readExactScalarNode(right);
  const constant =
    leftConstant && isNodeArray(right) && right[0] === 'Negate'
      ? positiveScalar(leftConstant)
      : rightConstant && isNodeArray(left) && left[0] === 'Negate'
        ? positiveScalar(rightConstant)
        : undefined;
  const negatedPower =
    leftConstant && isNodeArray(right) && right[0] === 'Negate'
      ? right[1]
      : rightConstant && isNodeArray(left) && left[0] === 'Negate'
        ? left[1]
        : undefined;
  const affine = negatedPower ? squaredExactAffineTerm(negatedPower, variable) : undefined;
  if (!constant || !affine) {
    return undefined;
  }

  return {
    constant,
    root: scalarSquareRoot(constant),
    affine,
  };
}

export function inverseTrigIntegral(node: unknown, variable: string) {
  const reciprocal = reciprocalDenominatorForm(node);
  if (reciprocal) {
    const form = arctanDenominatorForm(reciprocal.denominator, variable);
    if (form) {
      const rootLatex = form.root ? exactScalarLatex(form.root) : `\\sqrt{${exactScalarLatex(form.constant)}}`;
      const slopeScale = multiplyExactScalars(form.scale, form.affine.slope);
      const coefficient = form.root
        ? divideExactScalars(reciprocal.coefficient, multiplyExactScalars(slopeScale, form.root))
        : divideExactScalars(reciprocal.coefficient, slopeScale);
      if (coefficient) {
        const arctanLatex = `\\arctan\\left(${affineRatioWithRootLatex(
          form.affine.latex,
          form.root,
          rootLatex,
        )}\\right)`;
        return form.root
          ? scaleByExactScalar(arctanLatex, coefficient)
          : scaleByIrrationalDenominator(arctanLatex, coefficient, rootLatex);
      }
    }
  }

  const sqrtReciprocal = reciprocalSqrtForm(node);
  if (sqrtReciprocal) {
    const form = literalArcsinRadicandForm(sqrtReciprocal.body, variable);
    if (form) {
      const rootLatex = form.root ? exactScalarLatex(form.root) : `\\sqrt{${exactScalarLatex(form.constant)}}`;
      const coefficient = divideExactScalars(sqrtReciprocal.coefficient, form.affine.slope);
      if (coefficient) {
        return scaleByExactScalar(
          `\\arcsin\\left(${affineRatioWithRootLatex(form.affine.latex, form.root, rootLatex)}\\right)`,
          coefficient,
        );
      }
    }
  }

  return undefined;
}
