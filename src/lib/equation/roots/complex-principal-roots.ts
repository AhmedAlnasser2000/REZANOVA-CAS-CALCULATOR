import type { ComplexExactForm } from '../../../types/calculator';
import { latexForNode, simplifyNode, type MathJson } from '../parameterized/math-json';

export type ComplexPrincipalRootDegree = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ComplexPrincipalRootBranchFact = {
  principalArgumentRange: '(-pi, pi]';
  branchCut: 'principal-root-branch-cut';
  visible: false;
};

export type ComplexPrincipalRootBranchNode = {
  kind: 'equation-complex-principal-root-branch';
  radicand: MathJson;
  degree: ComplexPrincipalRootDegree;
  branchIndex: number;
  facts: ComplexPrincipalRootBranchFact[];
};

export function isComplexPrincipalRootDegree(degree: number): degree is ComplexPrincipalRootDegree {
  return Number.isInteger(degree) && degree >= 2 && degree <= 12;
}

export function isComplexPrincipalRootBranchNode(node: unknown): node is ComplexPrincipalRootBranchNode {
  return Boolean(
    node
      && typeof node === 'object'
      && !Array.isArray(node)
      && (node as { kind?: unknown }).kind === 'equation-complex-principal-root-branch'
      && isComplexPrincipalRootDegree((node as { degree?: unknown }).degree as number)
      && typeof (node as { branchIndex?: unknown }).branchIndex === 'number'
      && Number.isInteger((node as { branchIndex: number }).branchIndex)
      && (node as { branchIndex: number }).branchIndex >= 0
      && (node as { branchIndex: number }).branchIndex < (node as { degree: number }).degree,
  );
}

export function createComplexPrincipalRootBranchNode(options: {
  radicand: MathJson;
  degree: ComplexPrincipalRootDegree;
  branchIndex: number;
}): ComplexPrincipalRootBranchNode {
  return {
    kind: 'equation-complex-principal-root-branch',
    radicand: simplifyNode(options.radicand),
    degree: options.degree,
    branchIndex: options.branchIndex,
    facts: [{
      principalArgumentRange: '(-pi, pi]',
      branchCut: 'principal-root-branch-cut',
      visible: false,
    }],
  };
}

export function complexPrincipalRootBranches(
  radicand: MathJson,
  degree: ComplexPrincipalRootDegree,
): ComplexPrincipalRootBranchNode[] {
  return Array.from({ length: degree }, (_, branchIndex) =>
    createComplexPrincipalRootBranchNode({ radicand, degree, branchIndex }));
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function angleLatex(numerator: number, denominator: number) {
  if (numerator === 0) {
    return '0';
  }
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  const sign = reducedNumerator < 0 ? '-' : '';
  const magnitude = Math.abs(reducedNumerator);
  const piNumerator = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
  return reducedDenominator === 1
    ? `${sign}${piNumerator}`
    : `${sign}\\frac{${piNumerator}}{${reducedDenominator}}`;
}

export function principalRootBaseLatex(node: ComplexPrincipalRootBranchNode) {
  return `\\operatorname{PrincipalRoot}_{${node.degree}}\\left(${latexForNode(node.radicand)}\\right)`;
}

export function principalRootMultiplierLatex(
  node: ComplexPrincipalRootBranchNode,
  complexExactForm: ComplexExactForm = 'rectangular',
) {
  if (node.branchIndex === 0) {
    return '';
  }
  const angle = angleLatex(2 * node.branchIndex, node.degree);
  return complexExactForm === 'cis'
    ? `\\operatorname{cis}\\left(${angle}\\right)`
    : `\\cos\\left(${angle}\\right)+i\\sin\\left(${angle}\\right)`;
}

export function renderComplexPrincipalRootBranchNode(
  node: unknown,
  options: { complexExactForm?: ComplexExactForm } = {},
) {
  if (!isComplexPrincipalRootBranchNode(node)) {
    return null;
  }
  const root = principalRootBaseLatex(node);
  const multiplier = principalRootMultiplierLatex(node, options.complexExactForm ?? 'rectangular');
  return multiplier ? `${root}\\left(${multiplier}\\right)` : root;
}
