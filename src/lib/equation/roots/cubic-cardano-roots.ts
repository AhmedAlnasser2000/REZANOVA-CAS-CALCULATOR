import { ComputeEngine } from '@cortex-js/compute-engine';
import type { ComplexExactForm } from '../../../types/calculator';
import {
  principalRootMultiplierLatex,
} from './complex-principal-roots';
import { simplifyMathJsonNodeOrOriginal } from '../../symbolic-engine/primitives/simplification/simplification';
import {
  createArithmeticHelpers,
  isZeroNode,
  type MathJson,
} from '../parameterized/math-json';

const ce = new ComputeEngine();

function simplifyCardanoNode(node: MathJson): MathJson {
  return simplifyMathJsonNodeOrOriginal(node) as MathJson;
}

const { negateNode } = createArithmeticHelpers(simplifyCardanoNode);

export function latexForCubicCardanoNode(node: MathJson) {
  try {
    return ce.box(simplifyCardanoNode(node) as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return 'unsupported-cardano-node';
  }
}

export type CubicCardanoBranchNode = {
  kind: 'equation-cubic-cardano-branch';
  shift: MathJson;
  p: MathJson;
  q: MathJson;
  delta: MathJson;
  primaryRadicand: MathJson;
  branchIndex: 0 | 1 | 2;
  noDenominator: boolean;
  latex?: {
    shift: string;
    p: string;
    q: string;
    delta: string;
    primaryRadicand: string;
    negatedQ: string;
  };
};

export function isCubicCardanoBranchNode(node: unknown): node is CubicCardanoBranchNode {
  return Boolean(
    node
      && typeof node === 'object'
      && !Array.isArray(node)
      && (node as { kind?: unknown }).kind === 'equation-cubic-cardano-branch'
      && ((node as { branchIndex?: unknown }).branchIndex === 0
        || (node as { branchIndex?: unknown }).branchIndex === 1
        || (node as { branchIndex?: unknown }).branchIndex === 2),
  );
}

export function createCubicCardanoBranchNode(options: {
  shift: MathJson;
  p: MathJson;
  q: MathJson;
  delta: MathJson;
  primaryRadicand: MathJson;
  branchIndex: 0 | 1 | 2;
  noDenominator: boolean;
  latex?: CubicCardanoBranchNode['latex'];
}): CubicCardanoBranchNode {
  return {
    kind: 'equation-cubic-cardano-branch',
    shift: simplifyCardanoNode(options.shift),
    p: simplifyCardanoNode(options.p),
    q: simplifyCardanoNode(options.q),
    delta: simplifyCardanoNode(options.delta),
    primaryRadicand: simplifyCardanoNode(options.primaryRadicand),
    branchIndex: options.branchIndex,
    noDenominator: options.noDenominator,
    ...(options.latex ? { latex: options.latex } : {}),
  };
}

export function cubicCardanoBranchNodes(options: {
  shift: MathJson;
  p: MathJson;
  q: MathJson;
  delta: MathJson;
  primaryRadicand: MathJson;
  noDenominator: boolean;
  latex?: CubicCardanoBranchNode['latex'];
}) {
  return [0, 1, 2].map((branchIndex) =>
    createCubicCardanoBranchNode({
      ...options,
      branchIndex: branchIndex as 0 | 1 | 2,
    }));
}

function grouped(latex: string) {
  if (/^-?[A-Za-z0-9]+$/u.test(latex)) {
    return latex;
  }
  return `\\left(${latex}\\right)`;
}

function isNegativeLatex(latex: string) {
  return latex.startsWith('-');
}

function addTerms(terms: string[]) {
  const filtered = terms.filter((term) => term.length > 0 && term !== '0');
  if (filtered.length === 0) {
    return '0';
  }
  return filtered.reduce((current, term, index) => {
    if (index === 0) {
      return term;
    }
    return isNegativeLatex(term)
      ? `${current}-${term.slice(1)}`
      : `${current}+${term}`;
  }, '');
}

function principalRootLatex(
  radicand: MathJson,
  radicandLatex: string,
  branchIndex: 0 | 1 | 2,
  complexExactForm: ComplexExactForm,
) {
  const root = `\\operatorname{PrincipalRoot}_{3}\\left(${radicandLatex}\\right)`;
  const multiplier = principalRootMultiplierLatex({
    kind: 'equation-complex-principal-root-branch',
    radicand,
    degree: 3,
    branchIndex,
    facts: [],
  }, complexExactForm);
  return multiplier ? `${root}\\left(${multiplier}\\right)` : root;
}

export function renderCubicCardanoBranchNode(
  node: unknown,
  options: { complexExactForm?: ComplexExactForm } = {},
) {
  if (!isCubicCardanoBranchNode(node)) {
    return null;
  }

  const complexExactForm = options.complexExactForm ?? 'rectangular';
  const radicandLatex = node.noDenominator
    ? node.latex?.negatedQ ?? latexForCubicCardanoNode(negateNode(node.q))
    : node.latex?.primaryRadicand ?? latexForCubicCardanoNode(node.primaryRadicand);
  const rootLatex = principalRootLatex(
    node.noDenominator ? negateNode(node.q) : node.primaryRadicand,
    radicandLatex,
    node.branchIndex,
    complexExactForm,
  );
  if (!rootLatex) {
    return null;
  }

  const shiftLatex = node.latex?.shift ?? latexForCubicCardanoNode(node.shift);
  if (node.noDenominator || isZeroNode(simplifyCardanoNode(node.p))) {
    return addTerms([shiftLatex, rootLatex]);
  }

  const pLatex = node.latex?.p ?? latexForCubicCardanoNode(node.p);
  const denominator = `3${grouped(rootLatex)}`;
  return addTerms([
    shiftLatex,
    rootLatex,
    `-\\frac{${pLatex}}{${denominator}}`,
  ]);
}
