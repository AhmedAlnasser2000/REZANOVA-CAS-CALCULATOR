import type { Editor } from '@tiptap/core';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from 'react';

import {
  notebookPageGeometry,
  type NotebookPageSetup,
} from '../../../../lib/notebook';

export type NotebookViewMode = 'print' | 'draft';

export type NotebookPaginationMetrics = {
  currentPage: number;
  pageCount: number;
  pageGapPx: number;
  pageHeightPx: number;
};

const PAGE_GAP_PX = 24;

function blockKind(element: HTMLElement) {
  if (element.matches('[data-notebook-page-break]')) return 'pageBreak';
  if (element.matches('h1, h2, h3')) return 'heading';
  if (element.matches('[data-notebook-section]')) return 'section';
  if (element.matches('[data-notebook-semantic]')) return 'container';
  if (element.matches('[data-notebook-image], [data-notebook-video]')) return 'media';
  if (element.matches('[data-notebook-display-math]')) return 'math';
  return 'prose';
}

export function useNotebookPagination({
  editor,
  pageSetup,
  revision,
  scrollRegionRef,
  stageRef,
  viewMode,
  onChange,
}: {
  editor: Editor | null;
  pageSetup: NotebookPageSetup;
  revision: number;
  scrollRegionRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  viewMode: NotebookViewMode;
  onChange: (metrics: NotebookPaginationMetrics) => void;
}) {
  const [metrics, setMetrics] = useState<NotebookPaginationMetrics>({
    currentPage: 1,
    pageCount: 1,
    pageGapPx: PAGE_GAP_PX,
    pageHeightPx: 1,
  });
  const metricsRef = useRef(metrics);
  const paginationId = useId();
  const scope = `notebook-pagination-${paginationId.replaceAll(':', '')}`;

  useEffect(() => {
    if (!editor) return;
    const stage = stageRef.current;
    const scrollRegion = scrollRegionRef.current;
    const editorElement = editor.view.dom as HTMLElement;
    if (!stage || !scrollRegion) return;

    let frame = 0;
    let observer: ResizeObserver | null = null;
    const styleElement = globalThis.document.createElement('style');
    styleElement.dataset.notebookPaginationStyle = scope;
    stage.dataset.notebookPaginationScope = scope;
    stage.prepend(styleElement);

    const commitMetrics = (next: NotebookPaginationMetrics) => {
      const current = metricsRef.current;
      if (
        current.currentPage === next.currentPage
        && current.pageCount === next.pageCount
        && Math.abs(current.pageHeightPx - next.pageHeightPx) < 0.5
      ) return;
      metricsRef.current = next;
      setMetrics(next);
      onChange(next);
    };

    const currentPage = (pageHeightPx: number, pageCount: number) => {
      const relativeTop = Math.max(0, scrollRegion.scrollTop - stage.offsetTop);
      return Math.max(1, Math.min(
        pageCount,
        Math.floor(relativeTop / (pageHeightPx + PAGE_GAP_PX)) + 1,
      ));
    };

    const paginate = () => {
      frame = 0;
      const children = [...editorElement.children] as HTMLElement[];
      styleElement.textContent = '';
      stage.style.removeProperty('--notebook-page-count');
      stage.style.removeProperty('--notebook-page-height-px');
      stage.style.removeProperty('--notebook-page-gap-px');
      stage.style.removeProperty('--notebook-page-margin-top-px');
      stage.style.removeProperty('--notebook-page-margin-right-px');
      stage.style.removeProperty('--notebook-page-margin-bottom-px');
      stage.style.removeProperty('--notebook-page-margin-left-px');
      stage.style.removeProperty('--notebook-object-max-height-px');
      stage.style.removeProperty('max-width');
      if (viewMode === 'draft') {
        commitMetrics({
          currentPage: 1,
          pageCount: 1,
          pageGapPx: PAGE_GAP_PX,
          pageHeightPx: Math.max(1, stage.clientHeight),
        });
        return;
      }

      const geometry = notebookPageGeometry(pageSetup);
      stage.style.maxWidth = `${geometry.width * (96 / 72)}px`;
      const pageWidthPx = Math.max(1, stage.getBoundingClientRect().width);
      const scale = pageWidthPx / geometry.width;
      const pageHeightPx = geometry.height * scale;
      const marginTopPx = pageSetup.marginsPt.top * scale;
      const marginRightPx = pageSetup.marginsPt.right * scale;
      const marginBottomPx = pageSetup.marginsPt.bottom * scale;
      const marginLeftPx = pageSetup.marginsPt.left * scale;
      const usableHeightPx = Math.max(1, pageHeightPx - marginTopPx - marginBottomPx);
      const stride = pageHeightPx + PAGE_GAP_PX;

      stage.style.setProperty('--notebook-page-height-px', `${pageHeightPx}px`);
      stage.style.setProperty('--notebook-page-gap-px', `${PAGE_GAP_PX}px`);
      stage.style.setProperty('--notebook-page-margin-top-px', `${marginTopPx}px`);
      stage.style.setProperty('--notebook-page-margin-right-px', `${marginRightPx}px`);
      stage.style.setProperty('--notebook-page-margin-bottom-px', `${marginBottomPx}px`);
      stage.style.setProperty('--notebook-page-margin-left-px', `${marginLeftPx}px`);
      stage.style.setProperty('--notebook-object-max-height-px', `${usableHeightPx}px`);

      let pageIndex = 0;
      let cursor = marginTopPx;
      let activeFloatBottom = 0;
      const layoutRules: string[] = [];
      const childSelector = (index: number) => (
        `[data-notebook-pagination-scope="${scope}"] .notebook-rich-editor > :nth-child(${index + 1})`
      );
      children.forEach((element, index) => {
        const kind = blockKind(element);
        const computed = getComputedStyle(element);
        const squareMedia = kind === 'media'
          && (computed.float === 'left' || computed.float === 'right');
        if ((kind === 'pageBreak' || (kind === 'media' && !squareMedia)) && activeFloatBottom) {
          cursor = Math.max(cursor, activeFloatBottom);
          activeFloatBottom = 0;
        }
        const baseMarginTop = Number.parseFloat(computed.marginTop) || 0;
        const marginBottom = Number.parseFloat(computed.marginBottom) || 0;
        const height = element.getBoundingClientRect().height;
        const contentEnd = pageIndex * stride + pageHeightPx - marginBottomPx;

        if (kind === 'pageBreak') {
          const nextTop = (pageIndex + 1) * stride + marginTopPx;
          const breakHeight = Math.max(32, nextTop - cursor);
          layoutRules.push(`${childSelector(index)} { height: ${breakHeight}px; }`);
          pageIndex += 1;
          cursor = nextTop;
          return;
        }

        const next = children[index + 1];
        const nextHeight = next && blockKind(next) !== 'pageBreak'
          ? next.getBoundingClientRect().height
          : 0;
        const keepHeight = kind === 'heading' ? height + Math.min(nextHeight, usableHeightPx) : height;
        const splittable = kind === 'section' || kind === 'container';
        const shouldMove = cursor > pageIndex * stride + marginTopPx
          && keepHeight <= usableHeightPx
          && cursor + baseMarginTop + keepHeight + marginBottom > contentEnd;
        if (shouldMove) {
          pageIndex += 1;
          const nextTop = pageIndex * stride + marginTopPx;
          const offset = Math.max(0, nextTop - cursor);
          layoutRules.push(
            `${childSelector(index)} { margin-top: ${baseMarginTop + offset}px; }`,
          );
          cursor = nextTop + baseMarginTop;
        } else {
          cursor += baseMarginTop;
        }
        if (splittable && cursor + height + marginBottom > contentEnd) {
          layoutRules.push(`${childSelector(index)} { box-decoration-break: clone; }`);
        }
        if (squareMedia) {
          activeFloatBottom = Math.max(activeFloatBottom, cursor + height + marginBottom);
          pageIndex = Math.max(
            pageIndex,
            Math.floor(Math.max(0, activeFloatBottom - 1) / stride),
          );
          return;
        }
        cursor += height + marginBottom;
        if (cursor >= activeFloatBottom) activeFloatBottom = 0;
        pageIndex = Math.max(pageIndex, Math.floor(Math.max(0, cursor - 1) / stride));
        const pageTop = pageIndex * stride + marginTopPx;
        if (cursor < pageTop) cursor = pageTop;
      });

      pageIndex = Math.max(
        pageIndex,
        Math.floor(Math.max(0, Math.max(cursor, activeFloatBottom) - 1) / stride),
      );
      const pageCount = Math.max(1, pageIndex + 1);
      styleElement.textContent = layoutRules.join('\n');
      stage.style.setProperty('--notebook-page-count', String(pageCount));
      commitMetrics({
        currentPage: currentPage(pageHeightPx, pageCount),
        pageCount,
        pageGapPx: PAGE_GAP_PX,
        pageHeightPx,
      });
    };

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paginate);
    };
    const trackScroll = () => {
      if (viewMode === 'draft') return;
      const current = metricsRef.current;
      const nextPage = currentPage(current.pageHeightPx, current.pageCount);
      if (nextPage === current.currentPage) return;
      commitMetrics({ ...current, currentPage: nextPage });
    };

    schedule();
    scrollRegion.addEventListener('scroll', trackScroll, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(schedule);
      observer.observe(stage);
    }
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      scrollRegion.removeEventListener('scroll', trackScroll);
      styleElement.remove();
      if (stage.dataset.notebookPaginationScope === scope) {
        delete stage.dataset.notebookPaginationScope;
      }
    };
  }, [editor, onChange, pageSetup, revision, scope, scrollRegionRef, stageRef, viewMode]);

  return metrics;
}
