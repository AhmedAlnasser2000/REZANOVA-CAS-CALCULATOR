import type { DisplayBlock, DisplayBlockLine } from '../result/display-blocks';
import {
  caseMathRowRenderCost,
  shouldPauseCaseMathRowRender,
} from './display-render-scheduler';

export const FORMULA_VIEWER_DEFAULT_VIEWPORT_HEIGHT = 680;
export const FORMULA_VIEWER_OVERSCAN_PX = 360;

const HEADER_HEIGHT = 52;
const BLOCK_HEIGHT = 120;
const GROUP_HEIGHT = 54;
const ROW_HEIGHT = 118;
const PAUSED_ROW_HEIGHT = 132;

export type FormulaViewerVirtualItem =
  | {
      kind: 'block';
      key: string;
      block: DisplayBlock;
      estimatedHeight: number;
    }
  | {
      kind: 'detailHeader';
      key: string;
      block: DisplayBlock;
      opened: boolean;
      estimatedHeight: number;
    }
  | {
      kind: 'caseGroup';
      key: string;
      block: DisplayBlock;
      groupLatex: string;
      rowKey: string;
      rowIndex: number;
      pausedByDefault: boolean;
      estimatedHeight: number;
    }
  | {
      kind: 'caseRow';
      key: string;
      block: DisplayBlock;
      line: DisplayBlockLine;
      rowKey: string;
      rowIndex: number;
      isFirstRow: boolean;
      pausedByDefault: boolean;
      renderCost: number;
      estimatedHeight: number;
    };

export interface FormulaViewerVirtualLayoutEntry {
  item: FormulaViewerVirtualItem;
  index: number;
  offset: number;
  height: number;
  end: number;
}

export interface FormulaViewerVirtualLayout {
  entries: FormulaViewerVirtualLayoutEntry[];
  totalHeight: number;
}

export function formulaViewerBlockKey(block: DisplayBlock): string {
  return `${block.kind}:${block.id}`;
}

export function formulaViewerCaseRowKey(
  block: DisplayBlock,
  line: DisplayBlockLine,
  rowIndex: number,
): string {
  return `${formulaViewerBlockKey(block)}:case-row:${line.id ?? rowIndex}:${rowIndex}`;
}

export function buildFormulaViewerVirtualItems(
  blocks: DisplayBlock[],
  options: { openedBlockIds?: ReadonlySet<string> } = {},
): FormulaViewerVirtualItem[] {
  const openedBlockIds = options.openedBlockIds ?? new Set<string>();
  const items: FormulaViewerVirtualItem[] = [];

  blocks.forEach((block) => {
    if (block.kind === 'detail' || block.kind === 'periodicFamily') {
      const key = formulaViewerBlockKey(block);
      const opened = openedBlockIds.has(key) || block.collapsible === false;
      if (block.collapsible !== false) {
        items.push({
          kind: 'detailHeader',
          key: `${key}:header`,
          block,
          opened,
          estimatedHeight: HEADER_HEIGHT,
        });
      }
      if (opened) {
        appendBlockContent(items, block);
      }
      return;
    }

    appendBlockContent(items, block);
  });

  return items;
}

export function layoutFormulaViewerVirtualItems(
  items: FormulaViewerVirtualItem[],
  measuredHeights: ReadonlyMap<string, number> = new Map<string, number>(),
): FormulaViewerVirtualLayout {
  let offset = 0;
  const entries = items.map((item, index) => {
    const height = Math.max(1, measuredHeights.get(item.key) ?? item.estimatedHeight);
    const entry = {
      item,
      index,
      offset,
      height,
      end: offset + height,
    };
    offset += height;
    return entry;
  });

  return {
    entries,
    totalHeight: offset,
  };
}

export function visibleFormulaViewerVirtualItems(
  layout: FormulaViewerVirtualLayout,
  viewport: { scrollTop: number; height: number },
  overscanPx = FORMULA_VIEWER_OVERSCAN_PX,
): FormulaViewerVirtualLayoutEntry[] {
  const top = Math.max(0, viewport.scrollTop - overscanPx);
  const bottom = viewport.scrollTop + Math.max(1, viewport.height) + overscanPx;
  return layout.entries.filter((entry) => entry.end >= top && entry.offset <= bottom);
}

function appendBlockContent(items: FormulaViewerVirtualItem[], block: DisplayBlock): void {
  if (block.renderKind !== 'caseMath') {
    items.push({
      kind: 'block',
      key: `${formulaViewerBlockKey(block)}:body`,
      block,
      estimatedHeight: estimateBlockHeight(block),
    });
    return;
  }

  appendCaseMathItems(items, block);
}

function appendCaseMathItems(items: FormulaViewerVirtualItem[], block: DisplayBlock): void {
  const blockKey = formulaViewerBlockKey(block);
  items.push({
    kind: 'block',
    key: `${blockKey}:case-header`,
    block,
    estimatedHeight: HEADER_HEIGHT,
  });

  let previousGroup = '';
  let firstRow = true;
  const lines = block.lines ?? [];
  lines.forEach((line, rowIndex) => {
    const groupLatex = line.groupLatex?.trim() ?? '';
    const rowKey = formulaViewerCaseRowKey(block, line, rowIndex);
    const renderCost = caseMathRowRenderCost(line);
    const pausedByDefault = shouldPauseCaseMathRowRender(line, true);

    if (groupLatex && groupLatex !== previousGroup) {
      items.push({
        kind: 'caseGroup',
        key: `${blockKey}:case-group:${rowIndex}`,
        block,
        groupLatex,
        rowKey,
        rowIndex,
        pausedByDefault,
        estimatedHeight: GROUP_HEIGHT,
      });
      previousGroup = groupLatex;
    }

    items.push({
      kind: 'caseRow',
      key: rowKey,
      block,
      line,
      rowKey,
      rowIndex,
      isFirstRow: firstRow,
      pausedByDefault,
      renderCost,
      estimatedHeight: pausedByDefault ? PAUSED_ROW_HEIGHT : estimateCaseRowHeight(line),
    });
    firstRow = false;
  });
}

function estimateBlockHeight(block: DisplayBlock): number {
  const textLength =
    (block.lines ?? []).reduce(
      (sum, line) =>
        sum +
        (line.text?.length ?? 0) +
        (line.latex?.length ?? 0) +
        (line.parts?.reduce((partSum, part) => partSum + detailPartLength(part), 0) ?? 0),
      0,
    ) + block.label.length;
  return Math.min(420, Math.max(BLOCK_HEIGHT, 58 + Math.ceil(textLength / 52) * 28));
}

function detailPartLength(part: NonNullable<DisplayBlockLine['parts']>[number]): number {
  return part.kind === 'math' ? part.latex.length : part.text.length;
}

function estimateCaseRowHeight(line: DisplayBlockLine): number {
  const length =
    (line.latex?.length ?? 0) +
    (line.conditionLatex?.length ?? 0);
  return Math.min(340, Math.max(ROW_HEIGHT, 86 + Math.ceil(length / 120) * 34));
}
