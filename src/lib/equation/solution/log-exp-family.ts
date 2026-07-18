import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
  type FiniteRootBranch,
} from './finite-root-set';
import { profileEquationResult } from '../../display/printer';

export type LogExpFamilyKind =
  | 'real-inverse'
  | 'complex-branch';

export type RealLogExpFamily = {
  kind: 'real-inverse';
  targetLatex: string;
  branches: FiniteRootBranch[];
  source: string;
};

export type ComplexLogExpFamily = {
  kind: 'complex-branch';
  targetLatex: string;
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  source: string;
};

export type LogExpFamily =
  | RealLogExpFamily
  | ComplexLogExpFamily;

export type LogExpFamilyRender = {
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  branchesLatex: string[];
  parameterLatex?: string;
};

function splitTrailingIntegerParameter(exactLatex: string) {
  const match = exactLatex.match(/,\\?\s*([a-z](?:,[a-z])*)\\in\\mathbb\{Z\}\s*$/u);
  if (!match) return { exactLatex };
  return {
    exactLatex: exactLatex.slice(0, match.index).trim(),
    parameterLatex: `${match[1]}\\in\\mathbb{Z}`,
  };
}

export function createRealLogExpFamily(input: {
  targetLatex: string;
  branches: readonly (string | FiniteRootBranch)[];
  source?: string;
}): RealLogExpFamily {
  const source = input.source ?? 'equation-parameterized-exp-log';
  return {
    kind: 'real-inverse',
    targetLatex: input.targetLatex,
    branches: createFiniteRootSet({
      targetLatex: input.targetLatex,
      branches: input.branches,
      source,
    }).branches,
    source,
  };
}

export function createComplexLogExpFamily(input: {
  targetLatex: string;
  exactLatex: string;
  branchReadback?: DisplayBranchReadback;
  source?: string;
}): ComplexLogExpFamily {
  return {
    kind: 'complex-branch',
    targetLatex: input.targetLatex,
    exactLatex: input.exactLatex,
    ...(input.branchReadback ? { branchReadback: input.branchReadback } : {}),
    source: input.source ?? 'equation-parameterized-exp-log-complex',
  };
}

export function renderLogExpFamily(family: LogExpFamily): LogExpFamilyRender {
  if (family.kind === 'complex-branch') {
    const split = splitTrailingIntegerParameter(family.exactLatex);
    return {
      exactLatex: split.exactLatex,
      branchReadback: family.branchReadback,
      branchesLatex: family.branchReadback?.branchesLatex ?? [],
      ...(split.parameterLatex ? { parameterLatex: split.parameterLatex } : {}),
    };
  }

  const rendered = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: family.targetLatex,
      branches: family.branches,
      source: family.source,
    }),
    { preserveOrder: true },
  );

  return profileEquationResult({
    exactLatex: rendered.exactLatex ?? `${family.targetLatex}\\in\\left\\{\\right\\}`,
    branchReadback: rendered.branchReadback,
    branchesLatex: rendered.branchesLatex,
  });
}
