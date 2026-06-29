import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildSymbolicPolynomialNode,
  normalizeSymbolicPolynomial,
  symbolicPolynomialIsZero,
  type SymbolicPolynomial,
} from './symbolic-polynomial';

const ce = new ComputeEngine();

export type AlgebraicRootDescriptorStopReason =
  | 'constant-polynomial'
  | 'degree-cap'
  | 'zero-polynomial';

export type AlgebraicRootDescriptorStop = {
  kind: 'stop';
  reason: AlgebraicRootDescriptorStopReason;
};

export type AlgebraicRootName = {
  index: number;
  symbolLatex: string;
  satisfiesLatex: string;
};

export type AlgebraicRootDescriptor = {
  kind: 'success';
  familyId: string;
  variableLatex: string;
  polynomialLatex: string;
  degree: number;
  roots: AlgebraicRootName[];
  definitionLatex: string[];
  detailSection: {
    title: string;
    lines: string[];
  };
};

export type AlgebraicRootDescriptorResult =
  | AlgebraicRootDescriptor
  | AlgebraicRootDescriptorStop;

export type AlgebraicRootDescriptorOptions = {
  familyId?: string;
  maxDegree?: number;
  rootPrefixLatex?: string;
  polynomialNameLatex?: string;
  variableLatex?: string;
};

function boxLatex(node: unknown) {
  return ce.box(node as Parameters<typeof ce.box>[0]).latex;
}

function rootSymbol(prefix: string, index: number) {
  return `${prefix}_{${index}}`;
}

function rawRootOfLeaks(lines: string[]) {
  return lines.some((line) => /RootOf|rootof/i.test(line));
}

export function createAlgebraicRootDescriptor(
  polynomial: SymbolicPolynomial,
  options: AlgebraicRootDescriptorOptions = {},
): AlgebraicRootDescriptorResult {
  const normalized = normalizeSymbolicPolynomial(polynomial);
  if (symbolicPolynomialIsZero(normalized)) {
    return { kind: 'stop', reason: 'zero-polynomial' };
  }
  if (normalized.degree === 0) {
    return { kind: 'stop', reason: 'constant-polynomial' };
  }
  if (normalized.degree > (options.maxDegree ?? 6)) {
    return { kind: 'stop', reason: 'degree-cap' };
  }

  const familyId = options.familyId ?? 'algebraic-root';
  const polynomialNameLatex = options.polynomialNameLatex ?? 'R';
  const variableLatex = options.variableLatex ?? boxLatex(normalized.variable);
  const rootPrefixLatex = options.rootPrefixLatex ?? '\\alpha';
  const polynomialLatex = boxLatex(buildSymbolicPolynomialNode(normalized));
  const roots = Array.from({ length: normalized.degree }, (_, index): AlgebraicRootName => {
    const symbolLatex = rootSymbol(rootPrefixLatex, index + 1);
    return {
      index: index + 1,
      symbolLatex,
      satisfiesLatex: `${symbolLatex}\\text{ satisfies }${polynomialNameLatex}\\left(${symbolLatex}\\right)=0`,
    };
  });
  const definitionLatex = [
    `${polynomialNameLatex}\\left(${variableLatex}\\right)=${polynomialLatex}`,
    ...roots.map((root) => root.satisfiesLatex),
  ];

  if (rawRootOfLeaks(definitionLatex)) {
    return { kind: 'stop', reason: 'degree-cap' };
  }

  return {
    kind: 'success',
    familyId,
    variableLatex,
    polynomialLatex,
    degree: normalized.degree,
    roots,
    definitionLatex,
    detailSection: {
      title: 'Algebraic Root Definitions',
      lines: definitionLatex,
    },
  };
}

export function algebraicRootLogTermLatex(
  root: AlgebraicRootName,
  argumentLatex: string,
  coefficientLatex?: string,
) {
  const rootFactor = coefficientLatex
    ? `${coefficientLatex}\\cdot ${root.symbolLatex}`
    : root.symbolLatex;
  return `${rootFactor}\\cdot\\ln\\left|${argumentLatex}\\right|`;
}
