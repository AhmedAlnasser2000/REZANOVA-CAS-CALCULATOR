import { normalizeAst } from '../../normalize';
import {
  buildTermNode,
  compactRepeatedProductFactors,
  decomposeProduct,
  isNodeArray,
  termKey,
  type FactorMap,
} from '../../patterns';

export type ExpansionUnsupportedReason =
  | 'term-limit'
  | 'node-limit'
  | 'power-limit'
  | 'engine-error';

export type MathJsonExpansionOptions = {
  maxPower?: number;
  maxExpandedTerms?: number;
  maxNodeCount?: number;
};

export type MathJsonExpansionOk = {
  kind: 'ok';
  node: unknown;
  changed: boolean;
  expandedTerms: number;
  nodeCount: number;
};

export type MathJsonExpansionUnsupported = {
  kind: 'unsupported';
  reason: ExpansionUnsupportedReason;
  node: unknown;
  changed: false;
  expandedTerms: number;
  nodeCount: number;
  message: string;
};

export type MathJsonExpansionResult = MathJsonExpansionOk | MathJsonExpansionUnsupported;

type ExpansionLimits = Required<MathJsonExpansionOptions>;
type InternalExpansionResult =
  | { kind: 'ok'; node: unknown }
  | { kind: 'unsupported'; reason: ExpansionUnsupportedReason; node: unknown; message: string };

const DEFAULT_LIMITS: ExpansionLimits = {
  maxPower: 12,
  maxExpandedTerms: 256,
  maxNodeCount: 2000,
};

function normalizeLimits(options: MathJsonExpansionOptions = {}): ExpansionLimits {
  return {
    maxPower: Math.max(0, Math.floor(options.maxPower ?? DEFAULT_LIMITS.maxPower)),
    maxExpandedTerms: Math.max(1, Math.floor(options.maxExpandedTerms ?? DEFAULT_LIMITS.maxExpandedTerms)),
    maxNodeCount: Math.max(1, Math.floor(options.maxNodeCount ?? DEFAULT_LIMITS.maxNodeCount)),
  };
}

function countNodes(node: unknown): number {
  if (!isNodeArray(node)) {
    return 1;
  }

  return 1 + node.slice(1).reduce<number>((sum, child) => sum + countNodes(child), 0);
}

function countExpandedTerms(node: unknown): number {
  const normalized = normalizeAst(node);
  return isNodeArray(normalized) && normalized[0] === 'Add'
    ? normalized.length - 1
    : 1;
}

function unsupported(
  reason: ExpansionUnsupportedReason,
  node: unknown,
  message: string,
): InternalExpansionResult {
  return {
    kind: 'unsupported',
    reason,
    node: normalizeAst(node),
    message,
  };
}

function checkLimits(node: unknown, limits: ExpansionLimits): InternalExpansionResult | null {
  const normalized = normalizeAst(node);
  const nodeCount = countNodes(normalized);
  if (nodeCount > limits.maxNodeCount) {
    return unsupported(
      'node-limit',
      normalized,
      `Expansion produced ${nodeCount} nodes, exceeding the ${limits.maxNodeCount} node limit.`,
    );
  }

  const expandedTerms = countExpandedTerms(normalized);
  if (expandedTerms > limits.maxExpandedTerms) {
    return unsupported(
      'term-limit',
      normalized,
      `Expansion produced ${expandedTerms} terms, exceeding the ${limits.maxExpandedTerms} term limit.`,
    );
  }

  return null;
}

function factorMapKey(factors: FactorMap): string {
  return JSON.stringify(
    [...factors.values()]
      .map(({ node, exponent }) => [termKey(node), exponent] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function combineAdd(terms: unknown[]): unknown {
  if (terms.length === 0) {
    return 0;
  }

  const groups = new Map<string, { coefficient: number; factors: FactorMap }>();
  const unmerged: unknown[] = [];

  for (const term of terms) {
    const normalized = normalizeAst(term);
    const flattened = isNodeArray(normalized) && normalized[0] === 'Add'
      ? normalized.slice(1)
      : [normalized];

    for (const child of flattened) {
      const decomposed = decomposeProduct(child);
      if (!decomposed) {
        unmerged.push(child);
        continue;
      }

      const key = factorMapKey(decomposed.factors);
      const existing = groups.get(key);
      if (existing) {
        existing.coefficient += decomposed.coefficient;
      } else {
        groups.set(key, {
          coefficient: decomposed.coefficient,
          factors: decomposed.factors,
        });
      }
    }
  }

  const mergedTerms = [...groups.values()]
    .filter(({ coefficient }) => coefficient !== 0)
    .map(({ coefficient, factors }) => buildTermNode(coefficient, factors));

  const nodes = [...mergedTerms, ...unmerged];
  if (nodes.length === 0) {
    return 0;
  }

  return normalizeAst(nodes.length === 1 ? nodes[0] : ['Add', ...nodes]);
}

function combineMultiply(factors: unknown[]): unknown {
  if (factors.length === 0) {
    return 1;
  }

  const flattened = factors.flatMap((factor) => {
    const normalized = normalizeAst(factor);
    return isNodeArray(normalized) && normalized[0] === 'Multiply'
      ? normalized.slice(1)
      : [normalized];
  });

  if (flattened.length === 0) {
    return 1;
  }

  const product = normalizeAst(flattened.length === 1 ? flattened[0] : ['Multiply', ...flattened]);
  return normalizeAst(compactRepeatedProductFactors(product));
}

function negateNode(node: unknown): unknown {
  const normalized = normalizeAst(node);
  if (typeof normalized === 'number') {
    return -normalized;
  }

  if (isNodeArray(normalized) && normalized[0] === 'Add') {
    return combineAdd(normalized.slice(1).map(negateNode));
  }

  if (isNodeArray(normalized) && normalized[0] === 'Negate' && normalized.length === 2) {
    return normalized[1];
  }

  return normalizeAst(['Negate', normalized]);
}

function multiplyExpandedNodes(factors: unknown[], limits: ExpansionLimits): InternalExpansionResult {
  const choiceSets: unknown[][] = [];
  let combinationCount = 1;

  for (const factor of factors) {
    const expanded = expandInternal(factor, limits);
    if (expanded.kind === 'unsupported') {
      return expanded;
    }

    const normalized = normalizeAst(expanded.node);
    const choices = isNodeArray(normalized) && normalized[0] === 'Add'
      ? normalized.slice(1)
      : [normalized];

    combinationCount *= Math.max(1, choices.length);
    if (combinationCount > limits.maxExpandedTerms) {
      return unsupported(
        'term-limit',
        combineMultiply(factors),
        `Expansion would produce ${combinationCount} terms, exceeding the ${limits.maxExpandedTerms} term limit.`,
      );
    }

    choiceSets.push(choices);
  }

  let products: unknown[][] = [[]];
  for (const choices of choiceSets) {
    const nextProducts: unknown[][] = [];
    for (const product of products) {
      for (const choice of choices) {
        nextProducts.push([...product, choice]);
      }
    }
    products = nextProducts;
  }

  const expanded = combineAdd(products.map(combineMultiply));
  const limitHit = checkLimits(expanded, limits);
  return limitHit ?? { kind: 'ok', node: expanded };
}

function expandPower(base: unknown, exponent: number, limits: ExpansionLimits): InternalExpansionResult {
  if (exponent > limits.maxPower) {
    return unsupported(
      'power-limit',
      normalizeAst(['Power', base, exponent]),
      `Expansion power ${exponent} exceeds the ${limits.maxPower} power limit.`,
    );
  }

  if (exponent === 0) {
    return { kind: 'ok', node: 1 };
  }

  const expandedBase = expandInternal(base, limits);
  if (expandedBase.kind === 'unsupported') {
    return expandedBase;
  }

  if (exponent === 1) {
    return expandedBase;
  }

  const baseTermCount = countExpandedTerms(expandedBase.node);
  const estimatedTerms = baseTermCount ** exponent;
  if (estimatedTerms > limits.maxExpandedTerms) {
    return unsupported(
      'term-limit',
      normalizeAst(['Power', expandedBase.node, exponent]),
      `Expansion would produce up to ${estimatedTerms} terms, exceeding the ${limits.maxExpandedTerms} term limit.`,
    );
  }

  let current = expandedBase.node;
  for (let power = 1; power < exponent; power += 1) {
    const multiplied = multiplyExpandedNodes([current, expandedBase.node], limits);
    if (multiplied.kind === 'unsupported') {
      return multiplied;
    }
    current = multiplied.node;
  }

  return { kind: 'ok', node: current };
}

function expandInternal(node: unknown, limits: ExpansionLimits): InternalExpansionResult {
  const normalized = normalizeAst(node);
  if (!isNodeArray(normalized) || normalized.length === 0) {
    return { kind: 'ok', node: normalized };
  }

  const [operator, ...children] = normalized;
  if (operator === 'Add') {
    const expandedChildren: unknown[] = [];
    for (const child of children) {
      const expanded = expandInternal(child, limits);
      if (expanded.kind === 'unsupported') {
        return expanded;
      }
      expandedChildren.push(expanded.node);
    }

    const expanded = combineAdd(expandedChildren);
    const limitHit = checkLimits(expanded, limits);
    return limitHit ?? { kind: 'ok', node: expanded };
  }

  if (operator === 'Subtract') {
    if (children.length === 0) {
      return { kind: 'ok', node: 0 };
    }

    const expandedFirst = expandInternal(children[0], limits);
    if (expandedFirst.kind === 'unsupported') {
      return expandedFirst;
    }

    const expandedTerms = [expandedFirst.node];
    for (const child of children.slice(1)) {
      const expanded = expandInternal(child, limits);
      if (expanded.kind === 'unsupported') {
        return expanded;
      }
      expandedTerms.push(negateNode(expanded.node));
    }

    const expanded = combineAdd(expandedTerms);
    const limitHit = checkLimits(expanded, limits);
    return limitHit ?? { kind: 'ok', node: expanded };
  }

  if (operator === 'Negate' && children.length === 1) {
    const expanded = expandInternal(children[0], limits);
    if (expanded.kind === 'unsupported') {
      return expanded;
    }

    const negated = negateNode(expanded.node);
    const limitHit = checkLimits(negated, limits);
    return limitHit ?? { kind: 'ok', node: negated };
  }

  if (operator === 'Multiply' || operator === 'InvisibleOperator') {
    return multiplyExpandedNodes(children, limits);
  }

  if (operator === 'Power' && children.length === 2) {
    const [base, exponent] = children;
    if (typeof exponent === 'number' && Number.isInteger(exponent) && exponent >= 0) {
      return expandPower(base, exponent, limits);
    }

    return { kind: 'ok', node: normalizeAst(['Power', normalizeAst(base), exponent]) };
  }

  if (operator === 'Divide' && children.length === 2) {
    const numerator = expandInternal(children[0], limits);
    if (numerator.kind === 'unsupported') {
      return numerator;
    }

    const rebuilt = normalizeAst(['Divide', numerator.node, normalizeAst(children[1])]);
    const limitHit = checkLimits(rebuilt, limits);
    return limitHit ?? { kind: 'ok', node: rebuilt };
  }

  return { kind: 'ok', node: normalizeAst([operator, ...children.map(normalizeAst)]) };
}

export function expandMathJsonNode(
  node: unknown,
  options: MathJsonExpansionOptions = {},
): MathJsonExpansionResult {
  try {
    const limits = normalizeLimits(options);
    const original = normalizeAst(node);
    const expanded = expandInternal(original, limits);
    const normalizedNode = normalizeAst(expanded.node);
    const expandedTerms = countExpandedTerms(normalizedNode);
    const nodeCount = countNodes(normalizedNode);

    if (expanded.kind === 'unsupported') {
      return {
        kind: 'unsupported',
        reason: expanded.reason,
        node: normalizedNode,
        changed: false,
        expandedTerms,
        nodeCount,
        message: expanded.message,
      };
    }

    const limitHit = checkLimits(normalizedNode, limits);
    if (limitHit?.kind === 'unsupported') {
      return {
        kind: 'unsupported',
        reason: limitHit.reason,
        node: normalizeAst(limitHit.node),
        changed: false,
        expandedTerms: countExpandedTerms(limitHit.node),
        nodeCount: countNodes(limitHit.node),
        message: limitHit.message,
      };
    }

    return {
      kind: 'ok',
      node: normalizedNode,
      changed: termKey(normalizedNode) !== termKey(original),
      expandedTerms,
      nodeCount,
    };
  } catch (error) {
    const fallback = normalizeAst(node);
    return {
      kind: 'unsupported',
      reason: 'engine-error',
      node: fallback,
      changed: false,
      expandedTerms: countExpandedTerms(fallback),
      nodeCount: countNodes(fallback),
      message: error instanceof Error
        ? error.message
        : 'Expansion failed unexpectedly.',
    };
  }
}

export function expandMathJsonNodeOrOriginal(
  node: unknown,
  options: MathJsonExpansionOptions = {},
): unknown {
  const expanded = expandMathJsonNode(node, options);
  return expanded.kind === 'ok' ? expanded.node : normalizeAst(node);
}
