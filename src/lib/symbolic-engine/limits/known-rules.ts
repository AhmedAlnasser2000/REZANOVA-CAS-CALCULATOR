import { isNodeArray } from '../patterns';
import {
  evaluateNodeAt,
  isEquivalentNode,
  isZeroish,
  success,
} from './evaluation';

function isNumericOne(node: unknown) {
  return node === 1;
}

function isNumericMinusOne(node: unknown) {
  return node === -1;
}

export function matchOnePlus(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  const oneIndex = terms.findIndex(isNumericOne);
  if (oneIndex === -1 || terms.length !== 2) {
    return null;
  }

  return terms[1 - oneIndex];
}

export function matchFunctionMinusOne(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const functionTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === functionHead
    && term.length === 2);

  return isNodeArray(functionTerm) ? functionTerm[1] : null;
}

export function matchExpMinusOne(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericMinusOne)) {
    return null;
  }

  const expTerm = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Power'
    && term.length === 3
    && term[1] === 'ExponentialE');

  return isNodeArray(expTerm) ? expTerm[2] : null;
}

export function matchOneMinusFunction(node: unknown, functionHead: string) {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return null;
  }

  const terms = node.slice(1);
  if (terms.length !== 2 || !terms.some(isNumericOne)) {
    return null;
  }

  const negatedFunction = terms.find((term) =>
    isNodeArray(term)
    && term[0] === 'Negate'
    && term.length === 2
    && isNodeArray(term[1])
    && term[1][0] === functionHead
    && term[1].length === 2);

  return isNodeArray(negatedFunction) && isNodeArray(negatedFunction[1])
    ? negatedFunction[1][1]
    : null;
}

function matchKnownLimitInner(
  node: unknown,
  denominator: unknown,
  target: number,
  variable: string,
): number | undefined {
  if (isNodeArray(node) && (node[0] === 'Sin' || node[0] === 'Tan') && node.length === 2) {
    const inner = node[1];
    return isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))
      ? 1
      : undefined;
  }

  const cosineInner = matchOneMinusFunction(node, 'Cos');
  if (
    cosineInner
    && isEquivalentNode(denominator, ['Power', cosineInner, 2])
    && isZeroish(evaluateNodeAt(cosineInner, target, variable))
  ) {
    return 0.5;
  }

  const expInner = matchExpMinusOne(node);
  if (
    expInner
    && isEquivalentNode(denominator, expInner)
    && isZeroish(evaluateNodeAt(expInner, target, variable))
  ) {
    return 1;
  }

  if (isNodeArray(node) && node[0] === 'Ln' && node.length === 2) {
    const inner = matchOnePlus(node[1]);
    if (inner && isEquivalentNode(denominator, inner) && isZeroish(evaluateNodeAt(inner, target, variable))) {
      return 1;
    }
  }

  const sqrtArgument = matchFunctionMinusOne(node, 'Sqrt');
  const sqrtInner = sqrtArgument ? matchOnePlus(sqrtArgument) : null;
  if (
    sqrtInner
    && isEquivalentNode(denominator, sqrtInner)
    && isZeroish(evaluateNodeAt(sqrtInner, target, variable))
  ) {
    return 0.5;
  }

  return undefined;
}

export function resolveKnownFiniteLimitRule(node: unknown, target: number, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3) {
    return undefined;
  }

  const value = matchKnownLimitInner(node[1], node[2], target, variable);
  return value === undefined
    ? undefined
    : success(value, 'rule-based-symbolic', [
        'Recognized a bounded standard finite-limit form with an inner expression tending to 0.',
        'The exact rule was applied before any capped LHopital fallback or numeric sampling.',
      ]);
}
