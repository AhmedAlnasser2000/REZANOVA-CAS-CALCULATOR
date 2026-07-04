import type { DisplayBranchReadback } from '../../../types/calculator';
import type { DisplayBlock, DisplayBlockCountSummary, DisplayBlockLine } from './display-blocks';

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

export function rootCountSummary(
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

export function caseMathCountSummary(
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
