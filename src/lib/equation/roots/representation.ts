import type { DisplayBranchReadback } from '../../../types/calculator';
import type {
  BoundedPolynomialFactorization,
  BoundedPolynomialSolveResult,
  PolynomialFactorizationStrategy,
} from '../../algebra/polynomial-factor/types';
import {
  renderRawSupplementLatexFromFacts,
  type EquationBranchDomainFact,
} from '../facts/branch-domain-facts';
import {
  extractFiniteRootBranchesFromExactLatex,
  normalizeFiniteRootExactLatexOverride,
} from '../readback/exact-overrides';
import {
  type EquationFiniteBranchExpression,
  type EquationPresentationContext,
} from '../presentation/finite-roots';
import {
  createFiniteRootBranch,
  createFiniteRootSet,
  renderFiniteRootSet,
  type FiniteRootSetRenderOptions,
  uniqueFiniteRootSetBranchLatex,
} from '../solution/finite-root-set';

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
  return extractFiniteRootBranchesFromExactLatex(exactLatex, target);
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
      roots: normalizeExactRoots(
        result.exactSolutionBranches.length > 0
          ? result.exactSolutionBranches.map((root) =>
            createExactFiniteRoot(root.latex, {
              source: options.source,
              ...(root.node !== undefined ? { node: root.node } : {}),
            }))
          : result.exactSolutions,
        options.source,
      ),
      approxRoots: result.approxSolutions,
    }],
  });
}

export function rootSetExactRootLatex(rootSet: EquationRootSet) {
  return uniqueFiniteRootSetBranchLatex(finiteRootSetFromRootSet(rootSet), {
    preserveOrder: true,
  });
}

export function rootSetToExactLatex(
  rootSet: EquationRootSet,
  options: {
    setSeparator?: string;
    context?: FiniteRootSetRenderOptions['context'];
    presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>;
  } = {},
) {
  const finiteRootSet = finiteRootSetFromRootSet(rootSet);

  if (rootSet.exactLatexOverride) {
    const normalizedOverride = normalizeFiniteRootExactLatexOverride({
      exactLatex: rootSet.exactLatexOverride,
      targetLatex: rootSet.target,
      setSeparator: options.setSeparator,
    });
    if (normalizedOverride) {
      if (finiteRootSet.branches.some((root) => root.node !== undefined)) {
        return renderFiniteRootSet(finiteRootSet, {
          preserveOrder: true,
          ...(options.setSeparator ? { setSeparator: options.setSeparator } : {}),
          ...(options.context ? { context: options.context } : {}),
          ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
        }).exactLatex;
      }

      return normalizedOverride.exactLatex;
    }

    return rootSet.exactLatexOverride;
  }

  return renderFiniteRootSet(finiteRootSet, {
    preserveOrder: true,
    ...(options.setSeparator ? { setSeparator: options.setSeparator } : {}),
    ...(options.context ? { context: options.context } : {}),
    ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
  }).exactLatex;
}

export function rootSetToCanonicalMath(
  rootSet: EquationRootSet,
  options: Pick<FiniteRootSetRenderOptions, 'setSeparator' | 'context' | 'presentationContext'> = {},
) {
  return renderFiniteRootSet(finiteRootSetFromRootSet(rootSet), {
    preserveOrder: true,
    ...options,
  }).primaryMath;
}

export function rootSetToBranchReadback(
  rootSet: EquationRootSet,
  options: {
    source?: string;
    relationLatex?: DisplayBranchReadback['relationLatex'];
    label?: string;
    context?: FiniteRootSetRenderOptions['context'];
    presentationContext?: Pick<EquationPresentationContext, 'complexExactForm'>;
  } = {},
) {
  return renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: rootSet.target,
      source: options.source ?? rootSet.source,
      branches: exactRootsFromRootSet(rootSet).map((branch) =>
        createFiniteRootBranch(branch.latex, {
          ...(branch.node !== undefined ? { node: branch.node } : {}),
          source: options.source ?? rootSet.source,
        })),
    }),
    {
      preserveOrder: true,
      ...(options.context ? { context: options.context } : {}),
      ...(options.presentationContext ? { presentationContext: options.presentationContext } : {}),
      ...(options.relationLatex ? { relationLatex: options.relationLatex } : {}),
      ...(options.label ? { label: options.label } : {}),
    },
  ).branchReadback;
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

function exactRootsFromRootSet(rootSet: EquationRootSet): EquationFiniteBranchExpression[] {
  return rootSet.entries.flatMap(exactRootsFromEntry);
}

function exactRootsFromEntry(entry: EquationRootRepresentation): EquationFiniteBranchExpression[] {
  if (entry.kind === 'exact-finite') {
    return [entry];
  }
  if (entry.kind === 'factor-derived' || entry.kind === 'exact-rational-factor') {
    return entry.roots;
  }
  return [];
}

function finiteRootSetFromRootSet(rootSet: EquationRootSet) {
  return createFiniteRootSet({
    targetLatex: rootSet.target,
    source: rootSet.source,
    branches: exactRootsFromRootSet(rootSet).map((branch) =>
      createFiniteRootBranch(branch.latex, {
        ...(branch.node !== undefined ? { node: branch.node } : {}),
        source: rootSet.source,
      })),
  });
}

function dedupe(entries: string[]) {
  return [...new Set(entries.filter(Boolean))];
}
