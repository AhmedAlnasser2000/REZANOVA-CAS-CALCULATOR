import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { StatisticsChartTable } from './statistics-chart-table';

const PAGE_SIZE = 12;

type StatisticsVisualizationDataTableProps = {
  title: string;
  table: StatisticsChartTable;
};

export function StatisticsVisualizationDataTable({
  title,
  table,
}: StatisticsVisualizationDataTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(table.rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const firstRow = safePage * PAGE_SIZE;
  const visibleRows = table.rows.slice(firstRow, firstRow + PAGE_SIZE);

  return (
    <section
      className="statistics-visualization-data"
      data-testid="statistics-visualization-data"
      aria-label={`${title} data`}
    >
      <div className="statistics-visualization-table-wrap">
        <table>
          <caption>{title} data</caption>
          <thead>
            <tr>
              {table.columns.map((column) => <th key={column} scope="col">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${firstRow + rowIndex}:${row.join(':')}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${table.columns[cellIndex]}:${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="statistics-visualization-pagination">
        <span>{table.rows.length} rows</span>
        <div className="statistics-visualization-page-controls">
          <button
            type="button"
            className="statistics-visualization-icon-button"
            aria-label="Previous data page"
            title="Previous data page"
            disabled={safePage === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
          <output aria-label="Data page" aria-live="polite">
            {safePage + 1} / {pageCount}
          </output>
          <button
            type="button"
            className="statistics-visualization-icon-button"
            aria-label="Next data page"
            title="Next data page"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
