import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  rootSetDetailLines,
  rootSetExactSupplementLatex,
  rootSetToBranchReadback,
  rootSetToExactLatex,
  type EquationRootSet,
  type EquationStructuredRootStop,
} from './representation';

export type EquationVisibleRootReadback = {
  kind: 'visible-exact';
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  exactSupplementLatex?: string[];
  approxText?: string;
  detailLines?: string[];
};

export type EquationNoVisibleRootReadback = {
  kind: 'no-visible-exact';
  reason: 'empty-root-set' | 'implicit-root' | 'numeric-only';
  source: string;
};

export type EquationStructuredRootStopReadback = {
  kind: 'structured-stop';
  source: string;
  reason: string;
  message: string;
};

export type EquationCompactRootReadback =
  | EquationVisibleRootReadback
  | EquationNoVisibleRootReadback
  | EquationStructuredRootStopReadback;

export function buildCompactRootReadback(rootSet: EquationRootSet): EquationCompactRootReadback {
  const exactLatex = rootSetToExactLatex(rootSet);
  if (exactLatex) {
    return {
      kind: 'visible-exact',
      exactLatex,
      branchReadback: rootSetToBranchReadback(rootSet),
      exactSupplementLatex: rootSetExactSupplementLatex(rootSet),
      approxText: rootSet.approxText,
      detailLines: rootSetDetailLines(rootSet),
    };
  }

  const structuredStop = rootSet.entries.find(isStructuredRootStop);
  if (structuredStop) {
    return {
      kind: 'structured-stop',
      source: structuredStop.source,
      reason: structuredStop.reason,
      message: structuredStop.message,
    };
  }

  const implicit = rootSet.entries.find((entry) => entry.kind === 'implicit-algebraic');
  if (implicit) {
    return {
      kind: 'no-visible-exact',
      reason: 'implicit-root',
      source: implicit.source,
    };
  }

  const numeric = rootSet.entries.find((entry) => entry.kind === 'numeric-validated');
  if (numeric) {
    return {
      kind: 'no-visible-exact',
      reason: 'numeric-only',
      source: numeric.source,
    };
  }

  return {
    kind: 'no-visible-exact',
    reason: 'empty-root-set',
    source: rootSet.source,
  };
}

function isStructuredRootStop(entry: EquationRootSet['entries'][number]): entry is EquationStructuredRootStop {
  return entry.kind === 'structured-stop';
}
