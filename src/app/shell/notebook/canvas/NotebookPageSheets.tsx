import type { CSSProperties } from 'react';

import type { NotebookHeaderFooterSettings } from '../../../../lib/notebook';
import type { NotebookPaginationMetrics } from './useNotebookPagination';

export function NotebookPageSheets({
  headerFooter,
  metrics,
}: {
  headerFooter: NotebookHeaderFooterSettings;
  metrics: NotebookPaginationMetrics;
}) {
  return (
    <div className="notebook-page-sheets" aria-hidden="true">
      {Array.from({ length: metrics.pageCount }, (_, index) => {
        const firstPageBlank = index === 0 && headerFooter.differentFirstPage;
        const pageNumber = headerFooter.pageNumbering.startAt + index;
        const style = {
          '--notebook-sheet-top': `${index * (metrics.pageHeightPx + metrics.pageGapPx)}px`,
          '--notebook-sheet-height': `${metrics.pageHeightPx}px`,
        } as CSSProperties;
        return (
          <div key={index} className="notebook-page-sheet" style={style} data-page={index + 1}>
            <header>{firstPageBlank ? '' : headerFooter.headerText}</header>
            <footer>
              <span>{firstPageBlank ? '' : headerFooter.footerText}</span>
              {!firstPageBlank && headerFooter.pageNumbering.enabled ? (
                <b className={`is-${headerFooter.pageNumbering.position}`}>{pageNumber}</b>
              ) : null}
            </footer>
          </div>
        );
      })}
    </div>
  );
}
