import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  isHuge,
  isNonZeroish,
  isZeroish,
  evaluateNodeAt,
} from '../symbolic-engine/limits/evaluation';
import { parseNaturalLimitRequest, type NaturalLimitRequest } from './limit-request';
import { resolveInfiniteLimitHeuristic } from './engine/limit-heuristics';
import {
  hasFiniteRecursiveLeadingTermCandidate,
  hasFiniteSqueezeOscillationCandidate,
  hasInfiniteScaleCandidate,
  resolveInfiniteExactLocalAlgebraLimit,
} from '../symbolic-engine/limits';
import {
  hasFiniteIndeterminateTransformCandidate,
  hasInfiniteIndeterminateTransformCandidate,
} from '../symbolic-engine/limits/indeterminate-transforms';

const ce = new ComputeEngine();
const MAX_LIMIT_ROUTE_NODES = 180;
const MAX_LIMIT_ROUTE_DEPTH = 32;

export type LimitRouteKind =
  | 'direct-substitution'
  | 'removable-rational'
  | 'local-equivalent'
  | 'finite-pole'
  | 'exact-local-algebra'
  | 'indeterminate-transform'
  | 'infinity-asymptotic'
  | 'lhospital-candidate'
  | 'taylor-series-candidate'
  | 'squeeze-oscillation'
  | 'unsupported'
  | 'malformed'
  | 'too-complex';

export type LimitRouteClassification = {
  kind: LimitRouteKind;
  reason: string;
  request?: NaturalLimitRequest;
  nodeCount?: number;
  maxDepth?: number;
};

function isNodeArray(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

function profileNode(node: unknown): { nodeCount: number; maxDepth: number } {
  if (!isNodeArray(node)) {
    return { nodeCount: 1, maxDepth: 1 };
  }

  let nodeCount = 1;
  let maxDepth = 1;
  for (const child of node.slice(1)) {
    const childProfile = profileNode(child);
    nodeCount += childProfile.nodeCount;
    maxDepth = Math.max(maxDepth, childProfile.maxDepth + 1);
  }
  return { nodeCount, maxDepth };
}

function containsErrorNode(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  return node[0] === 'Error' || node.slice(1).some(containsErrorNode);
}

function containsHead(node: unknown, heads: Set<string>): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  return (typeof node[0] === 'string' && heads.has(node[0]))
    || node.slice(1).some((child) => containsHead(child, heads));
}

function dependsOnVariable(node: unknown, variable: string): boolean {
  if (node === variable) {
    return true;
  }
  if (!isNodeArray(node)) {
    return false;
  }

  return node.slice(1).some((child) => dependsOnVariable(child, variable));
}

function containsTranscendentalLike(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (typeof node[0] === 'string' && ['Sin', 'Cos', 'Tan', 'Ln', 'Log', 'Sqrt', 'Exp'].includes(node[0])) {
    return true;
  }
  if (node[0] === 'Power' && node[1] === 'ExponentialE') {
    return true;
  }

  return node.slice(1).some(containsTranscendentalLike);
}

function containsFiniteExactLocalAlgebraCandidate(node: unknown): boolean {
  if (!isNodeArray(node) || node[0] !== 'Add') {
    return false;
  }

  return node.slice(1).some((term) =>
    isNodeArray(term)
    && (
      term[0] === 'Divide'
      || (term[0] === 'Negate' && isNodeArray(term[1]) && term[1][0] === 'Divide')
    ));
}

function isPolynomialLike(node: unknown, variable: string): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node);
  }
  if (typeof node === 'string') {
    return node === variable || node === 'Pi' || node === 'ExponentialE';
  }
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return false;
  }
  if (!['Add', 'Multiply', 'Negate', 'Subtract', 'Power'].includes(node[0])) {
    return false;
  }
  if (node[0] === 'Power' && node.length === 3) {
    return isPolynomialLike(node[1], variable)
      && typeof node[2] === 'number'
      && Number.isInteger(node[2])
      && node[2] >= 0;
  }
  return node.slice(1).every((child) => isPolynomialLike(child, variable));
}

function classifyFiniteDivide(node: unknown, request: NaturalLimitRequest): LimitRouteClassification | null {
  if (!isNodeArray(node) || node[0] !== 'Divide' || node.length !== 3 || request.target.kind !== 'finite') {
    return null;
  }

  const numerator = node[1];
  const denominator = node[2];
  const numeratorValue = evaluateNodeAt(numerator, request.target.value, request.variable);
  const denominatorValue = evaluateNodeAt(denominator, request.target.value, request.variable);

  if (isNonZeroish(numeratorValue) && isZeroish(denominatorValue)) {
    return {
      kind: 'finite-pole',
      reason: 'The denominator tends to zero while the numerator stays nonzero.',
      request,
    };
  }

  const zeroOverZero = isZeroish(numeratorValue) && isZeroish(denominatorValue);
  const infinityOverInfinity = isHuge(numeratorValue) && isHuge(denominatorValue);
  if (!zeroOverZero && !infinityOverInfinity) {
    return null;
  }

  if (isPolynomialLike(numerator, request.variable) && isPolynomialLike(denominator, request.variable)) {
    return {
      kind: 'removable-rational',
      reason: 'A rational expression has an indeterminate form that may cancel near the target.',
      request,
    };
  }

  if (containsTranscendentalLike(node)) {
    const hasAdditiveCancellation = containsHead(numerator, new Set(['Add', 'Subtract']));
    return {
      kind: hasAdditiveCancellation ? 'taylor-series-candidate' : 'local-equivalent',
      reason: hasAdditiveCancellation
        ? 'A transcendental numerator has additive cancellation, so a Taylor/series route is a good candidate.'
        : 'A standard local equivalent can likely compare numerator and denominator orders.',
      request,
    };
  }

  return {
    kind: 'lhospital-candidate',
    reason: 'The quotient has an indeterminate form and no simpler route was identified.',
    request,
  };
}

function classifyFiniteNode(node: unknown, request: NaturalLimitRequest): LimitRouteClassification {
  if (request.target.kind !== 'finite') {
    return { kind: 'unsupported', reason: 'Finite classifier received an infinite-target request.', request };
  }

  const direct = evaluateNodeAt(node, request.target.value, request.variable);
  if (isNonZeroish(direct) || isZeroish(direct)) {
    return {
      kind: 'direct-substitution',
      reason: 'Direct substitution produced a finite target value.',
      request,
    };
  }

  const divided = classifyFiniteDivide(node, request);
  if (divided) {
    return divided;
  }

  if (containsFiniteExactLocalAlgebraCandidate(node)) {
    return {
      kind: 'exact-local-algebra',
      reason: 'A local algebra rewrite may combine terms before comparing leading behavior.',
      request,
    };
  }

  if (hasFiniteIndeterminateTransformCandidate(node, request.target.value, request.variable, request.target.direction)) {
    return {
      kind: 'indeterminate-transform',
      reason: 'A safe indeterminate-form rewrite can turn the expression into a supported sub-limit.',
      request,
    };
  }

  if (hasFiniteSqueezeOscillationCandidate(node, request.target.value, request.variable, request.target.direction)) {
    return {
      kind: 'squeeze-oscillation',
      reason: 'A bounded oscillation or squeeze-theorem pattern is present near the target.',
      request,
    };
  }

  if (hasFiniteRecursiveLeadingTermCandidate(node, request.target.value, request.variable, request.target.direction)) {
    return {
      kind: 'local-equivalent',
      reason: 'A recursive finite leading-term route can compare local orders with target-free coefficients.',
      request,
    };
  }

  return {
    kind: 'unsupported',
    reason: 'No supported finite-limit route matched this request.',
    request,
  };
}

function classifyInfiniteNode(node: unknown, request: NaturalLimitRequest): LimitRouteClassification {
  if (request.target.kind !== 'infinite') {
    return { kind: 'unsupported', reason: 'Infinity classifier received a finite-target request.', request };
  }

  const heuristic = resolveInfiniteLimitHeuristic(node, request.variable, request.target.targetKind);
  if (heuristic.kind === 'success') {
    return {
      kind: 'infinity-asymptotic',
      reason: 'Dominant end behavior resolves the infinite-target limit.',
      request,
    };
  }

  const exactLocalAlgebra = resolveInfiniteExactLocalAlgebraLimit(node, request.target.targetKind, request.variable);
  if (exactLocalAlgebra) {
    return {
      kind: 'exact-local-algebra',
      reason: 'An exact algebra rewrite resolves the infinite-target expression before numeric sampling.',
      request,
    };
  }

  if (hasInfiniteScaleCandidate(node, request.target.targetKind, request.variable)) {
    return {
      kind: 'infinity-asymptotic',
      reason: 'A direct infinity scale comparison resolves the infinite-target expression.',
      request,
    };
  }

  if (hasInfiniteIndeterminateTransformCandidate(node, request.target.targetKind, request.variable)) {
    return {
      kind: 'indeterminate-transform',
      reason: 'A safe log-transform rewrite can resolve the indeterminate power form.',
      request,
    };
  }

  if (
    isNodeArray(node)
    && node[0] === 'Divide'
    && node.length === 3
    && dependsOnVariable(node[1], request.variable)
    && dependsOnVariable(node[2], request.variable)
    && containsTranscendentalLike(node)
  ) {
    return {
      kind: 'lhospital-candidate',
      reason: 'A quotient at infinity has competing variable-dependent growth.',
      request,
    };
  }

  return {
    kind: 'unsupported',
    reason: 'No supported infinite-target asymptotic route matched this request.',
    request,
  };
}

export function classifyNaturalLimitRoute(input: string): LimitRouteClassification {
  const parsed = parseNaturalLimitRequest(input);
  if (!parsed.ok) {
    return {
      kind: 'malformed',
      reason: parsed.error,
    };
  }

  let node: unknown;
  try {
    node = ce.parse(parsed.request.bodyLatex).json;
  } catch {
    return {
      kind: 'malformed',
      reason: 'The limit body could not be parsed.',
      request: parsed.request,
    };
  }

  if (containsErrorNode(node)) {
    return {
      kind: 'malformed',
      reason: 'The limit body parsed to an error expression.',
      request: parsed.request,
    };
  }

  const profile = profileNode(node);
  if (profile.nodeCount > MAX_LIMIT_ROUTE_NODES || profile.maxDepth > MAX_LIMIT_ROUTE_DEPTH) {
    return {
      kind: 'too-complex',
      reason: 'The limit expression exceeds the route classifier budget.',
      request: parsed.request,
      ...profile,
    };
  }

  return {
    ...(parsed.request.target.kind === 'infinite'
      ? classifyInfiniteNode(node, parsed.request)
      : classifyFiniteNode(node, parsed.request)),
    ...profile,
  };
}
