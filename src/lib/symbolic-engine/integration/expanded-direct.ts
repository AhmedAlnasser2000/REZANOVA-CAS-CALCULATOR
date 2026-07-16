import {
  resolveAntiderivativeRule,
  resolveAntiderivativeRuleExpression,
} from '../../calculus/engine/antiderivative-rules';
import { backcheckAntiderivative } from '../../calculus/engine/verification';
import { expandMathJsonNode } from '../primitives/expansion/expansion';
import { dependsOnVariable, isNodeArray } from '../patterns';
import { numericNodeValue } from './node-helpers';

const EXPANDED_DIRECT_LIMITS = {
  maxPower: 12,
  maxExpandedTerms: 128,
  maxNodeCount: 1200,
};

const UNSUPPORTED_ALGEBRAIC_HEADS = new Set([
  'Abs',
  'AbsoluteValue',
  'Divide',
  'Sqrt',
  'Root',
]);

const TRANSCENDENTAL_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Arcsin',
  'Arccos',
  'Arctan',
  'Sinh',
  'Cosh',
  'Tanh',
  'Arsinh',
  'Arcosh',
  'Artanh',
  'Ln',
  'Log',
]);

function isNonnegativeIntegerPower(node: unknown) {
  const exponent = numericNodeValue(node);
  return exponent !== undefined && Number.isInteger(exponent) && exponent >= 0;
}

export function isPolynomialExpansionCandidate(node: unknown, variable: string): boolean {
  if (!isNodeArray(node) || node.length === 0 || typeof node[0] !== 'string') {
    return true;
  }

  const [head, ...children] = node;
  if (UNSUPPORTED_ALGEBRAIC_HEADS.has(head) || TRANSCENDENTAL_HEADS.has(head)) {
    return false;
  }

  if (!dependsOnVariable(node, variable)) {
    return true;
  }

  if (head === 'Add' || head === 'Subtract' || head === 'Multiply' || head === 'InvisibleOperator') {
    return children.every((child) => isPolynomialExpansionCandidate(child, variable));
  }

  if (head === 'Negate' && children.length === 1) {
    return isPolynomialExpansionCandidate(children[0], variable);
  }

  if (head === 'Power' && children.length === 2) {
    const [base, exponent] = children;
    return isNonnegativeIntegerPower(exponent)
      && isPolynomialExpansionCandidate(base, variable);
  }

  return false;
}

export function tryExpandedDirectRule(node: unknown, variable: string) {
  if (
    !dependsOnVariable(node, variable)
    || !isPolynomialExpansionCandidate(node, variable)
  ) {
    return undefined;
  }

  const expanded = expandMathJsonNode(node, EXPANDED_DIRECT_LIMITS);
  if (expanded.kind !== 'ok' || !expanded.changed) {
    return undefined;
  }

  const integrated = resolveAntiderivativeRule(expanded.node, variable);
  if (!integrated) {
    return undefined;
  }

  const verification = backcheckAntiderivative({
    antiderivativeLatex: integrated,
    integrand: node,
    variable,
  });

  if (verification.status !== 'verified-exact') {
    return undefined;
  }
  const expression = resolveAntiderivativeRuleExpression(expanded.node, variable);
  return {
    exactLatex: integrated,
    verification,
    antiderivativeExpression: expression,
  };
}
