import type {
  DisplayDetailLineKind,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  PeriodicFamilyInfo,
} from '../../../types/calculator';
import { detailLineKindAt, detailLinePartsAt } from './result-detail-lines';
import {
  displayDetailSectionsForPolicy,
  type ResultDetailPolicy,
} from './result-detail-policy';
import { buildResultReadbackSections } from './result-readback';
import {
  extractFiniteBranchReadback,
  normalizeFiniteBranchReadback,
} from './branch-readback';

export type DisplayBlockKind =
  | 'answer'
  | 'approx'
  | 'validWhen'
  | 'periodicFamily'
  | 'detail'
  | 'warning'
  | 'errorText';

export type DisplayBlockRenderKind =
  | 'branchList'
  | 'caseMath'
  | 'math'
  | 'text'
  | 'mixed'
  | 'mathList';

export type DisplayBlockLine = {
  id: string;
  approxText?: string;
  branchLatex?: string;
  branchPrefixLatex?: string;
  label?: string;
  latex?: string;
  lineKind?: DisplayDetailLineKind;
  parts?: DisplayDetailLinePart[];
  testId?: string;
  text?: string;
};

export type DisplayBlock = {
  id: string;
  kind: DisplayBlockKind;
  label: string;
  renderKind: DisplayBlockRenderKind;
  branchCount?: number;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  latex?: string;
  lines?: DisplayBlockLine[];
  rawContent: string[];
  testId?: string;
  text?: string;
};

export type BuildDisplayBlocksOptions = {
  detailPolicy?: ResultDetailPolicy;
  getPeriodicStopReasonText?: (
    reason: NonNullable<PeriodicFamilyInfo['structuredStopReason']>,
  ) => string;
  showApproxReadback?: boolean;
};

type SuccessDisplayOutcome = Extract<DisplayOutcome, { kind: 'success' }>;

export function isVerboseDisplayBlockLines(lines: readonly string[]) {
  const joined = lines.join(' ');
  return lines.length > 2 || joined.length > 160;
}

function isPrimaryApproximateOutcome(
  outcome: DisplayOutcome,
): outcome is SuccessDisplayOutcome & { approxText: string } {
  return outcome.kind === 'success'
    && !outcome.exactLatex
    && Boolean(outcome.approxText)
    && (
      outcome.solutionKind === 'approximate-numeric'
      || outcome.resultOrigin === 'numeric-fallback'
    );
}

function cloneParts(parts: readonly DisplayDetailLinePart[] | undefined) {
  return parts?.map((part) => ({ ...part }));
}

const CASE_MATH_DETAIL_TITLES = new Set([
  'Real Cardano Cases',
  'Real Ferrari Cases',
]);

function caseMathSectionFromOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    ? outcome.detailSections?.find((section) => CASE_MATH_DETAIL_TITLES.has(section.title))
    : undefined;
}

function caseMathTargetLatex(answerLatex: string) {
  const match = answerLatex.match(/^(.+?)\\in\\begin\{cases\}/);
  return match?.[1] ? `${match[1]}\\in` : null;
}

function caseMathAnswerBlockFromOutcome(
  outcome: DisplayOutcome,
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  const section = caseMathSectionFromOutcome(outcome);
  const targetLatex = caseMathTargetLatex(answerLatex);
  if (!section?.lineParts || !targetLatex) {
    return null;
  }

  const maybeLines = section.lineParts.map((parts, index): DisplayBlockLine | null => {
    const mathParts = parts.filter((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math');
    if (mathParts.length < 2) {
      return null;
    }
    return {
      id: `answer-case-${index}`,
      label: mathParts[1].latex,
      latex: mathParts[0].latex,
      parts: cloneParts(parts),
      testId: `display-outcome-answer-case-${index}`,
      text: section.lines[index],
    };
  });

  if (maybeLines.some((line) => line === null)) {
    return null;
  }
  const lines = maybeLines.filter((line): line is DisplayBlockLine => line !== null);

  return {
    id: 'answer',
    kind: 'answer',
    label,
    renderKind: 'caseMath',
    latex: answerLatex,
    lines: lines as DisplayBlockLine[],
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
    text: targetLatex,
  };
}

function detailBlockFromSection(section: DisplayDetailSection, sectionIndex: number): DisplayBlock {
  const lines = section.lines.map((line, lineIndex): DisplayBlockLine => {
    const parts = detailLinePartsAt(section, lineIndex);
    return {
      id: `detail-${sectionIndex}-line-${lineIndex}`,
      lineKind: detailLineKindAt(section, lineIndex),
      parts: cloneParts(parts),
      testId: `display-outcome-detail-line-${sectionIndex}-${lineIndex}`,
      text: line,
    };
  });

  return {
    id: `detail-${sectionIndex}`,
    kind: 'detail',
    label: section.title,
    renderKind: 'mixed',
    collapsible: true,
    defaultCollapsed: CASE_MATH_DETAIL_TITLES.has(section.title) || isVerboseDisplayBlockLines(section.lines),
    lines,
    rawContent: [...section.lines],
    testId: `display-outcome-detail-section-${sectionIndex}`,
  };
}

function periodicFamilyBlocks(
  family: PeriodicFamilyInfo | undefined,
  getPeriodicStopReasonText: BuildDisplayBlocksOptions['getPeriodicStopReasonText'],
) {
  if (!family) {
    return [];
  }

  const blocks: DisplayBlock[] = [];

  if (family.representatives?.length) {
    blocks.push({
      id: 'periodic-representatives',
      kind: 'periodicFamily',
      label: 'Representative Branches',
      renderKind: 'mixed',
      lines: family.representatives.map((representative, index) => ({
        id: `periodic-representative-${index}`,
        approxText: representative.approxText,
        label: representative.label,
        latex: representative.exactLatex,
        text: representative.label,
      })),
      rawContent: family.representatives.map((representative) => [
        representative.label,
        representative.exactLatex,
        representative.approxText,
      ].filter(Boolean).join(' ')),
      testId: 'display-outcome-periodic-representatives',
    });
  }

  if (family.principalRangeLatex) {
    blocks.push({
      id: 'periodic-principal-range',
      kind: 'periodicFamily',
      label: 'Principal Range',
      renderKind: 'math',
      latex: family.principalRangeLatex,
      rawContent: [family.principalRangeLatex],
      testId: 'display-outcome-periodic-principal-range',
    });
  }

  if (family.piecewiseBranches?.length) {
    const lines = family.piecewiseBranches.flatMap((branch, index): DisplayBlockLine[] => [
      {
        id: `periodic-piecewise-${index}-condition`,
        latex: `\\text{if } ${branch.conditionLatex}`,
      },
      {
        id: `periodic-piecewise-${index}-result`,
        latex: branch.resultLatex,
      },
    ]);
    blocks.push({
      id: 'periodic-piecewise',
      kind: 'periodicFamily',
      label: 'Piecewise Exact Branches',
      renderKind: 'mathList',
      lines,
      rawContent: family.piecewiseBranches.flatMap((branch) => [
        `\\text{if } ${branch.conditionLatex}`,
        branch.resultLatex,
      ]),
      testId: 'display-outcome-periodic-piecewise',
    });
  }

  if (family.parameterConstraintLatex?.length) {
    blocks.push({
      id: 'periodic-parameter-constraints',
      kind: 'periodicFamily',
      label: 'Parameter constraints',
      renderKind: 'mathList',
      collapsible: true,
      defaultCollapsed: isVerboseDisplayBlockLines(family.parameterConstraintLatex),
      lines: family.parameterConstraintLatex.map((constraint, index) => ({
        id: `periodic-parameter-constraint-${index}`,
        latex: constraint,
      })),
      rawContent: [...family.parameterConstraintLatex],
      testId: 'display-outcome-periodic-parameter-constraints',
    });
  }

  if (family.discoveredFamilies?.length) {
    blocks.push({
      id: 'periodic-discovered-families',
      kind: 'periodicFamily',
      label: 'Discovered Families',
      renderKind: 'mathList',
      lines: family.discoveredFamilies.map((familyLatex, index) => ({
        id: `periodic-discovered-family-${index}`,
        latex: familyLatex,
      })),
      rawContent: [...family.discoveredFamilies],
      testId: 'display-outcome-periodic-discovered-families',
    });
  }

  if (family.reducedCarrierLatex) {
    const latex = `\\text{Reduced carrier: } ${family.reducedCarrierLatex}`;
    blocks.push({
      id: 'periodic-reduced-carrier',
      kind: 'periodicFamily',
      label: 'Reduced Carrier',
      renderKind: 'math',
      latex,
      rawContent: [latex],
      testId: 'display-outcome-periodic-reduced-carrier',
    });
  }

  if (family.structuredStopReason) {
    const text = getPeriodicStopReasonText?.(family.structuredStopReason)
      ?? family.structuredStopReason;
    blocks.push({
      id: 'periodic-stop-reason',
      kind: 'periodicFamily',
      label: 'Exact Closure Boundary',
      renderKind: 'text',
      text,
      rawContent: [text],
      testId: 'display-outcome-periodic-stop-reason',
    });
  }

  if (family.suggestedIntervals?.length) {
    blocks.push({
      id: 'periodic-intervals',
      kind: 'periodicFamily',
      label: 'Suggested Intervals',
      renderKind: 'text',
      lines: family.suggestedIntervals.map((suggestion) => ({
        id: `periodic-interval-${suggestion.label}`,
        text: `${suggestion.label}: [${suggestion.start}, ${suggestion.end}]`,
      })),
      rawContent: family.suggestedIntervals.map(
        (suggestion) => `${suggestion.label}: [${suggestion.start}, ${suggestion.end}]`,
      ),
      testId: 'display-outcome-periodic-intervals',
    });
  }

  return blocks;
}

function primaryApproximateAnswerBlock(outcome: DisplayOutcome): DisplayBlock | null {
  if (!isPrimaryApproximateOutcome(outcome) || !outcome.approxText) {
    return null;
  }

  const branchReadback = normalizeFiniteBranchReadback(outcome.branchReadback);
  if (branchReadback) {
    return {
      id: 'answer',
      kind: 'answer',
      label: outcome.branchReadback?.label ?? 'Numeric Roots',
      renderKind: 'branchList',
      branchCount: branchReadback.rows.length,
      latex: branchReadback.originalLatex,
      lines: branchReadback.rows.map((row, index) => ({
        id: `answer-branch-${index}`,
        branchLatex: row.branchLatex,
        branchPrefixLatex: row.prefixLatex,
        latex: row.rowLatex,
        testId: `display-outcome-answer-branch-${index}`,
      })),
      rawContent: [outcome.approxText],
      testId: 'display-outcome-answer-block',
    };
  }

  return {
    id: 'answer',
    kind: 'answer',
    label: 'Numeric Roots',
    renderKind: 'text',
    text: outcome.approxText,
    rawContent: [outcome.approxText],
    testId: 'display-outcome-answer-block',
  };
}

export function buildDisplayBlocks(
  outcome: DisplayOutcome | null | undefined,
  options: BuildDisplayBlocksOptions = {},
): DisplayBlock[] {
  if (!outcome || outcome.kind === 'prompt') {
    return [];
  }

  const blocks: DisplayBlock[] = [];
  const primaryApproximateBlock = primaryApproximateAnswerBlock(outcome);

  if (outcome.kind === 'error') {
    blocks.push({
      id: 'error-text',
      kind: 'errorText',
      label: 'Error',
      renderKind: 'text',
      text: outcome.error,
      rawContent: [outcome.error],
      testId: 'display-outcome-error-text',
    });
  }

  if (primaryApproximateBlock) {
    blocks.push(primaryApproximateBlock);
  }

  for (const section of buildResultReadbackSections(outcome)) {
    if (section.kind === 'answer') {
      const caseMathBlock = caseMathAnswerBlockFromOutcome(outcome, section.latex, section.label);
      if (caseMathBlock) {
        blocks.push(caseMathBlock);
        continue;
      }

      const metadataBranchReadback = normalizeFiniteBranchReadback(
        outcome.branchReadback,
        section.latex,
      );
      const branchReadback = metadataBranchReadback ?? extractFiniteBranchReadback(section.latex);
      if (branchReadback) {
        blocks.push({
          id: 'answer',
          kind: 'answer',
          label: metadataBranchReadback && outcome.branchReadback?.label
            ? outcome.branchReadback.label
            : section.label,
          renderKind: 'branchList',
          branchCount: branchReadback.rows.length,
          latex: section.latex,
          lines: branchReadback.rows.map((row, index) => ({
            id: `answer-branch-${index}`,
            branchLatex: row.branchLatex,
            branchPrefixLatex: row.prefixLatex,
            latex: row.rowLatex,
            testId: `display-outcome-answer-branch-${index}`,
          })),
          rawContent: [section.latex],
          testId: 'display-outcome-answer-block',
        });
        continue;
      }

      blocks.push({
        id: 'answer',
        kind: 'answer',
        label: section.label,
        renderKind: 'math',
        latex: section.latex,
        rawContent: [section.latex],
        testId: 'display-outcome-answer-block',
      });
      continue;
    }

    blocks.push({
      id: 'valid-when',
      kind: 'validWhen',
      label: `${section.label}${section.latex.length > 1 ? ` · ${section.latex.length} facts` : ''}`,
      renderKind: 'mathList',
      collapsible: true,
      defaultCollapsed: isVerboseDisplayBlockLines(section.latex),
      lines: section.latex.map((latex, index) => ({
        id: `valid-when-${index}`,
        latex,
        testId: `display-outcome-supplement-${index}`,
      })),
      rawContent: [...section.latex],
      testId: 'display-outcome-valid-when',
    });
  }

  if (options.showApproxReadback && outcome.approxText && !primaryApproximateBlock) {
    blocks.push({
      id: 'approx',
      kind: 'approx',
      label: 'Approx',
      renderKind: 'text',
      text: outcome.approxText,
      rawContent: [outcome.approxText],
      testId: 'display-outcome-approx',
    });
  }

  blocks.push(...periodicFamilyBlocks(outcome.periodicFamily, options.getPeriodicStopReasonText));

  const detailSections = displayDetailSectionsForPolicy(
    outcome.detailSections,
    options.detailPolicy ?? { detailedFactsEnabled: false },
  );
  detailSections?.forEach((section, index) => {
    blocks.push(detailBlockFromSection(section, index));
  });

  if (outcome.warnings.length > 0) {
    blocks.push({
      id: 'warnings',
      kind: 'warning',
      label: 'Warnings',
      renderKind: 'text',
      lines: outcome.warnings.map((warning, index) => ({
        id: `warning-${index}`,
        text: warning,
      })),
      rawContent: [...outcome.warnings],
      testId: 'display-outcome-warnings',
    });
  }

  return blocks;
}
