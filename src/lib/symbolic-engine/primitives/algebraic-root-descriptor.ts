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

export type AlgebraicConstantDescriptor = {
  kind: 'success';
  familyId: string;
  baseFieldLatex: string;
  generatorLatex: string;
  extensionFieldLatex: string;
  definingEquationLatex: string;
  degree: number;
  definitionLatex: string[];
  detailSection: {
    title: string;
    lines: string[];
  };
};

export type AlgebraicTraceEvidence = {
  kind: 'success';
  familyId: string;
  baseFieldLatex: string;
  extensionFieldLatex: string;
  generatorLatex: string;
  traceLatex: string;
  expandedTraceLatex: string;
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

function joinsRootFree(lines: string[]) {
  if (rawRootOfLeaks(lines)) {
    throw new Error('Algebraic descriptor readback must not leak RootOf text');
  }
  return lines;
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

export function createAlgebraicConstantDescriptor(
  descriptor: AlgebraicRootDescriptor,
  options: {
    baseFieldLatex?: string;
    generatorLatex?: string;
    familyId?: string;
  } = {},
): AlgebraicConstantDescriptor {
  const baseFieldLatex = options.baseFieldLatex ?? '\\mathbb{K}';
  const generatorLatex = options.generatorLatex ?? '\\alpha';
  const familyId = options.familyId ?? `${descriptor.familyId}-algebraic-constant`;
  const extensionFieldLatex = `${baseFieldLatex}\\left(${generatorLatex}\\right)`;
  const definingEquationLatex =
    `${descriptor.polynomialLatex}\\big|_{${descriptor.variableLatex}=${generatorLatex}}=0`;
  const definitionLatex = joinsRootFree([
    `${generatorLatex}\\text{ is an algebraic constant over }${baseFieldLatex}`,
    `${generatorLatex}\\text{ satisfies }${definingEquationLatex}`,
    `${extensionFieldLatex}\\text{ is the descriptor field used for trace readback}`,
  ]);

  return {
    kind: 'success',
    familyId,
    baseFieldLatex,
    generatorLatex,
    extensionFieldLatex,
    definingEquationLatex,
    degree: descriptor.degree,
    definitionLatex,
    detailSection: {
      title: 'Algebraic Constant Descriptor',
      lines: definitionLatex,
    },
  };
}

export function createAlgebraicTraceEvidence(
  descriptor: AlgebraicRootDescriptor,
  options: {
    baseFieldLatex?: string;
    generatorLatex?: string;
    traceBodyLatex: string;
    expandedTermsLatex: string[];
    familyId?: string;
  },
): AlgebraicTraceEvidence {
  const constant = createAlgebraicConstantDescriptor(descriptor, {
    baseFieldLatex: options.baseFieldLatex,
    generatorLatex: options.generatorLatex,
    familyId: options.familyId ? `${options.familyId}-constant` : undefined,
  });
  const familyId = options.familyId ?? `${descriptor.familyId}-trace`;
  const traceLatex =
    `\\operatorname{Tr}_{${constant.extensionFieldLatex}/${constant.baseFieldLatex}}\\left(${options.traceBodyLatex}\\right)`;
  const expandedTraceLatex = options.expandedTermsLatex.join('+');
  const definitionLatex = joinsRootFree([
    ...constant.definitionLatex,
    traceLatex,
    expandedTraceLatex,
  ]);

  return {
    kind: 'success',
    familyId,
    baseFieldLatex: constant.baseFieldLatex,
    extensionFieldLatex: constant.extensionFieldLatex,
    generatorLatex: constant.generatorLatex,
    traceLatex,
    expandedTraceLatex,
    definitionLatex,
    detailSection: {
      title: 'Algebraic Trace Readback',
      lines: [
        ...constant.detailSection.lines,
        `${traceLatex}=${expandedTraceLatex}`,
      ],
    },
  };
}
