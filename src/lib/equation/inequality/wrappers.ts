import { allRealInequalitySet, emptyInequalitySet } from '../../algebra/inequality-core';
import { readExactScalarNode, multiplyExactScalars } from '../../algebra/polynomial-core';
import {
  dedupeStrings,
  isNodeArray,
  latexForNode,
  numericValueForNode,
  reverseRelation,
  simplifyNode,
} from './relation';
import {
  combineFiniteResults,
  exactScalarToNode,
  finiteSuccess,
} from './finite';
import {
  ROOT_EPSILON,
  type FiniteInequalityResult,
  type InequalityRelation,
} from './types';

function scalarSign(node: unknown) {
  const numeric = numericValueForNode(node);
  if (numeric === null) {
    return null;
  }
  if (Math.abs(numeric) <= ROOT_EPSILON) {
    return 0;
  }
  return numeric > 0 ? 1 : -1;
}

function negateNode(node: unknown) {
  return simplifyNode(['Negate', node]);
}

type FiniteSolver = (input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
}) => FiniteInequalityResult | null;

function absoluteInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
  solveFiniteNode: FiniteSolver;
}): FiniteInequalityResult | null {
  const normalized = normalizeUnaryComparison(input, 'Abs');
  if (!normalized) {
    return null;
  }
  const sign = scalarSign(normalized.bound);
  if (sign === null) {
    return null;
  }
  const variable = input.target;
  if (sign < 0) {
    const set = normalized.relation === 'Greater' || normalized.relation === 'GreaterEqual'
      ? allRealInequalitySet(variable)
      : emptyInequalitySet(variable);
    return finiteSuccess({
      set,
      route: 'absolute-value',
      lines: ['Resolved a textbook absolute-value inequality with a negative bound.'],
    });
  }

  const nextDepth = input.depth - 1;
  const inner = normalized.inner;
  const bound = normalized.bound;
  const negativeBound = negateNode(bound);
  if (normalized.relation === 'Less' || normalized.relation === 'LessEqual') {
    const upper = input.solveFiniteNode({
      left: inner,
      right: bound,
      relation: normalized.relation,
      target: variable,
      depth: nextDepth,
    });
    const lower = input.solveFiniteNode({
      left: inner,
      right: negativeBound,
      relation: reverseRelation(normalized.relation),
      target: variable,
      depth: nextDepth,
    });
    return upper && lower
      ? combineFiniteResults('intersection', 'absolute-value', [upper, lower], [
        'Split a textbook absolute-value inequality into matching upper/lower bounds.',
      ])
      : null;
  }

  const upper = input.solveFiniteNode({
    left: inner,
    right: bound,
    relation: normalized.relation,
    target: variable,
    depth: nextDepth,
  });
  const lower = input.solveFiniteNode({
    left: inner,
    right: negativeBound,
    relation: reverseRelation(normalized.relation),
    target: variable,
    depth: nextDepth,
  });
  return upper && lower
    ? combineFiniteResults('union', 'absolute-value', [upper, lower], [
      'Split a textbook absolute-value inequality into outer formula branches.',
    ])
    : null;
}

function squareNode(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (scalar) {
    return exactScalarToNode(multiplyExactScalars(scalar, scalar));
  }
  return simplifyNode(['Power', node, 2]);
}

function radicalInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
  solveFiniteNode: FiniteSolver;
}): FiniteInequalityResult | null {
  const normalized = normalizeUnaryComparison(input, 'Sqrt');
  if (!normalized) {
    return null;
  }
  const sign = scalarSign(normalized.bound);
  if (sign === null) {
    return null;
  }

  const domain = input.solveFiniteNode({
    left: normalized.inner,
    right: 0,
    relation: 'GreaterEqual',
    target: input.target,
    depth: input.depth - 1,
  });
  if (!domain) {
    return null;
  }

  const boundSquare = squareNode(normalized.bound);
  let comparison: FiniteInequalityResult | null;
  switch (normalized.relation) {
    case 'Less':
      comparison = sign <= 0
        ? finiteSuccess({ set: emptyInequalitySet(input.target), route: 'radical', lines: ['Square-root values are nonnegative.'] })
        : input.solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'Less',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'LessEqual':
      comparison = sign < 0
        ? finiteSuccess({ set: emptyInequalitySet(input.target), route: 'radical', lines: ['Square-root values are nonnegative.'] })
        : input.solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'LessEqual',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'Greater':
      comparison = sign < 0
        ? domain
        : input.solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: sign === 0 ? 'Greater' : 'Greater',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
    case 'GreaterEqual':
      comparison = sign <= 0
        ? domain
        : input.solveFiniteNode({
          left: normalized.inner,
          right: boundSquare,
          relation: 'GreaterEqual',
          target: input.target,
          depth: input.depth - 1,
        });
      break;
  }

  if (!comparison) {
    return null;
  }

  const combined = combineFiniteResults('intersection', 'radical', [domain, comparison], [
    'Inverted a guarded square-root inequality and preserved the real radicand domain.',
  ]);
  return {
    ...combined,
    validWhenLatex: dedupeStrings([
      ...combined.validWhenLatex,
      `${latexForNode(normalized.inner)}\\ge0`,
    ]),
  };
}

function logExpInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  depth: number;
  solveFiniteNode: FiniteSolver;
}): FiniteInequalityResult | null {
  const log = normalizeLogComparison(input);
  if (log) {
    const domain = input.solveFiniteNode({
      left: log.inner,
      right: 0,
      relation: 'Greater',
      target: input.target,
      depth: input.depth - 1,
    });
    const comparison = input.solveFiniteNode({
      left: log.inner,
      right: log.bound,
      relation: log.relation,
      target: input.target,
      depth: input.depth - 1,
    });
    if (!domain || !comparison) {
      return null;
    }
    const combined = combineFiniteResults('intersection', 'logarithm', [domain, comparison], [
      'Inverted a monotone logarithm inequality and preserved the positive argument domain.',
    ]);
    return {
      ...combined,
      validWhenLatex: dedupeStrings([
        ...combined.validWhenLatex,
        `${latexForNode(log.inner)}>0`,
        ...(log.baseLatex ? [`${log.baseLatex}>0`, `${log.baseLatex}\\ne1`] : []),
      ]),
    };
  }

  const exp = normalizeExpComparison(input);
  if (!exp) {
    return null;
  }
  const sign = scalarSign(exp.bound);
  if (sign === null) {
    return null;
  }
  if (sign <= 0) {
    const set = exp.relation === 'Greater' || exp.relation === 'GreaterEqual'
      ? allRealInequalitySet(input.target)
      : emptyInequalitySet(input.target);
    return finiteSuccess({
      set,
      route: 'exponential',
      lines: ['Resolved an exponential inequality against a nonpositive bound.'],
    });
  }
  const comparison = input.solveFiniteNode({
    left: exp.inner,
    right: ['Ln', exp.bound],
    relation: exp.relation,
    target: input.target,
    depth: input.depth - 1,
  });
  return comparison
    ? finiteSuccess({
      ...comparison,
      route: 'exponential',
      lines: [
        'Inverted a monotone exponential inequality.',
        ...comparison.lines,
      ],
    })
    : null;
}

function normalizeUnaryComparison(
  input: {
    left: unknown;
    right: unknown;
    relation: InequalityRelation;
  },
  operator: 'Abs' | 'Sqrt',
): { inner: unknown; bound: unknown; relation: InequalityRelation } | null {
  if (isNodeArray(input.left) && input.left[0] === operator && input.left.length === 2 && numericValueForNode(input.right) !== null) {
    return { inner: input.left[1], bound: input.right, relation: input.relation };
  }
  if (isNodeArray(input.right) && input.right[0] === operator && input.right.length === 2 && numericValueForNode(input.left) !== null) {
    return { inner: input.right[1], bound: input.left, relation: reverseRelation(input.relation) };
  }
  return null;
}

function normalizeLogComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { inner: unknown; bound: unknown; relation: InequalityRelation; baseLatex?: string } | null {
  const readLog = (node: unknown) => {
    if (!isNodeArray(node)) {
      return null;
    }
    if (node[0] === 'Ln' && node.length === 2) {
      return { inner: node[1], base: Math.E, baseLatex: undefined };
    }
    if (node[0] === 'Log' && node.length >= 2) {
      const baseNode = node.length >= 3 ? node[2] : 10;
      const base = numericValueForNode(baseNode);
      return base && base > 0 && Math.abs(base - 1) > ROOT_EPSILON
        ? { inner: node[1], base, baseLatex: latexForNode(baseNode) || `${base}` }
        : null;
    }
    return null;
  };

  const leftLog = readLog(input.left);
  if (leftLog && numericValueForNode(input.right) !== null) {
    const bound = leftLog.base === Math.E
      ? ['Power', 'ExponentialE', input.right]
      : ['Power', leftLog.base, input.right];
    return {
      inner: leftLog.inner,
      bound,
      relation: leftLog.base > 1 ? input.relation : reverseRelation(input.relation),
      baseLatex: leftLog.baseLatex,
    };
  }

  const rightLog = readLog(input.right);
  if (rightLog && numericValueForNode(input.left) !== null) {
    const bound = rightLog.base === Math.E
      ? ['Power', 'ExponentialE', input.left]
      : ['Power', rightLog.base, input.left];
    const relation = reverseRelation(input.relation);
    return {
      inner: rightLog.inner,
      bound,
      relation: rightLog.base > 1 ? relation : reverseRelation(relation),
      baseLatex: rightLog.baseLatex,
    };
  }
  return null;
}

function normalizeExpComparison(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
}): { inner: unknown; bound: unknown; relation: InequalityRelation } | null {
  const readExp = (node: unknown) => (
    isNodeArray(node) && node[0] === 'Power' && node[1] === 'ExponentialE' && node.length === 3
      ? node[2]
      : null
  );

  const leftExp = readExp(input.left);
  if (leftExp && numericValueForNode(input.right) !== null) {
    return { inner: leftExp, bound: input.right, relation: input.relation };
  }
  const rightExp = readExp(input.right);
  if (rightExp && numericValueForNode(input.left) !== null) {
    return { inner: rightExp, bound: input.left, relation: reverseRelation(input.relation) };
  }
  return null;
}


export { absoluteInequality, logExpInequality, radicalInequality };
