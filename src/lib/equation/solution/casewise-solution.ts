import type { DisplayBranchReadback } from '../../../types/calculator';
import {
  createFiniteRootSet,
  renderFiniteRootSet,
  type FiniteRootBranch,
  type FiniteRootSetRenderOptions,
} from './finite-root-set';

export type CasewiseSolutionCase = {
  id: string;
  source: string;
  branchEquationLatex?: string;
  conditionsLatex?: readonly string[];
  integerParameters?: readonly string[];
  solutionBranches: FiniteRootBranch[];
};

export type CasewiseSolution = {
  kind: 'casewise-solution';
  targetLatex: string;
  source: string;
  cases: CasewiseSolutionCase[];
};

export type CasewiseSolutionRender = {
  exactLatex?: string;
  branchReadback?: DisplayBranchReadback;
  branchesLatex: string[];
  cases: Array<{
    id: string;
    branchEquationLatex?: string;
    conditionsLatex: string[];
    integerParameters: string[];
    branchesLatex: string[];
  }>;
};

function uniqueStrings(entries: readonly string[] | undefined) {
  return [...new Set((entries ?? []).filter(Boolean))];
}

function branchKey(branch: FiniteRootBranch) {
  return JSON.stringify({
    latex: branch.latex,
    node: branch.node ?? null,
    validation: branch.validation?.kind ?? 'unchecked',
  });
}

function uniqueBranches(branches: readonly (string | FiniteRootBranch)[], source: string): FiniteRootBranch[] {
  const seen = new Set<string>();
  const result: FiniteRootBranch[] = [];

  for (const branch of branches) {
    const resolved = typeof branch === 'string' ? { latex: branch, source } : branch;
    const key = branchKey(resolved);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(resolved);
    }
  }

  return result;
}

function caseKey(entry: CasewiseSolutionCase) {
  return JSON.stringify({
    branchEquationLatex: entry.branchEquationLatex ?? null,
    conditionsLatex: uniqueStrings(entry.conditionsLatex),
    integerParameters: uniqueStrings(entry.integerParameters),
    solutionBranches: entry.solutionBranches.map(branchKey),
  });
}

export function createCasewiseSolution(input: {
  targetLatex: string;
  source: string;
  cases: readonly {
    id?: string;
    source?: string;
    branchEquationLatex?: string;
    conditionsLatex?: readonly string[];
    integerParameters?: readonly string[];
    solutionBranches: readonly (string | FiniteRootBranch)[];
  }[];
}): CasewiseSolution {
  const seen = new Set<string>();
  const cases: CasewiseSolutionCase[] = [];

  input.cases.forEach((entry, index) => {
    const source = entry.source ?? input.source;
    const resolved: CasewiseSolutionCase = {
      id: entry.id ?? `case-${index + 1}`,
      source,
      ...(entry.branchEquationLatex ? { branchEquationLatex: entry.branchEquationLatex } : {}),
      conditionsLatex: uniqueStrings(entry.conditionsLatex),
      integerParameters: uniqueStrings(entry.integerParameters),
      solutionBranches: uniqueBranches(entry.solutionBranches, source),
    };
    const key = caseKey(resolved);
    if (!seen.has(key)) {
      seen.add(key);
      cases.push(resolved);
    }
  });

  return {
    kind: 'casewise-solution',
    targetLatex: input.targetLatex,
    source: input.source,
    cases,
  };
}

function flatBranches(solution: CasewiseSolution): FiniteRootBranch[] {
  return solution.cases.flatMap((entry) => entry.solutionBranches);
}

export function renderCasewiseSolution(
  solution: CasewiseSolution,
  options: FiniteRootSetRenderOptions = {},
): CasewiseSolutionRender {
  const rendered = renderFiniteRootSet(
    createFiniteRootSet({
      targetLatex: solution.targetLatex,
      branches: flatBranches(solution),
      source: solution.source,
    }),
    {
      preserveOrder: true,
      ...options,
    },
  );

  return {
    exactLatex: rendered.exactLatex,
    branchReadback: rendered.branchReadback,
    branchesLatex: rendered.branchesLatex,
    cases: solution.cases.map((entry) => ({
      id: entry.id,
      ...(entry.branchEquationLatex ? { branchEquationLatex: entry.branchEquationLatex } : {}),
      conditionsLatex: uniqueStrings(entry.conditionsLatex),
      integerParameters: uniqueStrings(entry.integerParameters),
      branchesLatex: renderFiniteRootSet(
        createFiniteRootSet({
          targetLatex: solution.targetLatex,
          branches: entry.solutionBranches,
          source: entry.source,
        }),
        { preserveOrder: true },
      ).branchesLatex,
    })),
  };
}
