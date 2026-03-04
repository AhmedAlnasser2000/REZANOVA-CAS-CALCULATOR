import { getTooLargeResultMessage } from './result-guard';

type RewriteResult =
  | { kind: 'ok'; node: unknown; changed: boolean }
  | { kind: 'error'; error: string };

const MAX_RESULT_MAGNITUDE = 1e150;

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function factorial(n: number) {
  let result = 1;
  for (let value = 2; value <= n; value += 1) {
    result *= value;
    if (!Number.isFinite(result) || result > MAX_RESULT_MAGNITUDE) {
      return null;
    }
  }
  return result;
}

function nCr(n: number, r: number) {
  const normalizedR = Math.min(r, n - r);
  let result = 1;
  for (let step = 1; step <= normalizedR; step += 1) {
    result = (result * (n - normalizedR + step)) / step;
    if (!Number.isFinite(result) || result > MAX_RESULT_MAGNITUDE) {
      return null;
    }
  }
  return result;
}

function nPr(n: number, r: number) {
  let result = 1;
  for (let step = 0; step < r; step += 1) {
    result *= n - step;
    if (!Number.isFinite(result) || result > MAX_RESULT_MAGNITUDE) {
      return null;
    }
  }
  return result;
}

function rewriteChildren(operator: string, children: unknown[]): RewriteResult {
  let changed = false;
  const rewrittenChildren: unknown[] = [];

  for (const child of children) {
    const rewritten = rewriteDiscreteNode(child);
    if (rewritten.kind === 'error') {
      return rewritten;
    }
    changed = changed || rewritten.changed;
    rewrittenChildren.push(rewritten.node);
  }

  return {
    kind: 'ok',
    node: [operator, ...rewrittenChildren],
    changed,
  };
}

function rewriteFactorial(argument: unknown): RewriteResult {
  const rewrittenArgument = rewriteDiscreteNode(argument);
  if (rewrittenArgument.kind === 'error') {
    return rewrittenArgument;
  }

  if (!isInteger(rewrittenArgument.node)) {
    return {
      kind: 'error',
      error: 'Factorial is defined only for non-negative integers in this milestone.',
    };
  }

  if (rewrittenArgument.node < 0) {
    return {
      kind: 'error',
      error: 'Factorial is defined only for non-negative integers in this milestone.',
    };
  }

  const factorialResult = factorial(rewrittenArgument.node);
  if (factorialResult === null) {
    return {
      kind: 'error',
      error: getTooLargeResultMessage(),
    };
  }

  return {
    kind: 'ok',
    node: factorialResult,
    changed: true,
  };
}

function rewriteCombinatorics(
  operator: 'nCr' | 'nPr',
  left: unknown,
  right: unknown,
): RewriteResult {
  const rewrittenLeft = rewriteDiscreteNode(left);
  if (rewrittenLeft.kind === 'error') {
    return rewrittenLeft;
  }

  const rewrittenRight = rewriteDiscreteNode(right);
  if (rewrittenRight.kind === 'error') {
    return rewrittenRight;
  }

  if (!isInteger(rewrittenLeft.node) || !isInteger(rewrittenRight.node)) {
    return {
      kind: 'error',
      error: `${operator} requires integer arguments in this milestone.`,
    };
  }

  if (rewrittenLeft.node < 0 || rewrittenRight.node < 0) {
    return {
      kind: 'error',
      error: `${operator} requires non-negative integers in this milestone.`,
    };
  }

  if (rewrittenRight.node > rewrittenLeft.node) {
    return {
      kind: 'error',
      error: `${operator} requires the second argument to be less than or equal to the first.`,
    };
  }

  const result =
    operator === 'nCr'
      ? nCr(rewrittenLeft.node, rewrittenRight.node)
      : nPr(rewrittenLeft.node, rewrittenRight.node);

  if (result === null) {
    return {
      kind: 'error',
      error: getTooLargeResultMessage(),
    };
  }

  return {
    kind: 'ok',
    node: result,
    changed: true,
  };
}

function rewriteDiscreteNode(node: unknown): RewriteResult {
  if (!isNodeArray(node)) {
    return {
      kind: 'ok',
      node,
      changed: false,
    };
  }

  const [operator, ...children] = node;
  if (typeof operator !== 'string') {
    return {
      kind: 'ok',
      node,
      changed: false,
    };
  }

  if (operator === 'Factorial' && children.length === 1) {
    return rewriteFactorial(children[0]);
  }

  if ((operator === 'nCr' || operator === 'nPr') && children.length === 2) {
    return rewriteCombinatorics(operator, children[0], children[1]);
  }

  if (operator === 'Negate' && children.length === 1) {
    const rewrittenChild = rewriteDiscreteNode(children[0]);
    if (rewrittenChild.kind === 'error') {
      return rewrittenChild;
    }

    if (typeof rewrittenChild.node === 'number') {
      return {
        kind: 'ok',
        node: -rewrittenChild.node,
        changed: true,
      };
    }

    return {
      kind: 'ok',
      node: ['Negate', rewrittenChild.node],
      changed: rewrittenChild.changed,
    };
  }

  return rewriteChildren(operator, children);
}

export function rewriteDiscreteOperators(node: unknown): RewriteResult {
  return rewriteDiscreteNode(node);
}
