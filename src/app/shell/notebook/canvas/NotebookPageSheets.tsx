import type { Editor } from '@tiptap/core';
import type { CSSProperties } from 'react';

import type {
  NotebookHeaderFooterSettings,
} from '../../../../lib/notebook';
import type { NotebookPaginationMetrics } from './useNotebookPagination';
import {
  NotebookRunningMatterEditor,
  NotebookRunningMatterView,
} from './NotebookRunningMatter';
import {
  updateNotebookRunningMatter,
  type NotebookRunningMatterTarget,
} from './notebook-running-matter';
export type { NotebookRunningMatterTarget } from './notebook-running-matter';

function targetContent(
  settings: NotebookHeaderFooterSettings,
  target: NotebookRunningMatterTarget,
) {
  const key = `${target.scope === 'first' ? 'firstPage' : 'default'}${target.kind === 'header' ? 'Header' : 'Footer'}` as const;
  return settings[key][target.region];
}

export function NotebookPageSheets({
  activeTarget,
  headerFooter,
  metrics,
  onChangeDraft,
  onEditor,
  onEnter,
  onRequestClose,
  onOverflowChange,
}: {
  activeTarget: NotebookRunningMatterTarget | null;
  headerFooter: NotebookHeaderFooterSettings;
  metrics: NotebookPaginationMetrics;
  onChangeDraft: (next: NotebookHeaderFooterSettings) => void;
  onEditor: (editor: Editor | null) => void;
  onEnter: (target: NotebookRunningMatterTarget) => void;
  onRequestClose: () => void;
  onOverflowChange: (overflowing: boolean) => void;
}) {
  return (
    <div className="notebook-page-sheets">
      {Array.from({ length: metrics.pageCount }, (_, pageIndex) => {
        const useFirst = pageIndex === 0 && headerFooter.differentFirstPage;
        const scope = useFirst ? 'first' : 'default';
        const pageNumber = headerFooter.pageNumberStart + pageIndex;
        const style = {
          '--notebook-sheet-top': `${pageIndex * (metrics.pageHeightPx + metrics.pageGapPx)}px`,
          '--notebook-sheet-height': `${metrics.pageHeightPx}px`,
        } as CSSProperties;
        return (
          <div key={pageIndex} className="notebook-page-sheet" style={style} data-page={pageIndex + 1}>
            {(['header', 'footer'] as const).map((kind) => {
              const regions = kind === 'header'
                ? useFirst ? headerFooter.firstPageHeader : headerFooter.defaultHeader
                : useFirst ? headerFooter.firstPageFooter : headerFooter.defaultFooter;
              return (
                <div className={`notebook-running-matter is-${kind}`} data-page-region={kind} key={kind}>
                  {(['left', 'center', 'right'] as const).map((region) => {
                    const target: NotebookRunningMatterTarget = { pageIndex, kind, region, scope };
                    const active = activeTarget?.pageIndex === pageIndex
                      && activeTarget.kind === kind
                      && activeTarget.region === region;
                    return (
                      <div
                        className={`notebook-running-matter-region is-${region}${active ? ' is-editing' : ''}`}
                        data-running-matter-region={`${kind}-${region}`}
                        key={region}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          onEnter(target);
                        }}
                      >
                        {active ? (
                          <NotebookRunningMatterEditor
                            content={targetContent(headerFooter, target)}
                            onChange={(content) => onChangeDraft(updateNotebookRunningMatter(
                              headerFooter,
                              target,
                              content,
                            ))}
                            onEditor={onEditor}
                            onOverflowChange={onOverflowChange}
                            onRequestClose={onRequestClose}
                          />
                        ) : (
                          <NotebookRunningMatterView content={regions[region]} pageNumber={pageNumber} />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
