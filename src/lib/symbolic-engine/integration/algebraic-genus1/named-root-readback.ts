import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  buildAlgebraicGenus1RealBranchFacts,
  type AlgebraicGenus1RadicandSignBranch,
  type AlgebraicGenus1RealBranchFactsResult,
  type AlgebraicGenus1RealRootEvidence,
} from './real-branch-facts';

export type AlgebraicGenus1NamedRootReadbackDetail = {
  title: string;
  lines: string[];
};

export type AlgebraicGenus1NamedRootReadbackResult =
  | {
      kind: 'success';
      variable: string;
      radicandLatex: string;
      rootSymbolsLatex: string[];
      roots: AlgebraicGenus1RealRootEvidence[];
      branchRows: AlgebraicGenus1RadicandSignBranch[];
      realDomainRows: AlgebraicGenus1RadicandSignBranch[];
      endpointExclusionFacts: ExactSupplementEntry[];
      detailSections: AlgebraicGenus1NamedRootReadbackDetail[];
      readinessNotes: string[];
    }
  | {
      kind: 'stop';
      variable: string;
      reason:
        | 'branch-facts-stop'
        | 'raw-rootof-leak';
      branchFacts?: AlgebraicGenus1RealBranchFactsResult;
      detail?: string;
    };

function hasRawRootOf(lines: readonly string[]) {
  return lines.some((line) => /RootOf|rootof/i.test(line));
}

function polynomialDefinitionLine(variable: string, radicandLatex: string) {
  return `P\\left(${variable}\\right)=${radicandLatex}`;
}

function formatBoundary(value: number) {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 1e-9) {
    return `${rounded}`;
  }
  return value.toPrecision(8).replace(/\.?0+$/u, '');
}

function rootDefinitionLine(variable: string, root: AlgebraicGenus1RealRootEvidence) {
  return `${root.label}\\text{ is the unique real root of }P\\left(${variable}\\right)=0\\text{ in }(${[
    root.interval.left,
    root.interval.right,
  ].map(formatBoundary).join(',')})`;
}

function orderedRootsLine(roots: readonly AlgebraicGenus1RealRootEvidence[]) {
  return roots.map((root) => root.label).join('<');
}

function branchLine(row: AlgebraicGenus1RadicandSignBranch, variable: string) {
  const relation = row.sign > 0 ? '>' : '<';
  return `${row.intervalLatex}: P\\left(${variable}\\right)${relation}0`;
}

function endpointLine(fact: ExactSupplementEntry) {
  return 'latex' in fact
    ? fact.latex
    : `${fact.expressionLatex}${fact.relation}`;
}

function buildDetails(input: {
  variable: string;
  radicandLatex: string;
  roots: AlgebraicGenus1RealRootEvidence[];
  branchRows: AlgebraicGenus1RadicandSignBranch[];
  endpointExclusionFacts: ExactSupplementEntry[];
}) {
  const rootLines = [
    polynomialDefinitionLine(input.variable, input.radicandLatex),
    ...input.roots.map((root) => rootDefinitionLine(input.variable, root)),
    `${orderedRootsLine(input.roots)}\\text{ in increasing real order}`,
  ];
  const branchLines = input.branchRows.map((row) => branchLine(row, input.variable));
  const details: AlgebraicGenus1NamedRootReadbackDetail[] = [
    {
      title: 'Genus-1 Root Definitions',
      lines: rootLines,
    },
    {
      title: 'Real Branch Rows',
      lines: branchLines,
    },
  ];

  if (input.endpointExclusionFacts.length > 0) {
    details.push({
      title: 'Endpoint Exclusions',
      lines: input.endpointExclusionFacts.map(endpointLine),
    });
  }

  return details;
}

export function buildAlgebraicGenus1NamedRootReadback(
  node: unknown,
  variable = 'x',
): AlgebraicGenus1NamedRootReadbackResult {
  const branchFacts = buildAlgebraicGenus1RealBranchFacts(node, variable);
  if (branchFacts.kind === 'stop') {
    return {
      kind: 'stop',
      variable,
      reason: 'branch-facts-stop',
      branchFacts,
      detail: branchFacts.detail,
    };
  }

  const detailSections = buildDetails({
    variable,
    radicandLatex: branchFacts.radicandLatex,
    roots: branchFacts.roots,
    branchRows: branchFacts.branchRows,
    endpointExclusionFacts: branchFacts.endpointExclusionFacts,
  });
  const allLines = detailSections.flatMap((section) => [
    section.title,
    ...section.lines,
  ]);
  if (hasRawRootOf(allLines)) {
    return {
      kind: 'stop',
      variable,
      reason: 'raw-rootof-leak',
      branchFacts,
      detail: 'Named-root readback must not expose raw RootOf text.',
    };
  }

  return {
    kind: 'success',
    variable,
    radicandLatex: branchFacts.radicandLatex,
    rootSymbolsLatex: branchFacts.roots.map((root) => root.label),
    roots: branchFacts.roots,
    branchRows: branchFacts.branchRows,
    realDomainRows: branchFacts.realDomainRows,
    endpointExclusionFacts: branchFacts.endpointExclusionFacts,
    detailSections,
    readinessNotes: [
      ...branchFacts.readinessNotes,
      'Named root definitions are detail-only evidence; main answers must use named roots rather than raw implicit-root notation.',
    ],
  };
}
