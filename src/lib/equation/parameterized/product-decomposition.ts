import {
  hasTarget,
  isArrayNode,
  isZeroNode,
  latexForNode,
  simplifyNode,
  type MathJson,
} from './math-json';

const TARGET_POWER_MESSAGE = 'PARAM9 supports only positive integer powers in explicit zero-product factors.';

export type ProductFactor = {
  node: MathJson;
  multiplicity: number;
  hasTarget: boolean;
  latex: string;
};

export type ProductDecompositionResult =
  | { kind: 'ok'; factors: ProductFactor[] }
  | {
    kind: 'unsupported';
    reason: 'target-power';
    message: string;
    node: MathJson;
  };

function isZeroExpression(node: unknown) {
  if (isZeroNode(node)) {
    return true;
  }
  const simplified = simplifyNode(node as MathJson);
  return isZeroNode(simplified);
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
        factors: [{
          node: base,
          multiplicity: exponent,
          hasTarget: hasTarget(base, target),
          latex: latexForNode(base),
        }],
      };
    }

    if (hasTarget(node, target)) {
      return {
        kind: 'unsupported',
        reason: 'target-power',
        message: TARGET_POWER_MESSAGE,
        node,
      };
    }
  }

  return {
    kind: 'ok',
    factors: [{
      node,
      multiplicity: 1,
      hasTarget: hasTarget(node, target),
      latex: latexForNode(node),
    }],
  };
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
  const rawFactors = flattenExplicitProduct(node);
  const factors: ProductFactor[] = [];

  for (const rawFactor of rawFactors) {
    const factor = productFactorFromNode(rawFactor, target);
    if (factor.kind === 'unsupported') {
      return factor;
    }
    factors.push(...factor.factors);
  }

  return { kind: 'ok', factors };
}
