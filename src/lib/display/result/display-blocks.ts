import type {
  DisplayBranchReadback,
  DisplayDetailLineKind,
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
  ModeId,
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
import { trustSummaryForDisplayOutcome } from './display-trust-summary';

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
  conditionLatex?: string;
  groupLatex?: string;
  label?: string;
  latex?: string;
  lineKind?: DisplayDetailLineKind;
  parts?: DisplayDetailLinePart[];
  testId?: string;
  text?: string;
};

export type DisplayBlockCountSummary = {
  kind: 'roots' | 'caseRows' | 'branchFamilies';
  text: string;
  rootCount?: number;
  rootLabel?: NonNullable<DisplayBranchReadback['countLabel']>;
  branchFamilyCount?: number;
  guardedRowCount?: number;
};

export type DisplayBlock = {
  id: string;
  kind: DisplayBlockKind;
  label: string;
  renderKind: DisplayBlockRenderKind;
  branchCount?: number;
  className?: string;
  collapsible?: boolean;
  countSummary?: DisplayBlockCountSummary;
  defaultCollapsed?: boolean;
  latex?: string;
  lines?: DisplayBlockLine[];
  rawContent: string[];
  testId?: string;
  text?: string;
  trustSummary?: string;
};

export type BuildDisplayBlocksOptions = {
  detailPolicy?: ResultDetailPolicy;
  getPeriodicStopReasonText?: (
    reason: NonNullable<PeriodicFamilyInfo['structuredStopReason']>,
  ) => string;
  showApproxReadback?: boolean;
  sourceMode?: ModeId;
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
  'Absolute-Value Formula Cases',
  'Square-Power Formula Cases',
  'Even-Power Formula Cases',
  'Nth-Root Formula Cases',
  'Trig Formula Cases',
  'Real Cardano Cases',
  'Real Ferrari Cases',
]);

const GROUPED_FORMULA_CASE_DETAIL_TITLES = new Set([
  'Absolute-Value Formula Cases',
  'Square-Power Formula Cases',
  'Even-Power Formula Cases',
  'Nth-Root Formula Cases',
  'Trig Formula Cases',
]);

const DETAIL_TITLES_VISIBLE_BY_DEFAULT = new Set([
  'Extraneous Solutions',
  'Column Space Proof',
  'Coordinate Facts',
  'Coordinate Proof',
  'Change-of-Basis Facts',
  'Change-of-Basis Proof',
  'Basis Facts',
  'Basis Proof',
  'Eigenspaces',
  'Gram-Schmidt Proof',
  'How Eigenvalues Were Found',
  'Invertibility Theorem',
  'Null Space Proof',
  'LU Factors', 'LU Proof', 'PLU Factors', 'PLU Proof', 'PLU Row Swaps', 'Factor Solve Proof', 'QR Factors', 'QR Proof',
  'Orthonormal Basis',
  'Rank/Nullity Guidance',
  'System Proof', 'Multi-RHS Proof', 'Inverse Comparison',
]);

const DETAIL_TITLES_COLLAPSED_BY_DEFAULT = new Set([
  'Solve Note',
  'Row Reduction Steps', 'Factorization Row Steps', 'QR Column Steps',
]);

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

function rootCountSummary(
  rootCount: number,
  rootLabel: NonNullable<DisplayBranchReadback['countLabel']> = 'roots',
): DisplayBlockCountSummary {
  const noun = rootLabel === 'candidateRoots' ? 'candidate root' : 'root';
  return {
    kind: 'roots',
    rootCount,
    ...(rootLabel !== 'roots' ? { rootLabel } : {}),
    text: `${rootCount.toLocaleString()} ${plural(rootCount, noun)}`,
  };
}

function caseMathBranchFamilyCount(lines: readonly DisplayBlockLine[]) {
  return new Set(lines
    .map((line) => line.groupLatex?.trim())
    .filter((latex): latex is string => Boolean(latex))).size;
}

function caseMathCountSummary(
  lines: readonly DisplayBlockLine[],
  branchFamilyCount = caseMathBranchFamilyCount(lines),
): DisplayBlockCountSummary {
  const guardedRowCount = lines.length;
  if (branchFamilyCount > 0) {
    return {
      branchFamilyCount,
      guardedRowCount,
      kind: 'branchFamilies',
      text: [
        `${branchFamilyCount.toLocaleString()} ${plural(branchFamilyCount, 'branch family', 'branch families')}`,
        `${guardedRowCount.toLocaleString()} guarded ${plural(guardedRowCount, 'row')}`,
      ].join(' · '),
    };
  }

  return {
    guardedRowCount,
    kind: 'caseRows',
    text: `${guardedRowCount.toLocaleString()} guarded ${plural(guardedRowCount, 'row')}`,
  };
}

export function displayBlockCountSummary(block: DisplayBlock): DisplayBlockCountSummary | undefined {
  if (block.countSummary) {
    return block.countSummary;
  }

  if (block.renderKind === 'branchList') {
    const rootCount = block.branchCount ?? block.lines?.length ?? 0;
    return rootCount > 0 ? rootCountSummary(rootCount) : undefined;
  }

  if (block.renderKind === 'caseMath' && block.lines?.length) {
    return caseMathCountSummary(block.lines);
  }

  return undefined;
}

export function displayBlockSummaryText(block: DisplayBlock): string | undefined {
  return [
    block.trustSummary,
    displayBlockCountSummary(block)?.text,
  ].filter(Boolean).join(' · ') || undefined;
}

function caseMathSectionFromOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    ? outcome.detailSections?.find((section) => CASE_MATH_DETAIL_TITLES.has(section.title))
    : undefined;
}

function caseMathBranchFamilyCountFromSection(section: DisplayDetailSection) {
  if (!GROUPED_FORMULA_CASE_DETAIL_TITLES.has(section.title)) {
    return 0;
  }

  return new Set(section.lineParts
    ?.map((parts) => parts.find((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math')?.latex.trim())
    .filter((latex): latex is string => Boolean(latex)) ?? []).size;
}

function caseMathTargetLatex(answerLatex: string) {
  const match = answerLatex.trim().match(/^(.+?)\\in\s*\\begin\{cases\}/su);
  return match?.[1] ? `${match[1]}\\in` : null;
}

function isEscaped(latex: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && latex[cursor] === '\\'; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findTopLevelToken(latex: string, token: string, startIndex = 0) {
  let depth = 0;
  for (let index = startIndex; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === '{' && !isEscaped(latex, index)) {
      depth += 1;
    } else if (char === '}' && !isEscaped(latex, index)) {
      depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && latex.startsWith(token, index)) {
      return index;
    }
  }
  return -1;
}

function matchingBraceIndex(latex: string, openingBraceIndex: number) {
  let depth = 0;
  for (let index = openingBraceIndex; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === '{' && !isEscaped(latex, index)) {
      depth += 1;
    } else if (char === '}' && !isEscaped(latex, index)) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function splitSubstackLatex(latex: string) {
  const separator = findTopLevelToken(latex, String.raw`\\`);
  if (separator < 0) {
    return {
      conditionLatex: latex.trim(),
      groupLatex: undefined,
    };
  }

  return {
    conditionLatex: latex.slice(separator + 2).trim(),
    groupLatex: latex.slice(0, separator).trim(),
  };
}

function parsedSubstackCaseLines(answerLatex: string) {
  const trimmed = answerLatex.trim();
  const casesMatch = trimmed.match(/^(.+?)\\in\s*\\begin\{cases\}([\s\S]*)\\end\{cases\}$/u);
  if (!casesMatch) {
    return null;
  }

  const body = casesMatch[2] ?? '';
  const delimiter = String.raw`,&\substack`;
  const lines: DisplayBlockLine[] = [];
  let cursor = 0;

  while (cursor < body.length) {
    const delimiterIndex = findTopLevelToken(body, delimiter, cursor);
    if (delimiterIndex < 0) {
      return null;
    }

    const valueLatex = body.slice(cursor, delimiterIndex).trim();
    const substackStart = delimiterIndex + delimiter.length;
    if (body[substackStart] !== '{') {
      return null;
    }

    const substackEnd = matchingBraceIndex(body, substackStart);
    if (substackEnd < 0) {
      return null;
    }

    const { conditionLatex, groupLatex } = splitSubstackLatex(
      body.slice(substackStart + 1, substackEnd),
    );
    lines.push({
      id: `answer-replayed-case-${lines.length}`,
      conditionLatex,
      groupLatex,
      label: conditionLatex,
      latex: valueLatex,
      testId: `display-outcome-answer-replayed-case-${lines.length}`,
      text: [
        groupLatex ? `${groupLatex}: ` : '',
        valueLatex,
        conditionLatex ? `, ${conditionLatex}` : '',
      ].join(''),
    });

    cursor = substackEnd + 1;
    if (body.startsWith(String.raw`\\`, cursor)) {
      cursor += 2;
    }
    while (/\s/u.test(body[cursor] ?? '')) {
      cursor += 1;
    }
  }

  if (lines.length === 0) {
    return null;
  }

  const groupedCaseLabels = [...new Set(lines
    .map((line) => line.groupLatex)
    .filter((latex): latex is string => Boolean(latex)))];
  const showGroupedCaseLabels = groupedCaseLabels.length > 1;
  return lines.map((line) => (
    showGroupedCaseLabels
      ? line
      : {
        ...line,
        groupLatex: undefined,
      }
  ));
}

function caseMathLinesFromSection(
  section: DisplayDetailSection,
  idPrefix: string,
  testIdPrefix: string,
) {
  if (!section.lineParts) {
    return null;
  }

  const groupedCaseSection = GROUPED_FORMULA_CASE_DETAIL_TITLES.has(section.title);
  const groupedCaseLabels = groupedCaseSection
    ? [...new Set(section.lineParts
      .map((parts) => parts.find((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
        part.kind === 'math')?.latex)
      .filter((latex): latex is string => Boolean(latex)))]
    : [];
  const showGroupedCaseLabels = groupedCaseLabels.length > 1;
  const maybeLines = section.lineParts.map((parts, index): DisplayBlockLine | null => {
    const mathParts = parts.filter((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math');
    if (mathParts.length < (groupedCaseSection ? 3 : 2)) {
      return null;
    }
    const conditionLatex = groupedCaseSection ? mathParts[2].latex : mathParts[1].latex;
    return {
      id: `${idPrefix}-case-${index}`,
      conditionLatex,
      ...(groupedCaseSection && showGroupedCaseLabels ? { groupLatex: mathParts[0].latex } : {}),
      label: conditionLatex,
      latex: groupedCaseSection ? mathParts[1].latex : mathParts[0].latex,
      parts: cloneParts(parts),
      testId: `${testIdPrefix}-case-${index}`,
      text: section.lines[index],
    };
  });

  if (maybeLines.some((line) => line === null)) {
    return null;
  }
  return maybeLines.filter((line): line is DisplayBlockLine => line !== null);
}

function caseMathAnswerBlockFromOutcome(
  outcome: DisplayOutcome,
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  const section = caseMathSectionFromOutcome(outcome);
  const targetLatex = caseMathTargetLatex(answerLatex);
  if (!section || !targetLatex) {
    return null;
  }

  const lines = caseMathLinesFromSection(section, 'answer', 'display-outcome-answer');
  if (!lines) {
    return null;
  }

  return {
    id: 'answer',
    kind: 'answer',
    label,
    renderKind: 'caseMath',
    collapsible: true,
    defaultCollapsed: false,
    countSummary: caseMathCountSummary(
      lines,
      caseMathBranchFamilyCountFromSection(section),
    ),
    latex: answerLatex,
    lines: lines as DisplayBlockLine[],
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
    text: targetLatex,
  };
}

function caseMathAnswerBlockFromLatex(
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  const targetLatex = caseMathTargetLatex(answerLatex);
  const lines = parsedSubstackCaseLines(answerLatex);
  if (!targetLatex || !lines) {
    return null;
  }

  return {
    id: 'answer',
    kind: 'answer',
    label,
    renderKind: 'caseMath',
    collapsible: true,
    defaultCollapsed: false,
    countSummary: caseMathCountSummary(lines),
    latex: answerLatex,
    lines,
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
    text: targetLatex,
  };
}

function detailBlockFromSection(section: DisplayDetailSection, sectionIndex: number): DisplayBlock {
  const caseMathLines = CASE_MATH_DETAIL_TITLES.has(section.title)
    ? caseMathLinesFromSection(
      section,
      `detail-${sectionIndex}`,
      `display-outcome-detail-line-${sectionIndex}`,
    )
    : null;
  if (caseMathLines) {
    return {
      id: `detail-${sectionIndex}`,
      kind: 'detail',
      label: section.title,
      renderKind: 'caseMath',
      collapsible: true,
      defaultCollapsed: true,
      lines: caseMathLines,
      rawContent: [...section.lines],
      testId: `display-outcome-detail-section-${sectionIndex}`,
      text: '',
    };
  }

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
  const defaultCollapsed = DETAIL_TITLES_COLLAPSED_BY_DEFAULT.has(section.title)
    || (
      !DETAIL_TITLES_VISIBLE_BY_DEFAULT.has(section.title)
      && (CASE_MATH_DETAIL_TITLES.has(section.title) || isVerboseDisplayBlockLines(section.lines))
    );

  return {
    id: `detail-${sectionIndex}`,
    kind: 'detail',
    label: section.title,
    renderKind: 'mixed',
    collapsible: true,
    defaultCollapsed,
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
      collapsible: true,
      defaultCollapsed: false,
      countSummary: rootCountSummary(
        branchReadback.rows.length,
        branchReadback.countLabel ?? 'roots',
      ),
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
    collapsible: true,
    defaultCollapsed: false,
    text: outcome.approxText,
    rawContent: [outcome.approxText],
    testId: 'display-outcome-answer-block',
  };
}

function isLinearAlgebraSourceMode(mode: ModeId | undefined) {
  return mode === 'matrix' || mode === 'vector';
}

function displayOutcomeSourceMode(outcome: DisplayOutcome) {
  return outcome.kind === 'success' || outcome.kind === 'error'
    ? outcome.sourceMode
    : undefined;
}

function allowsImplicitBranchReadback(outcome: DisplayOutcome, options: BuildDisplayBlocksOptions) {
  return !isLinearAlgebraSourceMode(options.sourceMode ?? displayOutcomeSourceMode(outcome));
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
  const trustSummary = trustSummaryForDisplayOutcome(outcome);

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
    blocks.push({
      ...primaryApproximateBlock,
      trustSummary,
    });
  }

  for (const section of buildResultReadbackSections(outcome)) {
    if (section.kind === 'answer') {
      const caseMathBlock = caseMathAnswerBlockFromOutcome(outcome, section.latex, section.label);
      if (caseMathBlock) {
        blocks.push({
          ...caseMathBlock,
          trustSummary,
        });
        continue;
      }

      const replayedCaseMathBlock = caseMathAnswerBlockFromLatex(section.latex, section.label);
      if (replayedCaseMathBlock) {
        blocks.push({
          ...replayedCaseMathBlock,
          trustSummary,
        });
        continue;
      }

      const metadataBranchReadback = normalizeFiniteBranchReadback(
        outcome.branchReadback,
        section.latex,
      );
      const branchReadback = metadataBranchReadback
        ?? (allowsImplicitBranchReadback(outcome, options)
          ? extractFiniteBranchReadback(section.latex)
          : null);
      if (branchReadback) {
        blocks.push({
          id: 'answer',
          kind: 'answer',
          label: metadataBranchReadback && outcome.branchReadback?.label
            ? outcome.branchReadback.label
            : section.label,
          renderKind: 'branchList',
          branchCount: branchReadback.rows.length,
          collapsible: true,
          defaultCollapsed: false,
          countSummary: rootCountSummary(
            branchReadback.rows.length,
            branchReadback.countLabel ?? 'roots',
          ),
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
          trustSummary,
        });
        continue;
      }

      blocks.push({
        id: 'answer',
        kind: 'answer',
        label: section.label,
        renderKind: 'math',
        collapsible: true,
        defaultCollapsed: false,
        latex: section.latex,
        rawContent: [section.latex],
        testId: 'display-outcome-answer-block',
        trustSummary,
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
