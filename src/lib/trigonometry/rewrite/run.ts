import type { AngleUnit } from '../../../types/calculator';
import {
  flattenAdd,
} from '../../symbolic-engine/patterns';
import { normalizeAst } from '../../symbolic-engine/normalize';
import {
  matchTrigCall,
  normalizeTrigAst,
  sameTrigArgument,
} from '../normalize';
import {
  ce,
  isNodeArray,
  isZeroNode,
  negateConstantTermLatex,
} from './shared';
import { matchDirectCosDoubleAngleRewrite } from './cos-double-angle';
import { matchDirectProductRewrite } from './product-double-angle';
import { matchDirectSquareSplit } from './square-split';
import { matchTrigSumProductRewrite } from './sum-product';
import type { TrigRewriteMatchResult } from './types';
import type { TrigRewriteSolveCandidate } from '../../../types/calculator';

function matchSameArgumentQuotientRewrite(
  expressionNode: unknown,
  rhsNode: unknown,
): TrigRewriteSolveCandidate | null {
  const expression = matchTrigCall(normalizeAst(expressionNode));
  const rhs = matchTrigCall(normalizeAst(rhsNode));
  if (
    !expression
    || !rhs
    || expression.kind !== 'sin'
    || rhs.kind !== 'cos'
    || !sameTrigArgument(expression, rhs)
  ) {
    return null;
  }

  return {
    kind: 'single-call',
    rewriteKind: 'same-argument-quotient',
    solvedLatex: `\\tan\\left(${expression.argumentLatex}\\right)=1`,
    summaryText: 'Normalized same-argument sine/cosine equality to a tangent equation before solving.',
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
  const quotient = matchSameArgumentQuotientRewrite(expressionNode, rhsNode);
  if (quotient) {
    return { kind: 'candidate', candidate: quotient };
  }

  const product = matchDirectProductRewrite(expressionNode, rhsNode);
  if (product) {
    return { kind: 'candidate', candidate: product };
  }

  const cosDoubleAngle = matchDirectCosDoubleAngleRewrite(expressionNode, rhsNode);
  if (cosDoubleAngle) {
    return { kind: 'candidate', candidate: cosDoubleAngle };
  }

  const square = matchDirectSquareSplit(expressionNode, rhsNode);
  if (square.kind !== 'none') {
    return square;
  }

  return matchTrigSumProductRewrite(expressionNode, rhsNode);
}

function matchTrigEquationRewriteForSolve(
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

export {
  matchTrigEquationRewriteForSolve,
};
