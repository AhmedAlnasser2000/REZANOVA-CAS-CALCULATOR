import type { DisplayBranchReadback } from '../../../types/calculator';
import type {
  BoundedPolynomialFactorization,
  BoundedPolynomialSolveResult,
  PolynomialFactorizationStrategy,
} from '../../algebra/polynomial-factor/types';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import {
  renderRawSupplementLatexFromFacts,
  type EquationBranchDomainFact,
} from '../facts/branch-domain-facts';

export type EquationExactFiniteRoot = {
  kind: 'exact-finite';
  latex: string;
  source?: string;
  node?: unknown;
};

export type EquationFactorDerivedRoot = {
  kind: 'factor-derived';
  factorLatex: string;
  factorDegree: number;
  multiplicity: number;
  delegatedFamily: 'linear' | 'polynomial' | 'exact-rational-factorization';
  source: string;
  roots: EquationExactFiniteRoot[];
  facts?: EquationBranchDomainFact[];
  exactSupplementLatex?: string[];
  detailLines?: string[];
};

export type EquationExactRationalFactorRoot = {
  kind: 'exact-rational-factor';
  source: string;
  strategy: PolynomialFactorizationStrategy;
  factorizedLatex: string;
  factors: BoundedPolynomialFactorization['factors'];
  roots: EquationExactFiniteRoot[];
  approxRoots: number[];
};

export type EquationNumericValidatedRoot = {
  kind: 'numeric-validated';
  source: string;
  value: number;
  latex: string;
  method?: string;
  rejectedCandidateCount?: number;
};

export type EquationImplicitAlgebraicRoot = {
  kind: 'implicit-algebraic';
  source: string;
  equationLatex: string;
  variable: string;
  reason?: string;
};

export type EquationStructuredRootStop = {
  kind: 'structured-stop';
  source: string;
  reason: string;
  message: string;
};

export type EquationRootRepresentation =
  | EquationExactFiniteRoot
  | EquationFactorDerivedRoot
  | EquationExactRationalFactorRoot
  | EquationNumericValidatedRoot
  | EquationImplicitAlgebraicRoot
  | EquationStructuredRootStop;

export type EquationRootSet = {
  target: string;
  source: string;
  entries: EquationRootRepresentation[];
  exactLatexOverride?: string;
  approxText?: string;
};

export function createExactFiniteRoot(
  latex: string,
  options: { source?: string; node?: unknown } = {},
): EquationExactFiniteRoot {
  return {
    kind: 'exact-finite',
    latex,
    ...(options.source ? { source: options.source } : {}),
    ...(options.node !== undefined ? { node: options.node } : {}),
  };
}

export function createRootSet(options: {
  target: string;
  source: string;
  entries: EquationRootRepresentation[];
  exactLatexOverride?: string;
  approxText?: string;
}): EquationRootSet {
  return {
    target: options.target,
    source: options.source,
    entries: options.entries,
    ...(options.exactLatexOverride ? { exactLatexOverride: options.exactLatexOverride } : {}),
    ...(options.approxText ? { approxText: options.approxText } : {}),
  };
}

export function createFactorDerivedRoot(options: {
  factorLatex: string;
  factorDegree: number;
  multiplicity: number;
  delegatedFamily: EquationFactorDerivedRoot['delegatedFamily'];
  source: string;
  roots: string[] | EquationExactFiniteRoot[];
  facts?: EquationBranchDomainFact[];
  exactSupplementLatex?: string[];
  detailLines?: string[];
}): EquationFactorDerivedRoot {
  return {
    kind: 'factor-derived',
    factorLatex: options.factorLatex,
    factorDegree: options.factorDegree,
    multiplicity: options.multiplicity,
    delegatedFamily: options.delegatedFamily,
    source: options.source,
    roots: normalizeExactRoots(options.roots, options.source),
    ...(options.facts && options.facts.length > 0 ? { facts: options.facts } : {}),
    ...(options.exactSupplementLatex && options.exactSupplementLatex.length > 0
      ? { exactSupplementLatex: options.exactSupplementLatex }
      : {}),
    ...(options.detailLines && options.detailLines.length > 0 ? { detailLines: options.detailLines } : {}),
  };
}

export function createNumericValidatedRoot(options: {
  value: number;
  latex: string;
  source: string;
  method?: string;
  rejectedCandidateCount?: number;
}): EquationNumericValidatedRoot {
  return {
    kind: 'numeric-validated',
    value: options.value,
    latex: options.latex,
    source: options.source,
    ...(options.method ? { method: options.method } : {}),
    ...(options.rejectedCandidateCount !== undefined
      ? { rejectedCandidateCount: options.rejectedCandidateCount }
      : {}),
  };
}

export function createImplicitAlgebraicRoot(options: {
  equationLatex: string;
  variable: string;
  source: string;
  reason?: string;
}): EquationImplicitAlgebraicRoot {
  return {
    kind: 'implicit-algebraic',
    equationLatex: options.equationLatex,
    variable: options.variable,
    source: options.source,
    ...(options.reason ? { reason: options.reason } : {}),
  };
}

export function createStructuredRootStop(options: {
  reason: string;
  message: string;
  source: string;
}): EquationStructuredRootStop {
  return {
    kind: 'structured-stop',
    reason: options.reason,
    message: options.message,
    source: options.source,
  };
}

export function exactRootsFromLatex(exactLatex: string, target: string) {
  const equalityPrefix = `${target}=`;
  if (exactLatex.startsWith(equalityPrefix)) {
    return [exactLatex.slice(equalityPrefix.length)];
  }

  const setPrefix = `${target}\\in\\left\\{`;
  const setSuffix = '\\right\\}';
  if (exactLatex.startsWith(setPrefix) && exactLatex.endsWith(setSuffix)) {
    const content = exactLatex.slice(setPrefix.length, -setSuffix.length);
    return content
      .split(/,\\\s*|,\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return null;
}

export function adaptBoundedPolynomialSolveResultToRootSet(
  result: BoundedPolynomialSolveResult,
  options: { source: string } = { source: 'equation-exact-rational-factorization' },
): EquationRootSet {
  return createRootSet({
    target: result.variable,
    source: options.source,
    exactLatexOverride: result.exactLatex,
    approxText: result.approxText,
    entries: [{
      kind: 'exact-rational-factor',
      source: options.source,
      strategy: result.factorization.strategy,
      factorizedLatex: result.factorization.factorizedLatex,
      factors: result.factorization.factors,
      roots: normalizeExactRoots(result.exactSolutions, options.source),
      approxRoots: result.approxSolutions,
    }],
  });
}

export function rootSetExactRootLatex(rootSet: EquationRootSet) {
  return dedupe(rootSet.entries.flatMap(exactRootLatexFromEntry));
}

export function rootSetToExactLatex(
  rootSet: EquationRootSet,
  options: { setSeparator?: string } = {},
) {
  if (rootSet.exactLatexOverride) {
    return rootSet.exactLatexOverride;
  }

  const roots = rootSetExactRootLatex(rootSet);
  if (roots.length === 0) {
    return undefined;
  }

  if (roots.length === 1) {
    return `${rootSet.target}=${roots[0]}`;
  }

  return `${rootSet.target}\\in\\left\\{${roots.join(options.setSeparator ?? ',\\ ')}\\right\\}`;
}

export function rootSetToBranchReadback(
  rootSet: EquationRootSet,
  options: {
    source?: string;
    relationLatex?: DisplayBranchReadback['relationLatex'];
    label?: string;
  } = {},
) {
  const branchesLatex = rootSetExactRootLatex(rootSet);
  if (branchesLatex.length === 0) {
    return undefined;
  }

  return finiteBranchReadbackMetadata({
    targetLatex: rootSet.target,
    branchesLatex,
    source: options.source ?? rootSet.source,
    ...(options.relationLatex ? { relationLatex: options.relationLatex } : {}),
    ...(options.label ? { label: options.label } : {}),
  });
}

export function rootSetExactSupplementLatex(rootSet: EquationRootSet) {
  const supplements = rootSet.entries.flatMap((entry) =>
    entry.kind === 'factor-derived'
      ? [
        ...renderRawSupplementLatexFromFacts(entry.facts),
        ...(entry.exactSupplementLatex ?? []),
      ]
      : []);
  const deduped = dedupe(supplements);
  return deduped.length > 0 ? deduped : undefined;
}

export function rootSetDetailLines(rootSet: EquationRootSet) {
  const lines = rootSet.entries.flatMap((entry) =>
    entry.kind === 'factor-derived'
      ? entry.detailLines ?? []
      : []);
  return lines.length > 0 ? lines : undefined;
}

function normalizeExactRoots(
  roots: string[] | EquationExactFiniteRoot[],
  source?: string,
): EquationExactFiniteRoot[] {
  return roots.map((root) =>
    typeof root === 'string'
      ? createExactFiniteRoot(root, { source })
      : root);
}

function exactRootLatexFromEntry(entry: EquationRootRepresentation): string[] {
  if (entry.kind === 'exact-finite') {
    return [entry.latex];
  }
  if (entry.kind === 'factor-derived' || entry.kind === 'exact-rational-factor') {
    return entry.roots.map((root) => root.latex);
  }
  return [];
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}
