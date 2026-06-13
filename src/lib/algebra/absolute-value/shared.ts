import { ComputeEngine } from '@cortex-js/compute-engine';
import type { AbsoluteValueExactScalar } from '../../../types/calculator';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { isNodeArray, termKey } from '../../symbolic-engine/patterns';

const ce = new ComputeEngine();

export function simplifyNode(node: unknown) {
  return normalizeAst(ce.box(node as Parameters<typeof ce.box>[0]).simplify().json);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a === 0 ? 1 : a;
}

export function normalizeScalar(numerator: number, denominator: number): AbsoluteValueExactScalar | null {
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

export function readExactScalar(node: unknown): AbsoluteValueExactScalar | null {
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
    && node[2] !== 0
  ) {
    const sign = node[2] < 0 ? -1 : 1;
    const numerator = sign * node[1];
    const denominator = Math.abs(node[2]);
    return { numerator, denominator };
  }

  if (node[0] === 'Negate' && node.length === 2) {
    const child = readExactScalar(node[1]);
    return child
      ? { numerator: -child.numerator, denominator: child.denominator }
      : null;
  }

  return null;
}

export function buildScalarNode(value: AbsoluteValueExactScalar): unknown {
  if (value.denominator === 1) {
    return value.numerator;
  }

  return ['Rational', value.numerator, value.denominator];
}

export function negateNode(node: unknown) {
  const scalar = readExactScalar(node);
  if (scalar) {
    return buildScalarNode({
      numerator: -scalar.numerator,
      denominator: scalar.denominator,
    });
  }

  return simplifyNode(['Negate', node]);
}

export function negateScalar(value: AbsoluteValueExactScalar): AbsoluteValueExactScalar {
  return {
    numerator: -value.numerator,
    denominator: value.denominator,
  };
}

export function isZeroScalar(value: AbsoluteValueExactScalar) {
  return value.numerator === 0;
}

export function isUnitScalar(value: AbsoluteValueExactScalar) {
  return value.numerator === value.denominator;
}

export function multiplyScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  );
}

export function divideScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  if (right.numerator === 0) {
    return null;
  }

  return normalizeScalar(
    left.numerator * right.denominator,
    left.denominator * right.numerator,
  );
}

export function addScalar(
  left: AbsoluteValueExactScalar,
  right: AbsoluteValueExactScalar,
): AbsoluteValueExactScalar | null {
  return normalizeScalar(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function buildSumNode(left: unknown, right: unknown) {
  return simplifyNode(['Add', left, right]);
}

export function buildDifferenceNode(left: unknown, right: unknown) {
  return buildSumNode(left, negateNode(right));
}

export function buildQuotientNode(numerator: unknown, denominator: unknown) {
  return simplifyNode(['Divide', numerator, denominator]);
}

export function buildScaledNode(node: unknown, scalar: AbsoluteValueExactScalar) {
  if (isZeroScalar(scalar)) {
    return 0;
  }

  if (isUnitScalar(scalar)) {
    return node;
  }

  return simplifyNode(['Multiply', buildScalarNode(scalar), node]);
}

export function parsePositiveEvenInteger(node: unknown) {
  const scalar = readExactScalar(normalizeAst(node));
  if (!scalar || scalar.denominator !== 1 || scalar.numerator <= 0 || scalar.numerator % 2 !== 0) {
    return null;
  }

  return scalar.numerator;
}

export function stripNegation(node: unknown): unknown | null {
  const normalized = normalizeAst(node);

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    return normalized[1];
  }

  if (isNodeArray(normalized) && normalized[0] === 'Multiply' && normalized.length >= 3) {
    const children = normalized.slice(1);
    const negativeScalars = children.filter((child) => {
      const scalar = readExactScalar(child);
      return Boolean(scalar && scalar.numerator < 0);
    });

    if (negativeScalars.length !== 1) {
      return null;
    }

    const rebuiltChildren = children.flatMap((child) => {
      if (child !== negativeScalars[0]) {
        return [child];
      }

      const scalar = readExactScalar(child);
      if (!scalar) {
        return [child];
      }

      const positiveScalar = {
        numerator: Math.abs(scalar.numerator),
        denominator: scalar.denominator,
      };

      return positiveScalar.numerator === positiveScalar.denominator
        ? []
        : [buildScalarNode(positiveScalar)];
    });

    if (rebuiltChildren.length === 0) {
      return 1;
    }

    if (rebuiltChildren.length === 1) {
      return rebuiltChildren[0];
    }

    return simplifyNode(['Multiply', ...rebuiltChildren]);
  }

  return null;
}

export function containsAbsoluteValue(node: unknown): boolean {
  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  if (node[0] === 'Abs') {
    return true;
  }

  return node.slice(1).some((child) => containsAbsoluteValue(child));
}

export function detectEquationVariable(...nodes: unknown[]) {
  const variables = new Set<string>();

  const collectVariables = (node: unknown) => {
    if (typeof node === 'string') {
      if (node !== 'Pi' && node !== 'ExponentialE') {
        variables.add(node);
      }
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

export function collectEquationVariables(node: unknown, variables: Set<string> = new Set<string>()) {
  if (typeof node === 'string') {
    if (node !== 'Pi' && node !== 'ExponentialE') {
      variables.add(node);
    }
    return variables;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return variables;
  }

  for (const child of node.slice(1)) {
    collectEquationVariables(child, variables);
  }

  return variables;
}

export function containsPlaceholder(node: unknown, placeholder: string): boolean {
  if (node === placeholder) {
    return true;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return false;
  }

  return node.slice(1).some((child) => containsPlaceholder(child, placeholder));
}

export type PlaceholderLinearExpression = {
  a: AbsoluteValueExactScalar;
  remainder: unknown;
};

export function parseLinearPlaceholder(node: unknown, placeholder: string): PlaceholderLinearExpression | null {
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
      remainder: negateNode(child.remainder),
    };
  }

  if (normalized[0] === 'Add') {
    let coefficient: AbsoluteValueExactScalar = { numerator: 0, denominator: 1 };
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
    let scalarFactor: AbsoluteValueExactScalar = { numerator: 1, denominator: 1 };
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

export function replaceFirstMatch(node: unknown, targetKey: string, replacement: unknown): { node: unknown; replaced: boolean } {
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

export function replaceAllMatches(
  node: unknown,
  targetKey: string,
  replacement: unknown,
): { node: unknown; replacementCount: number } {
  if (termKey(node) === targetKey) {
    return {
      node: replacement,
      replacementCount: 1,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return {
      node,
      replacementCount: 0,
    };
  }

  let replacementCount = 0;
  const rebuilt = [
    node[0],
    ...node.slice(1).map((child) => {
      const next = replaceAllMatches(child, targetKey, replacement);
      replacementCount += next.replacementCount;
      return next.node;
    }),
  ];

  return {
    node: normalizeAst(rebuilt),
    replacementCount,
  };
}
