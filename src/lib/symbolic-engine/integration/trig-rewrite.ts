import {
  buildExactScalarNode,
  multiplyExactScalars,
  readExactScalarNode,
  type ExactScalar,
} from '../../algebra/polynomial-core';
import { normalizeAst } from '../normalize';
import {
  boxLatex,
  dependsOnVariable,
  flattenAdd,
  flattenMultiply,
  isNodeArray,
} from '../patterns';
import { sameNode } from './node-helpers';

type SignedTerm = {
  node: unknown;
  sign: 1 | -1;
};

type RewriteResult = {
  node: unknown;
  changed: boolean;
  steps: string[];
};

export type IntegrationTrigRewrite = {
  node: unknown;
  changed: boolean;
  lines: string[];
};

const ONE: ExactScalar = { numerator: 1, denominator: 1 };
const NEGATIVE_ONE: ExactScalar = { numerator: -1, denominator: 1 };
const MAX_SQUARED_SUM_TERMS = 3;
const MAX_DISTRIBUTED_SUM_TERMS = 3;

function exactScalarNode(value: ExactScalar) {
  return buildExactScalarNode(value);
}

function exactScalar(numerator: number, denominator = 1): ExactScalar {
  return { numerator, denominator };
}

function isSquareExponent(node: unknown) {
  const scalar = readExactScalarNode(node);
  return scalar?.numerator === 2 && scalar.denominator === 1;
}

function signedNode(node: unknown, sign: 1 | -1): unknown {
  return sign === 1 ? node : ['Negate', node];
}

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedTerm[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function productFactors(node: unknown): unknown[] {
  return isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
}

function multiplyNodes(nodes: unknown[]) {
  const meaningful = nodes.filter((node) => {
    const scalar = readExactScalarNode(node);
    return !scalar || scalar.numerator !== scalar.denominator;
  });
  if (meaningful.length === 0) {
    return 1;
  }
  return meaningful.length === 1 ? meaningful[0] : normalizeAst(['Multiply', ...meaningful]);
}

function addNodes(nodes: unknown[]) {
  if (nodes.length === 0) {
    return 0;
  }
  return nodes.length === 1 ? nodes[0] : normalizeAst(['Add', ...nodes]);
}

function splitScalarFactors(node: unknown): { scalar: ExactScalar; body: unknown } | undefined {
  let scalar = ONE;
  const bodyFactors: unknown[] = [];
  for (const factor of productFactors(node)) {
    const exact = readExactScalarNode(factor);
    if (exact) {
      scalar = multiplyExactScalars(scalar, exact);
    } else {
      bodyFactors.push(factor);
    }
  }

  return {
    scalar,
    body: multiplyNodes(bodyFactors),
  };
}

function scaleNode(node: unknown, scalar: ExactScalar) {
  if (scalar.numerator === 0) {
    return 0;
  }
  if (scalar.numerator === scalar.denominator) {
    return node;
  }
  return multiplyNodes([exactScalarNode(scalar), node]);
}

function simpleTrigFactor(node: unknown) {
  return isNodeArray(node)
    && node.length === 2
    && (node[0] === 'Sin'
      || node[0] === 'Cos'
      || node[0] === 'Tan'
      || node[0] === 'Sec'
      || node[0] === 'Csc'
      || node[0] === 'Cot')
    ? { head: node[0], argument: node[1] }
    : undefined;
}

function isSafeTrigSumTerm(node: unknown, variable: string) {
  if (!dependsOnVariable(node, variable)) {
    return true;
  }

  const split = splitScalarFactors(node);
  return Boolean(split && simpleTrigFactor(split.body));
}

function isSafeTrigSum(terms: SignedTerm[], variable: string) {
  return terms.length >= 2
    && terms.length <= MAX_SQUARED_SUM_TERMS
    && terms.some((term) => dependsOnVariable(term.node, variable))
    && terms.every((term) => isSafeTrigSumTerm(term.node, variable));
}

function unitSinCosTerm(term: SignedTerm) {
  const split = splitScalarFactors(term.node);
  if (!split) {
    return undefined;
  }

  const scalar = term.sign === 1
    ? split.scalar
    : multiplyExactScalars(NEGATIVE_ONE, split.scalar);
  const trig = simpleTrigFactor(split.body);
  if (
    !trig
    || (trig.head !== 'Sin' && trig.head !== 'Cos')
    || Math.abs(scalar.numerator) !== scalar.denominator
  ) {
    return undefined;
  }

  return {
    head: trig.head,
    argument: trig.argument,
    sign: scalar.numerator > 0 ? 1 as const : -1 as const,
  };
}

function doubleArgument(argument: unknown) {
  return normalizeAst(['Multiply', 2, argument]);
}

function sinCosSquareIdentity(terms: SignedTerm[]) {
  if (terms.length !== 2) {
    return undefined;
  }

  const left = unitSinCosTerm(terms[0]);
  const right = unitSinCosTerm(terms[1]);
  if (
    !left
    || !right
    || left.head === right.head
    || !sameNode(left.argument, right.argument)
  ) {
    return undefined;
  }

  const sign = left.sign === right.sign ? 1 : -1;
  return addNodes([
    1,
    signedNode(['Sin', doubleArgument(left.argument)], sign),
  ]);
}

function squaredTerm(term: SignedTerm) {
  const split = splitScalarFactors(term.node);
  if (!split) {
    return ['Power', signedNode(term.node, term.sign), 2];
  }

  const signedScalar = term.sign === 1
    ? split.scalar
    : multiplyExactScalars(NEGATIVE_ONE, split.scalar);
  const squaredScalar = multiplyExactScalars(signedScalar, signedScalar);
  return scaleNode(['Power', split.body, 2], squaredScalar);
}

function pairProduct(left: SignedTerm, right: SignedTerm) {
  const sign = left.sign === right.sign ? 1 : -1;
  const coefficient = exactScalar(2 * sign);
  return scaleNode(multiplyNodes([left.node, right.node]), coefficient);
}

function expandSquaredSum(base: unknown, variable: string): unknown | undefined {
  const terms = signedAddTerms(base);
  if (!isSafeTrigSum(terms, variable)) {
    return undefined;
  }

  const sinCosIdentity = sinCosSquareIdentity(terms);
  if (sinCosIdentity !== undefined) {
    return sinCosIdentity;
  }

  const expanded: unknown[] = [];
  for (let left = 0; left < terms.length; left += 1) {
    expanded.push(squaredTerm(terms[left]));
    for (let right = left + 1; right < terms.length; right += 1) {
      expanded.push(pairProduct(terms[left], terms[right]));
    }
  }

  return addNodes(expanded);
}

function rewriteCosProduct(node: unknown): unknown | undefined {
  const split = splitScalarFactors(node);
  if (!split || split.body === 1) {
    return undefined;
  }

  const factors = productFactors(split.body);
  if (factors.length !== 2) {
    return undefined;
  }

  const left = simpleTrigFactor(factors[0]);
  const right = simpleTrigFactor(factors[1]);
  if (!left || !right) {
    return undefined;
  }

  const cos = left.head === 'Cos' ? left : right.head === 'Cos' ? right : undefined;
  const other = cos === left ? right : left;
  if (!cos || !sameNode(cos.argument, other.argument)) {
    return undefined;
  }

  if (other.head === 'Tan') {
    return scaleNode(['Sin', cos.argument], split.scalar);
  }

  if (other.head === 'Sec') {
    return exactScalarNode(split.scalar);
  }

  return undefined;
}

function distributeSmallTrigSum(node: unknown, variable: string): unknown | undefined {
  if (!isNodeArray(node) || node[0] !== 'Multiply') {
    return undefined;
  }

  const factors = flattenMultiply(node);
  const addIndex = factors.findIndex((factor) => isNodeArray(factor) && factor[0] === 'Add');
  if (addIndex < 0) {
    return undefined;
  }

  const addFactor = factors[addIndex];
  const terms = signedAddTerms(addFactor);
  const otherFactors = factors.filter((_, index) => index !== addIndex);
  if (
    terms.length < 2
    || terms.length > MAX_DISTRIBUTED_SUM_TERMS
    || !terms.every((term) => isSafeTrigSumTerm(term.node, variable))
    || !otherFactors.every((factor) => isSafeTrigSumTerm(factor, variable))
  ) {
    return undefined;
  }

  return addNodes(terms.map((term) =>
    signedNode(multiplyNodes([...otherFactors, term.node]), term.sign)));
}

function rewriteNode(node: unknown, variable: string): RewriteResult {
  if (!isNodeArray(node) || node.length === 0) {
    return { node, changed: false, steps: [] };
  }

  const children = node.slice(1).map((child) => rewriteNode(child, variable));
  const rebuilt = [node[0], ...children.map((child) => child.node)];
  const childChanged = children.some((child) => child.changed);
  const childSteps = children.flatMap((child) => child.steps);
  let current: unknown = childChanged ? normalizeAst(rebuilt) : node;
  const steps = [...childSteps];

  if (isNodeArray(current) && current[0] === 'Power' && current.length === 3 && isSquareExponent(current[2])) {
    const expanded = expandSquaredSum(current[1], variable);
    if (expanded !== undefined) {
      current = expanded;
      steps.push('small squared trig sums reduced or expanded');
    }
  }

  if (isNodeArray(current) && current[0] === 'Multiply') {
    const distributed = distributeSmallTrigSum(current, variable);
    if (distributed !== undefined) {
      current = distributed;
      steps.push('small trig products distributed over sums');
    }
  }

  if (isNodeArray(current) && current[0] === 'Multiply') {
    const product = rewriteCosProduct(current);
    if (product !== undefined) {
      current = product;
      steps.push('simple cos*tan and cos*sec products simplified');
    }
  }

  if (current !== node || steps.length > childSteps.length) {
    const rewritten = rewriteNode(normalizeAst(current), variable);
    if (rewritten.changed) {
      return {
        node: rewritten.node,
        changed: true,
        steps: [...steps, ...rewritten.steps],
      };
    }
    return {
      node: normalizeAst(current),
      changed: true,
      steps,
    };
  }

  return { node, changed: false, steps: [] };
}

export function normalizeIntegrationTrigRewrite(
  node: unknown,
  variable: string,
): IntegrationTrigRewrite {
  const rewritten = rewriteNode(node, variable);
  if (!rewritten.changed) {
    return { node, changed: false, lines: [] };
  }

  return {
    node: normalizeAst(rewritten.node),
    changed: true,
    lines: [
      `Original integrand: ${boxLatex(node)}`,
      `Recognized rewrites: ${Array.from(new Set(rewritten.steps)).join('; ')}`,
      `Internal retry form: ${boxLatex(normalizeAst(rewritten.node))}`,
      'Existing integration routes must still accept and backcheck the rewritten form before adoption.',
    ],
  };
}
