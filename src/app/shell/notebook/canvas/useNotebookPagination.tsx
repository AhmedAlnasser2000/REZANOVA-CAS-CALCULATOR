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
  paginateNotebookBlocks,
  type NotebookFloatingPaginationFragment,
  type NotebookPageSetup,
  type NotebookPaginationFragment,
} from '../../../../lib/notebook';
import {
  notebookFloatingPaginationBlocks,
  notebookPaginationBlockFromElement,
  notebookPaginationDocumentMetadata,
  notebookPaginationElementId,
} from './notebook-pagination-dom';

export type NotebookViewMode = 'print' | 'draft';

export type NotebookPaginationMetrics = {
  currentPage: number;
  fragments: NotebookPaginationFragment[];
  floating: NotebookFloatingPaginationFragment[];
  returnedToFlowIds: string[];
  pageCount: number;
  pageGapPx: number;
  pageHeightPx: number;
};

const PAGE_GAP_PX = 24;
const FLOATING_STYLE_PROPERTIES = [
  '--notebook-floating-left-px',
  '--notebook-floating-top-px',
  '--notebook-floating-width-px',
  '--notebook-floating-z-index',
] as const;
const FLOW_STYLE_PROPERTIES = [
  '--notebook-flow-margin-left-px',
  '--notebook-flow-margin-right-px',
  '--notebook-flow-width-reduction-px',
] as const;

function clearFloatingPresentation(editorElement: HTMLElement) {
  editorElement.querySelectorAll<HTMLElement>(
    '[data-notebook-floating-object], [data-notebook-floating-draft-page]',
  ).forEach((element) => {
    delete element.dataset.notebookFloatingObject;
    delete element.dataset.notebookFloatingPage;
    delete element.dataset.notebookFloatingWrap;
    delete element.dataset.notebookFloatingAnchor;
    delete element.dataset.notebookFloatingDraftPage;
    FLOATING_STYLE_PROPERTIES.forEach((property) => element.style.removeProperty(property));
  });
  editorElement.querySelectorAll<HTMLElement>('[data-notebook-floating-ancestor]')
    .forEach((element) => delete element.dataset.notebookFloatingAncestor);
  editorElement.querySelectorAll<HTMLElement>('[data-notebook-flow-wrap-inset]')
    .forEach((element) => {
      delete element.dataset.notebookFlowWrapInset;
      FLOW_STYLE_PROPERTIES.forEach((property) => element.style.removeProperty(property));
    });
}

function metricsMatch(left: NotebookPaginationMetrics, right: NotebookPaginationMetrics) {
  const fragmentsMatch = left.fragments.length === right.fragments.length
    && left.fragments.every((fragment, index) => {
      const candidate = right.fragments[index];
      return candidate
        && fragment.id === candidate.id
        && fragment.page === candidate.page
        && fragment.fragment === candidate.fragment
        && Math.abs(fragment.offsetPt - candidate.offsetPt) < 0.1
        && Math.abs(fragment.heightPt - candidate.heightPt) < 0.1
        && Math.abs(fragment.scale - candidate.scale) < 0.001
        && Math.abs((fragment.insetLeftPt ?? 0) - (candidate.insetLeftPt ?? 0)) < 0.1
        && Math.abs((fragment.insetRightPt ?? 0) - (candidate.insetRightPt ?? 0)) < 0.1;
    });
  const floatingMatch = left.floating.length === right.floating.length
    && left.floating.every((fragment, index) => {
      const candidate = right.floating[index];
      return candidate
        && fragment.id === candidate.id
        && fragment.page === candidate.page
        && Math.abs(fragment.xPt - candidate.xPt) < 0.1
        && Math.abs(fragment.yPt - candidate.yPt) < 0.1
        && Math.abs(fragment.widthPt - candidate.widthPt) < 0.1
        && Math.abs(fragment.heightPt - candidate.heightPt) < 0.1;
    });
  return left.currentPage === right.currentPage
    && left.pageCount === right.pageCount
    && Math.abs(left.pageHeightPx - right.pageHeightPx) < 0.5
    && fragmentsMatch
    && floatingMatch
    && left.returnedToFlowIds.join('\0') === right.returnedToFlowIds.join('\0');
}

function floatingElementMap(editorElement: HTMLElement) {
  const elements = new Map<string, HTMLElement>();
  [...editorElement.children].forEach((child, index) => {
    if (!(child instanceof HTMLElement)) return;
    elements.set(notebookPaginationElementId(child, index), child);
  });
  editorElement.querySelectorAll<HTMLElement>('[data-notebook-node-id]').forEach((element) => {
    const id = element.dataset.notebookNodeId;
    if (id && !elements.has(id)) elements.set(id, element);
  });
  return elements;
}

function markFloatingAncestors(element: HTMLElement, editorElement: HTMLElement) {
  let ancestor = element.parentElement;
  while (ancestor && ancestor !== editorElement) {
    ancestor.dataset.notebookFloatingAncestor = 'true';
    ancestor = ancestor.parentElement;
  }
}

export function useNotebookPagination({
  editor,
  pageSetup,
  revision,
  scrollRegionRef,
  stageRef,
  viewMode,
  onChange,
  onReturnFloatingObjectsToFlow,
}: {
  editor: Editor | null;
  pageSetup: NotebookPageSetup;
  revision: number;
  scrollRegionRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  viewMode: NotebookViewMode;
  onChange: (metrics: NotebookPaginationMetrics) => void;
  onReturnFloatingObjectsToFlow?: (nodeIds: readonly string[]) => void;
}) {
  const [metrics, setMetrics] = useState<NotebookPaginationMetrics>({
    currentPage: 1,
    fragments: [],
    floating: [],
    returnedToFlowIds: [],
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
      if (metricsMatch(metricsRef.current, next)) return;
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
      const nodeSelector = (nodeId: string) => (
        `[data-notebook-pagination-scope="${scope}"] `
        + `[data-notebook-node-id="${globalThis.CSS.escape(nodeId)}"]`
      );
      const geometry = notebookPageGeometry(pageSetup);
      const documentMetadata = notebookPaginationDocumentMetadata(editor.state.doc);
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
        clearFloatingPresentation(editorElement);
        const draftRules: string[] = [];
        stage.dataset.notebookFloatingCount = '0';
        stage.dataset.notebookReturnedToFlowCount = '0';
        const renderedContentWidth = Math.max(1, editorElement.getBoundingClientRect().width);
        const pointsPerPixel = geometry.usableWidth / renderedContentWidth;
        const draftBlocks = children.map((element, index) => (
          notebookPaginationBlockFromElement(
            element,
            index,
            pointsPerPixel,
            documentMetadata,
          )
        ));
        const draftLayout = paginateNotebookBlocks(draftBlocks, geometry.usableHeight);
        const elements = floatingElementMap(editorElement);
        documentMetadata.nodes.forEach((node) => {
          const placement = node.objectPlacement;
          if (placement?.mode !== 'floating' || placement.anchor.kind !== 'page') return;
          const element = elements.get(node.id);
          if (element) element.dataset.notebookFloatingDraftPage = String(placement.anchor.pageNumber);
          const selector = nodeSelector(node.id);
          draftRules.push(
            `${selector} { position: relative; min-height: 52px; max-height: 96px; `
              + 'overflow: hidden; border: 1px dashed var(--notebook-border-strong); '
              + 'border-radius: 7px; opacity: 0.74; }',
            `${selector}::before { content: "Page ${placement.anchor.pageNumber} · Floating object"; `
              + 'position: absolute; z-index: 4; top: 7px; left: 7px; border-radius: 999px; '
              + 'padding: 3px 7px; background: #172a2b; color: var(--page-ink); '
              + "font: 0.66rem 'IBM Plex Mono', monospace; pointer-events: none; }",
          );
        });
        styleElement.textContent = draftRules.join('\n');
        commitMetrics({
          currentPage: 1,
          fragments: draftLayout.fragments,
          floating: [],
          returnedToFlowIds: [],
          pageCount: draftLayout.pageCount,
          pageGapPx: PAGE_GAP_PX,
          pageHeightPx: geometry.height * (renderedContentWidth / geometry.usableWidth),
        });
        return;
      }

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
      const pointsPerPixel = 1 / scale;
      const floatingBlocks = notebookFloatingPaginationBlocks(
        editorElement,
        pointsPerPixel,
        documentMetadata,
        geometry.width,
      );
      clearFloatingPresentation(editorElement);
      styleElement.textContent = '';
      const blocks = children.map((element, index) => notebookPaginationBlockFromElement(
        element,
        index,
        pointsPerPixel,
        documentMetadata,
      ));
      const publicationLayout = paginateNotebookBlocks(blocks, geometry.usableHeight, {
        pageSetup,
        paragraphAnchorBlockIds: documentMetadata.paragraphAnchorBlockIds,
        floatingBlocks,
      });
      stage.dataset.notebookFloatingCount = String(publicationLayout.floating.length);
      stage.dataset.notebookReturnedToFlowCount = String(
        publicationLayout.returnedToFlowIds.length,
      );

      stage.style.setProperty('--notebook-page-height-px', `${pageHeightPx}px`);
      stage.style.setProperty('--notebook-page-gap-px', `${PAGE_GAP_PX}px`);
      stage.style.setProperty('--notebook-page-margin-top-px', `${marginTopPx}px`);
      stage.style.setProperty('--notebook-page-margin-right-px', `${marginRightPx}px`);
      stage.style.setProperty('--notebook-page-margin-bottom-px', `${marginBottomPx}px`);
      stage.style.setProperty('--notebook-page-margin-left-px', `${marginLeftPx}px`);
      stage.style.setProperty('--notebook-object-max-height-px', `${usableHeightPx}px`);
      stage.style.setProperty('--notebook-page-count', String(publicationLayout.pageCount));

      const firstFragments = new Map<string, NotebookPaginationFragment>();
      publicationLayout.fragments.forEach((fragment) => {
        if (!firstFragments.has(fragment.id)) firstFragments.set(fragment.id, fragment);
      });
      const floatingIds = new Set(publicationLayout.floating.map((fragment) => fragment.id));
      const layoutRules: string[] = [];
      let cursor = marginTopPx;
      const childSelector = (index: number) => (
        `[data-notebook-pagination-scope="${scope}"] .notebook-rich-editor > :nth-child(${index + 1})`
      );
      children.forEach((element, index) => {
        const id = notebookPaginationElementId(element, index);
        if (floatingIds.has(id)) return;
        const computed = getComputedStyle(element);
        const baseMarginTop = Number.parseFloat(computed.marginTop) || 0;
        const marginBottom = Number.parseFloat(computed.marginBottom) || 0;
        const baseMarginLeft = Number.parseFloat(computed.marginLeft) || 0;
        const baseMarginRight = Number.parseFloat(computed.marginRight) || 0;
        const fragment = firstFragments.get(id);
        if (fragment && blocks[index]?.kind === 'pageBreak') {
          const nextTop = (fragment.page - 1) * stride + marginTopPx;
          layoutRules.push(`${childSelector(index)} { height: ${Math.max(32, nextTop - cursor)}px; }`);
          cursor = nextTop;
          return;
        }
        if (!fragment) {
          const nextFragment = children.slice(index + 1).map((candidate, nextIndex) => (
            firstFragments.get(notebookPaginationElementId(
              candidate,
              index + nextIndex + 1,
            ))
          )).find(Boolean);
          const nextTop = nextFragment
            ? (nextFragment.page - 1) * stride + marginTopPx + nextFragment.offsetPt * scale
            : (publicationLayout.pageCount - 1) * stride + marginTopPx;
          layoutRules.push(`${childSelector(index)} { height: ${Math.max(32, nextTop - cursor)}px; }`);
          cursor = nextTop;
          return;
        }
        const targetTop = (fragment.page - 1) * stride + marginTopPx + fragment.offsetPt * scale;
        const extraMargin = Math.max(0, targetTop - cursor - baseMarginTop);
        const insetLeft = (fragment.insetLeftPt ?? 0) * scale;
        const insetRight = (fragment.insetRightPt ?? 0) * scale;
        const declarations = [`margin-top: ${baseMarginTop + extraMargin}px`];
        if (insetLeft || insetRight) {
          element.dataset.notebookFlowWrapInset = 'true';
          element.style.setProperty(
            '--notebook-flow-margin-left-px',
            `${baseMarginLeft + insetLeft}px`,
          );
          element.style.setProperty(
            '--notebook-flow-margin-right-px',
            `${baseMarginRight + insetRight}px`,
          );
          element.style.setProperty(
            '--notebook-flow-width-reduction-px',
            `${baseMarginLeft + insetLeft + baseMarginRight + insetRight}px`,
          );
          declarations.push(
            `margin-left: ${baseMarginLeft + insetLeft}px`,
            `margin-right: ${baseMarginRight + insetRight}px`,
            `width: calc(100% - ${baseMarginLeft + insetLeft + baseMarginRight + insetRight}px)`,
          );
        }
        if (fragment.scale < 1) declarations.push(`max-height: ${fragment.heightPt * scale}px`);
        if (fragment.fragment === 0
          && publicationLayout.fragments.some((candidate) => (
            candidate.id === id && candidate.fragment > 0
          ))) {
          declarations.push('box-decoration-break: clone');
        }
        layoutRules.push(`${childSelector(index)} { ${declarations.join('; ')}; }`);
        cursor = targetTop + element.getBoundingClientRect().height + marginBottom;
      });
      const elements = floatingElementMap(editorElement);
      publicationLayout.floating.forEach((fragment) => {
        layoutRules.push(
          `${nodeSelector(fragment.id)} { position: absolute !important; `
            + `z-index: ${fragment.wrap === 'behind' ? 0 : fragment.zOrder + 3} !important; `
            + `left: ${fragment.xPt * scale}px !important; `
            + `top: ${(fragment.page - 1) * stride + fragment.yPt * scale}px !important; `
            + `width: ${fragment.widthPt * scale}px !important; max-width: none !important; `
            + 'margin: 0 !important; float: none !important; clear: none !important; '
            + 'box-sizing: border-box; overflow: visible; }',
        );
        const element = elements.get(fragment.id);
        if (!element) return;
        markFloatingAncestors(element, editorElement);
        element.dataset.notebookFloatingObject = 'true';
        element.dataset.notebookFloatingPage = String(fragment.page);
        element.dataset.notebookFloatingWrap = fragment.wrap;
        element.dataset.notebookFloatingAnchor = fragment.anchorKind;
        element.style.setProperty('--notebook-floating-left-px', `${fragment.xPt * scale}px`);
        element.style.setProperty(
          '--notebook-floating-top-px',
          `${(fragment.page - 1) * stride + fragment.yPt * scale}px`,
        );
        element.style.setProperty('--notebook-floating-width-px', `${fragment.widthPt * scale}px`);
        element.style.setProperty(
          '--notebook-floating-z-index',
          String(fragment.wrap === 'behind' ? 0 : fragment.zOrder + 3),
        );
      });
      styleElement.textContent = layoutRules.join('\n');
      if (publicationLayout.returnedToFlowIds.length) {
        onReturnFloatingObjectsToFlow?.(publicationLayout.returnedToFlowIds);
      }
      commitMetrics({
        currentPage: currentPage(pageHeightPx, publicationLayout.pageCount),
        fragments: publicationLayout.fragments,
        floating: publicationLayout.floating,
        returnedToFlowIds: publicationLayout.returnedToFlowIds,
        pageCount: publicationLayout.pageCount,
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
      clearFloatingPresentation(editorElement);
      styleElement.remove();
      if (stage.dataset.notebookPaginationScope === scope) {
        delete stage.dataset.notebookPaginationScope;
      }
      delete stage.dataset.notebookFloatingCount;
      delete stage.dataset.notebookReturnedToFlowCount;
    };
  }, [
    editor,
    onChange,
    onReturnFloatingObjectsToFlow,
    pageSetup,
    revision,
    scope,
    scrollRegionRef,
    stageRef,
    viewMode,
  ]);

  return metrics;
}
