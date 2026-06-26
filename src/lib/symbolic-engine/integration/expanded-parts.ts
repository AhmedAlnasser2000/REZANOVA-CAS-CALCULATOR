import { backcheckAntiderivative } from '../../calculus/engine/verification';
import { expandMathJsonNode } from '../primitives/expansion/expansion';
import { dependsOnVariable, flattenMultiply, isNodeArray } from '../patterns';
import { isPolynomialExpansionCandidate } from './expanded-direct';
import { tryPartsRule } from './rules';

const EXPANDED_PARTS_LIMITS = {
  maxPower: 12,
  maxExpandedTerms: 128,
  maxNodeCount: 1200,
};

function productFromFactors(factors: unknown[]) {
  return factors.length === 1 ? factors[0] : ['Multiply', ...factors];
}

function expandPolynomialFactor(factor: unknown, variable: string) {
  if (
    !dependsOnVariable(factor, variable)
    || !isPolynomialExpansionCandidate(factor, variable)
  ) {
    return { kind: 'unchanged' as const, node: factor };
  }

  const expanded = expandMathJsonNode(factor, EXPANDED_PARTS_LIMITS);
  if (expanded.kind !== 'ok') {
    return { kind: 'unsupported' as const };
  }

  return expanded.changed
    ? { kind: 'changed' as const, node: expanded.node }
    : { kind: 'unchanged' as const, node: factor };
}

export function tryExpandedPartsRule(node: unknown, variable: string) {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const expandedFactors: unknown[] = [];
  let changed = false;
  for (const factor of flattenMultiply(node)) {
    const expanded = expandPolynomialFactor(factor, variable);
    if (expanded.kind === 'unsupported') {
      return undefined;
    }
    changed = changed || expanded.kind === 'changed';
    expandedFactors.push(expanded.node);
  }

  if (!changed) {
    return undefined;
  }

  const solved = tryPartsRule(productFromFactors(expandedFactors), variable);
  if (!solved) {
    return undefined;
  }

  const verification = backcheckAntiderivative({
    antiderivativeLatex: solved,
    integrand: node,
    variable,
  });

  return verification.status === 'verified-exact' ? solved : undefined;
}
