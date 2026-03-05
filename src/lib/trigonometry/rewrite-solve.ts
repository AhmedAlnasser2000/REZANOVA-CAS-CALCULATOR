import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatNumber } from '../format';
import { exactRatioLatex, parseSupportedRatio } from './angles';
import {
  flattenAdd,
  flattenMultiply,
  isFiniteNumber,
  isNodeArray,
} from '../symbolic-engine/patterns';
import { normalizeAst } from '../symbolic-engine/normalize';
import {
  matchAffineVariableArgument,
  matchTrigCall,
  matchTrigSquare,
  normalizeTrigAst,
  sameTrigArgument,
} from './normalize';
import type {
  AngleUnit,
  TrigRewriteSolveCandidate,
} from '../../types/calculator';

const ce = new ComputeEngine();
const EPSILON = 1e-9;

export type TrigRewriteMatchResult =
  | { kind: 'none' }
  | { kind: 'candidate'; candidate: TrigRewriteSolveCandidate }
  | { kind: 'blocked'; error: string };

type ProductTemplateMatch = {
  coefficient: 1 | 2;
  doubledArgumentLatex: string;
};

type ScaledSquareMatch = {
  kind: 'sin' | 'cos';
  coefficient: number;
  argumentLatex: string;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function isZeroNode(node: unknown) {
  const value = parseSupportedRatio(boxLatex(node));
  return value !== null && Math.abs(value) < EPSILON;
}

function approximateFraction(value: number, maxDenominator = 360) {
  for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
    const numerator = Math.round(value * denominator);
    if (Math.abs(value - numerator / denominator) < EPSILON) {
      return { numerator, denominator };
    }
  }

  return undefined;
}

function formatExactValueLatex(value: number) {
  const exact = exactRatioLatex(value);
  if (exact) {
    return exact;
  }

  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < EPSILON) {
    return `${rounded}`;
  }

  const ratio = approximateFraction(value);
  if (ratio) {
    const sign = ratio.numerator < 0 ? '-' : '';
    const numerator = Math.abs(ratio.numerator);
    const denominator = Math.abs(ratio.denominator);
    if (denominator === 1) {
      return `${ratio.numerator}`;
    }
    return `${sign}\\frac{${numerator}}{${denominator}}`;
  }

  return formatNumber(value);
}

function scaledConstantLatex(node: unknown, factor: number) {
  const value = parseSupportedRatio(boxLatex(node));
  if (value !== null) {
    return formatExactValueLatex(value * factor);
  }

  return boxLatex(normalizeAst(['Multiply', factor, node]));
}

function negateConstantTermLatex(node: unknown) {
  const value = parseSupportedRatio(boxLatex(node));
  return value === null ? null : formatExactValueLatex(-value);
}

function doubledArgumentLatex(node: unknown) {
  const affine = matchAffineVariableArgument(node, { maxCoefficient: 6 });
  if (!affine) {
    return null;
  }
  if (affine.coefficient * 2 > 6) {
    return null;
  }

  const doubledNode = normalizeAst(['Multiply', 2, node]);
  return boxLatex(doubledNode);
}

function matchProductTemplate(node: unknown): ProductTemplateMatch | null {
  const normalized = normalizeAst(node);
  const factors = flattenMultiply(normalized);
  let numericCoefficient = 1;
  let sinCall: ReturnType<typeof matchTrigCall> = null;
  let cosCall: ReturnType<typeof matchTrigCall> = null;

  for (const factor of factors) {
    if (isFiniteNumber(factor)) {
      numericCoefficient *= factor;
      continue;
    }

    const trig = matchTrigCall(factor);
    if (!trig) {
      return null;
    }

    if (trig.kind === 'sin') {
      if (sinCall) {
        return null;
      }
      sinCall = trig;
      continue;
    }

    if (trig.kind === 'cos') {
      if (cosCall) {
        return null;
      }
      cosCall = trig;
      continue;
    }

    return null;
  }

  if (!sinCall || !cosCall || !sameTrigArgument(sinCall, cosCall)) {
    return null;
  }

  if (numericCoefficient !== 1 && numericCoefficient !== 2) {
    return null;
  }

  const doubled = doubledArgumentLatex(sinCall.argument);
  if (!doubled) {
    return null;
  }

  return {
    coefficient: numericCoefficient as 1 | 2,
    doubledArgumentLatex: doubled,
  };
}

function matchScaledTrigSquare(node: unknown): ScaledSquareMatch | null {
  const normalized = normalizeAst(node);
  const square = matchTrigSquare(normalized);
  if (square && (square.kind === 'sin' || square.kind === 'cos')) {
    return {
      kind: square.kind,
      coefficient: 1,
      argumentLatex: square.argumentLatex,
    };
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    const negated = matchScaledTrigSquare(normalized[1]);
    return negated ? { ...negated, coefficient: -negated.coefficient } : null;
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Multiply') {
    return null;
  }

  const factors = flattenMultiply(normalized);
  let numericCoefficient = 1;
  let squareFactor: ReturnType<typeof matchTrigSquare> = null;

  for (const factor of factors) {
    if (isFiniteNumber(factor)) {
      numericCoefficient *= factor;
      continue;
    }

    const squareMatch = matchTrigSquare(factor);
    if (!squareMatch || squareFactor) {
      return null;
    }
    squareFactor = squareMatch;
  }

  if (!squareFactor || (squareFactor.kind !== 'sin' && squareFactor.kind !== 'cos')) {
    return null;
  }

  return {
    kind: squareFactor.kind,
    coefficient: numericCoefficient,
    argumentLatex: squareFactor.argumentLatex,
  };
}

function matchDirectProductRewrite(expressionNode: unknown, rhsNode: unknown): TrigRewriteSolveCandidate | null {
  const product = matchProductTemplate(expressionNode);
  if (!product) {
    return null;
  }

  const rhsLatex = product.coefficient === 1
    ? scaledConstantLatex(rhsNode, 2)
    : boxLatex(rhsNode);

  return {
    kind: 'single-call',
    rewriteKind: 'product-double-angle',
    solvedLatex: `\\sin\\left(${product.doubledArgumentLatex}\\right)=${rhsLatex}`,
    summaryText: 'Rewritten to a bounded double-angle form before solving.',
  };
}

function matchDirectCosDoubleAngleRewrite(expressionNode: unknown, rhsNode: unknown): TrigRewriteSolveCandidate | null {
  const normalized = normalizeAst(expressionNode);
  const terms = flattenAdd(normalized);
  if (terms.length !== 2) {
    return null;
  }

  const firstSquare = matchScaledTrigSquare(terms[0]);
  const secondSquare = matchScaledTrigSquare(terms[1]);
  const firstConstant = parseSupportedRatio(boxLatex(terms[0]));
  const secondConstant = parseSupportedRatio(boxLatex(terms[1]));

  let argumentLatex: string | null = null;

  if (
    firstSquare
    && secondSquare
    && (
      (
        firstSquare.kind === 'cos'
        && firstSquare.coefficient === 1
        && secondSquare.kind === 'sin'
        && secondSquare.coefficient === -1
      ) || (
        firstSquare.kind === 'sin'
        && firstSquare.coefficient === -1
        && secondSquare.kind === 'cos'
        && secondSquare.coefficient === 1
      )
    )
    && firstSquare.argumentLatex === secondSquare.argumentLatex
  ) {
    argumentLatex = firstSquare.argumentLatex;
  } else if (
    (
      firstConstant !== null
      && Math.abs(firstConstant - 1) < EPSILON
      && secondSquare?.kind === 'sin'
      && secondSquare.coefficient === -2
    ) || (
      secondConstant !== null
      && Math.abs(secondConstant - 1) < EPSILON
      && firstSquare?.kind === 'sin'
      && firstSquare.coefficient === -2
    )
  ) {
    argumentLatex = secondSquare?.kind === 'sin' && secondSquare.coefficient === -2
      ? secondSquare.argumentLatex
      : firstSquare?.argumentLatex ?? null;
  } else if (
    (
      firstSquare?.kind === 'cos'
      && firstSquare.coefficient === 2
      && secondConstant !== null
      && Math.abs(secondConstant + 1) < EPSILON
    ) || (
      secondSquare?.kind === 'cos'
      && secondSquare.coefficient === 2
      && firstConstant !== null
      && Math.abs(firstConstant + 1) < EPSILON
    )
  ) {
    argumentLatex = firstSquare?.kind === 'cos' && firstSquare.coefficient === 2
      ? firstSquare.argumentLatex
      : secondSquare?.argumentLatex ?? null;
  }

  if (!argumentLatex) {
    return null;
  }

  const doubled = doubledArgumentLatex(ce.parse(argumentLatex).json);
  if (!doubled) {
    return null;
  }

  return {
    kind: 'single-call',
    rewriteKind: 'cos-double-angle',
    solvedLatex: `\\cos\\left(${doubled}\\right)=${boxLatex(rhsNode)}`,
    summaryText: 'Rewritten to a bounded double-angle form before solving.',
  };
}

function matchDirectSquareSplit(expressionNode: unknown, rhsNode: unknown): TrigRewriteMatchResult {
  const square = matchScaledTrigSquare(expressionNode);
  if (!square || square.coefficient !== 1 || (square.kind !== 'sin' && square.kind !== 'cos')) {
    return { kind: 'none' };
  }

  const value = parseSupportedRatio(boxLatex(rhsNode));
  if (value === null) {
    return { kind: 'none' };
  }

  if (value < -EPSILON) {
    return {
      kind: 'blocked',
      error: 'No real solutions because sin^2(theta) and cos^2(theta) cannot be negative.',
    };
  }

  if (value > 1 + EPSILON) {
    return {
      kind: 'blocked',
      error: 'No real solutions because sin^2(theta) and cos^2(theta) cannot exceed 1.',
    };
  }

  const bounded = Math.min(Math.max(value, 0), 1);
  const rootLatex = formatExactValueLatex(Math.sqrt(bounded));
  const negativeRootLatex = formatExactValueLatex(-Math.sqrt(bounded));
  const fn = square.kind === 'sin' ? '\\sin' : '\\cos';

  return {
    kind: 'candidate',
    candidate: {
      kind: 'split-square',
      rewriteKind: square.kind === 'sin' ? 'sin-square-split' : 'cos-square-split',
      branchLatex: [
        `${fn}\\left(${square.argumentLatex}\\right)=${rootLatex}`,
        `${fn}\\left(${square.argumentLatex}\\right)=${negativeRootLatex}`,
      ],
      domainSummary: `Bounded ${square.kind}^2 solve in the real domain.`,
      summaryText: 'Split the trig square into positive and negative branches before solving.',
    },
  };
}

function matchZeroFormCandidate(nonZeroSide: unknown): TrigRewriteMatchResult {
  const terms = flattenAdd(normalizeAst(nonZeroSide));
  if (terms.length !== 2) {
    return { kind: 'none' };
  }

  for (let index = 0; index < terms.length; index += 1) {
    const expressionTerm = terms[index];
    const constantTerm = terms[(index + 1) % terms.length];
    const rhsLatex = negateConstantTermLatex(constantTerm);
    if (!rhsLatex) {
      continue;
    }

    const rhsNode = ce.parse(rhsLatex).json;
    const product = matchDirectProductRewrite(expressionTerm, rhsNode);
    if (product) {
      return { kind: 'candidate', candidate: product };
    }

    const square = matchDirectSquareSplit(expressionTerm, rhsNode);
    if (square.kind !== 'none') {
      return square;
    }
  }

  return { kind: 'none' };
}

function matchDirectCandidate(expressionNode: unknown, rhsNode: unknown): TrigRewriteMatchResult {
  const product = matchDirectProductRewrite(expressionNode, rhsNode);
  if (product) {
    return { kind: 'candidate', candidate: product };
  }

  const cosDoubleAngle = matchDirectCosDoubleAngleRewrite(expressionNode, rhsNode);
  if (cosDoubleAngle) {
    return { kind: 'candidate', candidate: cosDoubleAngle };
  }

  return matchDirectSquareSplit(expressionNode, rhsNode);
}

export function matchTrigEquationRewriteForSolve(
  resolvedLatex: string,
  angleUnit: AngleUnit,
): TrigRewriteMatchResult {
  void angleUnit;
  let normalized: unknown;
  try {
    normalized = normalizeTrigAst(ce.parse(resolvedLatex).json);
  } catch {
    return { kind: 'none' };
  }

  if (!isNodeArray(normalized) || normalized[0] !== 'Equal' || normalized.length !== 3) {
    return { kind: 'none' };
  }

  const [, left, right] = normalized;
  const direct = matchDirectCandidate(left, right);
  if (direct.kind !== 'none') {
    return direct;
  }

  const swapped = matchDirectCandidate(right, left);
  if (swapped.kind !== 'none') {
    return swapped;
  }

  if (isZeroNode(right)) {
    const zeroForm = matchZeroFormCandidate(left);
    if (zeroForm.kind !== 'none') {
      return zeroForm;
    }
  }

  if (isZeroNode(left)) {
    return matchZeroFormCandidate(right);
  }

  return { kind: 'none' };
}
