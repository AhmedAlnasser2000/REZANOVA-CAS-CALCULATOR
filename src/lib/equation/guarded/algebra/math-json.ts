import { ComputeEngine } from '@cortex-js/compute-engine';
import { normalizeAst } from '../../../symbolic-engine/normalize';
import { boxLatex, isNodeArray, termKey } from '../../../symbolic-engine/patterns';
import { evaluateRealNumericExpression } from '../../../numeric/real-numeric-eval';
import type {
  GuardedSolveRequest,
  SolveDomainConstraint,
} from '../../../../types/calculator';
import type { ExactScalar, PlaceholderLinearExpression } from './types';

const ce = new ComputeEngine();
export const PLACEHOLDER_SYMBOL = '__calcwiz_r3_u';

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
}

function normalizeScalar(numerator: number, denominator: number): ExactScalar | null {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
    return null;
  }

  if (numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }

  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: Math.abs(denominator) / divisor,
  };
}

function readExactScalar(node: unknown): ExactScalar | null {
  if (typeof node === 'number' && Number.isFinite(node) && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  if (
    node[0] === 'Rational'
    && node.length === 3
    && typeof node[1] === 'number'
    && Number.isInteger(node[1])
    && typeof node[2] === 'number'
    && Number.isInteger(node[2])
  ) {
    return normalizeScalar(node[1], node[2]);
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalar(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

function expressionHasVariable(node: unknown): boolean {
  if (typeof node === 'string') {
    return node !== 'Pi' && node !== 'ExponentialE';
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  for (const child of node.slice(1)) {
    if (expressionHasVariable(child)) {
      return true;
    }
  }

  return false;
}

function multiplyScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

function divideScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

function addScalar(left: ExactScalar, right: ExactScalar): ExactScalar | null {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

function negateScalar(value: ExactScalar): ExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

function isZeroScalar(value: ExactScalar) {
  return value.numerator === 0;
}

function buildScalarNode(value: ExactScalar): unknown {
  if (value.denominator === 1) {
    return value.numerator;
  }

  return ['Rational', value.numerator, value.denominator];
}

function simplifyNode(node: unknown): unknown {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

function buildNegatedNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode(negateScalar(scalar));
  }
  return simplifyNode(['Negate', node]);
}

function buildSumNode(left: unknown, right: unknown) {
  return simplifyNode(['Add', left, right]);
}

function buildDifferenceNode(left: unknown, right: unknown) {
  return buildSumNode(left, buildNegatedNode(right));
}

function buildStructuredNegatedNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode(negateScalar(scalar));
  }

  return ['Negate', node];
}

function buildStructuredSumNode(left: unknown, right: unknown) {
  const leftScalar = readExactScalar(left);
  if (leftScalar && isZeroScalar(leftScalar)) {
    return right;
  }

  const rightScalar = readExactScalar(right);
  if (rightScalar && isZeroScalar(rightScalar)) {
    return left;
  }

  return ['Add', left, right];
}

function buildStructuredDifferenceNode(left: unknown, right: unknown) {
  return buildStructuredSumNode(left, buildStructuredNegatedNode(right));
}

function buildProductNode(left: unknown, right: unknown) {
  return simplifyNode(['Multiply', left, right]);
}

function buildQuotientNode(numerator: unknown, denominator: unknown) {
  return simplifyNode(['Divide', numerator, denominator]);
}

function buildStructuredQuotientNode(numerator: unknown, denominator: unknown) {
  const denominatorScalar = readExactScalar(denominator);
  if (denominatorScalar && denominatorScalar.numerator === denominatorScalar.denominator) {
    return numerator;
  }

  return ['Divide', numerator, denominator];
}

function buildPowerNode(base: unknown, exponent: number) {
  return simplifyNode(['Power', base, exponent]);
}

function buildPoweredNode(base: unknown, exponent: ExactScalar) {
  const poweredNode = simplifyNode(['Power', base, buildScalarNode(exponent)]);
  if (!expressionHasVariable(poweredNode)) {
    const numeric = evaluateRealNumericExpression(poweredNode, boxLatex(poweredNode));
    if (numeric.kind === 'success') {
      const roundedInteger = Math.round(numeric.value);
      if (Math.abs(numeric.value - roundedInteger) < 1e-10) {
        return roundedInteger;
      }
    }
  }

  return poweredNode;
}

function buildScaledNode(node: unknown, scalar: ExactScalar) {
  if (isZeroScalar(scalar)) {
    return 0;
  }

  if (scalar.numerator === scalar.denominator) {
    return node;
  }

  return buildProductNode(buildScalarNode(scalar), node);
}


function containsPlaceholder(node: unknown, placeholder: string): boolean {
  if (node === placeholder) {
    return true;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).some((child) => containsPlaceholder(child, placeholder));
}

function parseLinearPlaceholder(node: unknown, placeholder: string): PlaceholderLinearExpression | null {
  const normalized = normalizeAst(node);
  if (normalized === placeholder) {
    return {
      a: { numerator: 1, denominator: 1 },
      remainder: 0,
    };
  }

  const scalar = readExactScalar(normalized);
  if (scalar) {
    return {
      a: { numerator: 0, denominator: 1 },
      remainder: buildScalarNode(scalar),
    };
  }

  if (!containsPlaceholder(normalized, placeholder)) {
    return {
      a: { numerator: 0, denominator: 1 },
      remainder: normalized,
    };
  }

  if (!isNodeArray(normalized) || normalized.length === 0) {
    return null;
  }

  if (normalized[0] === 'Negate' && normalized.length === 2) {
    const child = parseLinearPlaceholder(normalized[1], placeholder);
    if (!child) {
      return null;
    }

    return {
      a: negateScalar(child.a),
      remainder: buildNegatedNode(child.remainder),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: ExactScalar = { numerator: 0, denominator: 1 };
    let remainder: unknown = 0;

    for (const child of normalized.slice(1)) {
      const parsed = parseLinearPlaceholder(child, placeholder);
      if (!parsed) {
        return null;
      }

      const nextCoefficient = addScalar(coefficient, parsed.a);
      if (!nextCoefficient) {
        return null;
      }
      coefficient = nextCoefficient;
      remainder = buildSumNode(remainder, parsed.remainder);
    }

    return {
      a: coefficient,
      remainder,
    };
  }

  if (normalized[0] === 'Multiply') {
    let scalarFactor: ExactScalar = { numerator: 1, denominator: 1 };
    let linearChild: PlaceholderLinearExpression | null = null;

    for (const child of normalized.slice(1)) {
      const childScalar = readExactScalar(child);
      if (childScalar) {
        const nextFactor = multiplyScalar(scalarFactor, childScalar);
        if (!nextFactor) {
          return null;
        }
        scalarFactor = nextFactor;
        continue;
      }

      const parsed = parseLinearPlaceholder(child, placeholder);
      if (!parsed || linearChild) {
        return null;
      }
      linearChild = parsed;
    }

    if (!linearChild) {
      return {
        a: { numerator: 0, denominator: 1 },
        remainder: buildScalarNode(scalarFactor),
      };
    }

    const nextA = multiplyScalar(scalarFactor, linearChild.a);
    if (!nextA) {
      return null;
    }

    return {
      a: nextA,
      remainder: buildScaledNode(linearChild.remainder, scalarFactor),
    };
  }

  if (normalized[0] === 'Divide' && normalized.length === 3) {
    const denominatorScalar = readExactScalar(normalized[2]);
    if (!denominatorScalar) {
      return null;
    }

    const numeratorLinear = parseLinearPlaceholder(normalized[1], placeholder);
    if (!numeratorLinear) {
      return null;
    }

    const nextA = divideScalar(numeratorLinear.a, denominatorScalar);
    if (!nextA) {
      return null;
    }

    return {
      a: nextA,
      remainder: buildQuotientNode(numeratorLinear.remainder, buildScalarNode(denominatorScalar)),
    };
  }

  return null;
}

function replaceFirstMatch(node: unknown, targetKey: string, replacement: unknown): { node: unknown; replaced: boolean } {
  if (termKey(node) === targetKey) {
    return {
      node: replacement,
      replaced: true,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      replaced: false,
    };
  }

  const rebuilt: unknown[] = [node[0]];
  let replaced = false;
  for (const child of node.slice(1)) {
    if (replaced) {
      rebuilt.push(child);
      continue;
    }
    const next = replaceFirstMatch(child, targetKey, replacement);
    rebuilt.push(next.node);
    replaced ||= next.replaced;
  }

  return {
    node: rebuilt,
    replaced,
  };
}

function subtractConstraints(
  constraints: SolveDomainConstraint[] = [],
  existing: SolveDomainConstraint[] = [],
): SolveDomainConstraint[] {
  if (constraints.length === 0) {
    return [];
  }

  const existingKeys = new Set(existing.map((constraint) => JSON.stringify(constraint)));
  return constraints.filter((constraint) => !existingKeys.has(JSON.stringify(constraint)));
}

function getRadicalTransformDepth(request: GuardedSolveRequest) {
  return request.radicalTransformDepth ?? 0;
}

function getRepeatedClearingDepth(request: GuardedSolveRequest) {
  return request.repeatedClearingDepth ?? 0;
}

function mergePolynomialCarrierHints(
  existing: unknown[] = [],
  next: unknown[] = [],
) {
  const merged = new Map<string, unknown>();

  for (const hint of [...existing, ...next]) {
    const normalized = normalizeAst(hint);
    const key = termKey(normalized);
    if (!merged.has(key)) {
      merged.set(key, normalized);
    }
  }

  return [...merged.values()];
}

function getSolveVariable(...nodes: unknown[]) {
  const variables = new Set<string>();
  const collectVariables = (node: unknown) => {
    if (typeof node === 'string' && node !== PLACEHOLDER_SYMBOL && node !== 'Pi' && node !== 'ExponentialE') {
      variables.add(node);
      return;
    }
    if (!isNodeArray(node) || node.length === 0) {
      return;
    }
    for (const child of node.slice(1)) {
      collectVariables(child);
    }
  };

  for (const node of nodes) {
    collectVariables(node);
  }

  return variables.size === 1 ? [...variables][0] : 'x';
}

export {
  addScalar,
  buildDifferenceNode,
  buildNegatedNode,
  buildPowerNode,
  buildPoweredNode,
  buildProductNode,
  buildQuotientNode,
  buildScalarNode,
  buildScaledNode,
  buildStructuredDifferenceNode,
  buildStructuredQuotientNode,
  expressionHasVariable,
  getRadicalTransformDepth,
  getRepeatedClearingDepth,
  getSolveVariable,
  isZeroScalar,
  mergePolynomialCarrierHints,
  multiplyScalar,
  normalizeScalar,
  parseLinearPlaceholder,
  readExactScalar,
  replaceFirstMatch,
  subtractConstraints,
};
