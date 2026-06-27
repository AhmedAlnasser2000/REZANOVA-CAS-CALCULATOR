import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { MathStatic } from '../../../components/MathStatic';
import { NotationText } from '../../../components/NotationText';
import type { FormulaViewerArtifact } from '../../runtime/formula-viewer-artifacts';
import type { SymbolicDisplayPrefs } from '../../../lib/display/symbolic-display';
import type { DisplayBlock, DisplayBlockLine } from '../../../lib/display/result/display-blocks';
import {
  FORMULA_VIEWER_DEFAULT_VIEWPORT_HEIGHT,
  buildFormulaViewerVirtualItems,
  formulaViewerBlockKey,
  layoutFormulaViewerVirtualItems,
  visibleFormulaViewerVirtualItems,
  type FormulaViewerVirtualItem,
  type FormulaViewerVirtualLayoutEntry,
} from '../../../lib/display/scheduling/formula-viewer-virtualization';
import { CaseMathRowPlaceholder } from '../display-panel/CaseMathRenderControls';
import { DetailLineContent } from '../display-panel/DisplayResultBlocks';
import { FormulaViewerCaseRow } from './FormulaViewerReadability';

interface FormulaViewerVirtualizedContentProps {
  artifact: FormulaViewerArtifact;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
}

interface ViewerViewport {
  scrollTop: number;
  height: number;
}

export function FormulaViewerVirtualizedContent({
  artifact,
  symbolicDisplayPrefs,
}: FormulaViewerVirtualizedContentProps): ReactElement {
  const scrollRef = useRef<HTMLElement | null>(null);
  const pendingViewportFrameRef = useRef<number | null>(null);
  const [openedBlockIds, setOpenedBlockIds] = useState<ReadonlySet<string>>(
    () => defaultOpenedBlockIds(artifact),
  );
  const [expandedRowKeys, setExpandedRowKeys] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );
  const [measuredHeights, setMeasuredHeights] = useState<ReadonlyMap<string, number>>(
    () => new Map<string, number>(),
  );
  const [viewport, setViewport] = useState<ViewerViewport>({
    scrollTop: 0,
    height: FORMULA_VIEWER_DEFAULT_VIEWPORT_HEIGHT,
  });

  useEffect(() => {
    setOpenedBlockIds(defaultOpenedBlockIds(artifact));
    setExpandedRowKeys(new Set<string>());
    setMeasuredHeights(new Map<string, number>());
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.scrollTop = 0;
    }
    setViewport({
      scrollTop: 0,
      height: scrollElement?.clientHeight || FORMULA_VIEWER_DEFAULT_VIEWPORT_HEIGHT,
    });
  }, [artifact.resultSignature]);

  const blocks = useMemo(
    () => [artifact.primaryBlock, ...artifact.globalFactBlocks, ...artifact.detailBlocks],
    [artifact],
  );

  const virtualItems = useMemo(
    () => buildFormulaViewerVirtualItems(blocks, { openedBlockIds }),
    [blocks, openedBlockIds],
  );

  const layout = useMemo(
    () => layoutFormulaViewerVirtualItems(virtualItems, measuredHeights),
    [measuredHeights, virtualItems],
  );

  const visibleEntries = useMemo(
    () => visibleFormulaViewerVirtualItems(layout, viewport),
    [layout, viewport],
  );

  const updateViewport = useCallback(() => {
    pendingViewportFrameRef.current = null;
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }
    setViewport({
      scrollTop: scrollElement.scrollTop,
      height: scrollElement.clientHeight || FORMULA_VIEWER_DEFAULT_VIEWPORT_HEIGHT,
    });
  }, []);

  const scheduleViewportUpdate = useCallback(() => {
    if (pendingViewportFrameRef.current !== null) {
      return;
    }
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      pendingViewportFrameRef.current = window.requestAnimationFrame(updateViewport);
      return;
    }
    pendingViewportFrameRef.current = window.setTimeout(updateViewport, 16);
  }, [updateViewport]);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }
    updateViewport();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(updateViewport);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [updateViewport]);

  useEffect(
    () => () => {
      const pendingFrame = pendingViewportFrameRef.current;
      if (pendingFrame === null || typeof window === 'undefined') {
        return;
      }
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingFrame);
      } else {
        window.clearTimeout(pendingFrame);
      }
    },
    [],
  );

  const setMeasuredHeight = useCallback((key: string, height: number) => {
    if (height <= 0) {
      return;
    }
    const roundedHeight = Math.max(1, Math.ceil(height));
    setMeasuredHeights((current) => {
      if (current.get(key) === roundedHeight) {
        return current;
      }
      const next = new Map(current);
      next.set(key, roundedHeight);
      return next;
    });
  }, []);

  const toggleBlock = useCallback((block: DisplayBlock) => {
    const key = formulaViewerBlockKey(block);
    setOpenedBlockIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const showFormulaRow = useCallback((rowKey: string) => {
    setExpandedRowKeys((current) => {
      if (current.has(rowKey)) {
        return current;
      }
      const next = new Set(current);
      next.add(rowKey);
      return next;
    });
  }, []);

  return (
    <section
      ref={scrollRef}
      className="formula-viewer-scroll"
      data-testid="formula-viewer-scroll"
      onScroll={scheduleViewportUpdate}
    >
      <div
        className="formula-viewer-virtual-list"
        style={{ height: `${layout.totalHeight}px` }}
        data-testid="formula-viewer-virtual-list"
      >
        {visibleEntries.map((entry) => (
          <FormulaViewerVirtualItemShell
            key={entry.item.key}
            entry={entry}
            expandedRowKeys={expandedRowKeys}
            onMeasure={setMeasuredHeight}
          >
            <FormulaViewerVirtualItemRenderer
              item={entry.item}
              expandedRowKeys={expandedRowKeys}
              symbolicDisplayPrefs={symbolicDisplayPrefs}
              onShowFormulaRow={showFormulaRow}
              onToggleBlock={toggleBlock}
            />
          </FormulaViewerVirtualItemShell>
        ))}
      </div>
    </section>
  );
}

function defaultOpenedBlockIds(artifact: FormulaViewerArtifact): ReadonlySet<string> {
  return new Set(
    artifact.detailBlocks
      .filter((block) => block.collapsible === false || block.defaultCollapsed === false)
      .map((block) => formulaViewerBlockKey(block)),
  );
}

function FormulaViewerVirtualItemShell({
  entry,
  expandedRowKeys,
  onMeasure,
  children,
}: {
  entry: FormulaViewerVirtualLayoutEntry;
  expandedRowKeys: ReadonlySet<string>;
  onMeasure: (key: string, height: number) => void;
  children: ReactNode;
}): ReactElement {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const measurementVersion =
    entry.item.kind === 'caseRow' || entry.item.kind === 'caseGroup'
      ? Number(expandedRowKeys.has(entry.item.rowKey))
      : 0;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    const measure = () => onMeasure(entry.item.key, element.getBoundingClientRect().height);
    measure();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [entry.item.key, measurementVersion, onMeasure]);

  return (
    <div
      ref={elementRef}
      className="formula-viewer-virtual-item"
      style={{ transform: `translateY(${entry.offset}px)` }}
      data-testid="formula-viewer-virtual-item"
    >
      {children}
    </div>
  );
}

function FormulaViewerVirtualItemRenderer({
  item,
  expandedRowKeys,
  symbolicDisplayPrefs,
  onShowFormulaRow,
  onToggleBlock,
}: {
  item: FormulaViewerVirtualItem;
  expandedRowKeys: ReadonlySet<string>;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
  onShowFormulaRow: (rowKey: string) => void;
  onToggleBlock: (block: DisplayBlock) => void;
}): ReactElement {
  if (item.kind === 'detailHeader') {
    return (
      <button
        type="button"
        className="formula-viewer-detail-header result-collapsible-block"
        aria-expanded={item.opened}
        onClick={() => onToggleBlock(item.block)}
        data-testid={item.block.testId}
      >
        <span className="result-summary-label">{item.block.label}</span>
        <span className="detail-toggle-indicator">{item.opened ? '^' : 'v'}</span>
      </button>
    );
  }

  if (item.kind === 'caseGroup') {
    const paused = item.pausedByDefault && !expandedRowKeys.has(item.rowKey);
    return (
      <div className="formula-viewer-case-group">
        {paused ? (
          <NotationText text="Generated branch label preserved; render a row to inspect the full formula." />
        ) : (
          <MathStatic latex={item.groupLatex} displayPrefs={symbolicDisplayPrefs} deferRender />
        )}
      </div>
    );
  }

  if (item.kind === 'caseRow') {
    const paused = item.pausedByDefault && !expandedRowKeys.has(item.rowKey);
    if (paused) {
      return (
        <CaseMathRowPlaceholder
          renderCost={item.renderCost}
          testId={`formula-viewer-case-row-${item.rowIndex}-paused`}
          onShowRow={() => onShowFormulaRow(item.rowKey)}
        />
      );
    }
    return (
      <FormulaViewerCaseRow
        line={item.line}
        isFirstRow={item.isFirstRow}
        prefixLatex={item.block.text ?? ''}
        rowIndex={item.rowIndex}
        symbolicDisplayPrefs={symbolicDisplayPrefs}
      />
    );
  }

  return (
    <FormulaViewerBlockCard block={item.block} symbolicDisplayPrefs={symbolicDisplayPrefs} />
  );
}

function FormulaViewerBlockCard({
  block,
  symbolicDisplayPrefs,
}: {
  block: DisplayBlock;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
}): ReactElement {
  const className = `formula-viewer-block-card formula-viewer-block-card--${block.kind}`;
  return (
    <section className={className} data-testid={block.testId}>
      <div className="result-summary-label">{block.label}</div>
      <div className="formula-viewer-block-body">
        {renderBlockBody(block, symbolicDisplayPrefs)}
      </div>
    </section>
  );
}

function renderBlockBody(
  block: DisplayBlock,
  symbolicDisplayPrefs: SymbolicDisplayPrefs,
): ReactNode {
  if (block.renderKind === 'math') {
    const latex = (block.lines ?? []).map((line) => line.latex).find(Boolean) ?? '';
    return <MathStatic latex={latex} displayPrefs={symbolicDisplayPrefs} deferRender />;
  }

  if (block.renderKind === 'mathList') {
    return (block.lines ?? []).map((line, index) => (
      <div key={line.id ?? index} className="formula-viewer-math-list-row">
        <MathStatic latex={line.latex ?? ''} displayPrefs={symbolicDisplayPrefs} deferRender />
      </div>
    ));
  }

  if (block.renderKind === 'mixed') {
    return (block.lines ?? []).map((line, index) => (
      <div key={line.id ?? index} className="formula-viewer-mixed-row">
        <FormulaViewerMixedLine line={line} symbolicDisplayPrefs={symbolicDisplayPrefs} />
      </div>
    ));
  }

  if (block.renderKind === 'branchList') {
    return (block.lines ?? []).map((line, index) => (
      <div key={line.id ?? index} className="formula-viewer-math-list-row">
        <MathStatic latex={line.latex ?? ''} displayPrefs={symbolicDisplayPrefs} deferRender />
      </div>
    ));
  }

  if (block.renderKind === 'caseMath') {
    return <NotationText text="Formula cases are virtualized below." />;
  }

  return (block.lines ?? []).map((line, index) => (
    <p key={line.id ?? index} className="result-text-line">
      {line.text ?? ''}
    </p>
  ));
}

function FormulaViewerMixedLine({
  line,
  symbolicDisplayPrefs,
}: {
  line: DisplayBlockLine;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
}): ReactElement {
  if (line.parts?.length) {
    return (
      <DetailLineContent
        line={line.text ?? ''}
        parts={line.parts}
        symbolicDisplayPrefs={symbolicDisplayPrefs}
      />
    );
  }

  if (line.latex) {
    return <MathStatic latex={line.latex} displayPrefs={symbolicDisplayPrefs} deferRender />;
  }

  return <NotationText text={line.text ?? ''} />;
}
