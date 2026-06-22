import {
  hasTarget,
  isArrayNode,
  isZeroNode,
  simplifyNode,
  type MathJson,
} from './node-helpers';
import type { ProductDecompositionResult, ProductFactor } from './types';

const TARGET_POWER_MESSAGE = 'PARAM9 supports only positive integer powers in explicit zero-product factors.';

function isZeroExpression(node: unknown) {
  if (isZeroNode(node)) {
    return true;
  }
  return isZeroNode(simplifyNode(node as MathJson));
}

function integerExponent(node: unknown) {
  return typeof node === 'number' && Number.isInteger(node) ? node : null;
}

function flattenExplicitProduct(node: MathJson): MathJson[] {
  if (isArrayNode(node) && (node[0] === 'Multiply' || node[0] === 'InvisibleOperator')) {
    return node.slice(1).flatMap((factor) => flattenExplicitProduct(factor as MathJson));
  }
  return [node];
}

function productFactorFromNode(node: MathJson, target: string): ProductDecompositionResult {
  if (isArrayNode(node) && node[0] === 'Power' && node.length === 3) {
    const exponent = integerExponent(node[2]);
    if (exponent !== null && exponent > 0) {
      const base = node[1] as MathJson;
      return {
        kind: 'ok',
        factors: [{ node: base, multiplicity: exponent, hasTarget: hasTarget(base, target) }],
      };
    }

    if (hasTarget(node, target)) {
      return { kind: 'unsupported', reason: 'target-power', message: TARGET_POWER_MESSAGE, node };
    }
  }

  return { kind: 'ok', factors: [{ node, multiplicity: 1, hasTarget: hasTarget(node, target) }] };
}

export function explicitProductNodeFromZeroEquation(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  if (isZeroExpression(json[2])) {
    return json[1] as MathJson;
  }
  if (isZeroExpression(json[1])) {
    return json[2] as MathJson;
  }
  return null;
}

export function decomposeExplicitProductFactors(
  node: MathJson,
  target: string,
): ProductDecompositionResult {
  const factors: ProductFactor[] = [];
  for (const rawFactor of flattenExplicitProduct(node)) {
    const factor = productFactorFromNode(rawFactor, target);
    if (factor.kind === 'unsupported') {
      return factor;
    }
    factors.push(...factor.factors);
  }
  return { kind: 'ok', factors };
}
