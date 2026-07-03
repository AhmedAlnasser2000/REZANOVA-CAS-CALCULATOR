import type { CSSProperties } from 'react';
import { SignedNumberInput } from '../../components/SignedNumberInput';

type MatrixWorkspaceProps = {
  matrixA: number[][];
  matrixB: number[][];
  onOpenGuideMode: (mode: 'matrix') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onResizeMatrix: (matrixId: 'A' | 'B', rows: number, columns: number) => void;
  onSetMatrixCell: (matrixId: 'A' | 'B', row: number, column: number, value: number) => void;
};

function matrixColumnCount(matrix: number[][]) {
  return matrix[0]?.length ?? 1;
}

function gridColumnStyle(columns: number): CSSProperties {
  return {
    '--linear-algebra-columns': String(columns),
  } as CSSProperties;
}

type MatrixValueCardProps = {
  id: 'A' | 'B';
  matrix: number[][];
  onResizeMatrix: MatrixWorkspaceProps['onResizeMatrix'];
  onSetMatrixCell: MatrixWorkspaceProps['onSetMatrixCell'];
};

function MatrixValueCard({
  id,
  matrix,
  onResizeMatrix,
  onSetMatrixCell,
}: MatrixValueCardProps) {
  const rows = matrix.length || 1;
  const columns = matrixColumnCount(matrix);

  return (
    <div className="editor-card linear-algebra-value-card">
      <div className="linear-algebra-value-card-header">
        <strong>Matrix {id}</strong>
        <div className="linear-algebra-size-controls">
          <label>
            <span>Rows</span>
            <input
              aria-label={`Matrix ${id} rows`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={rows}
              onChange={(event) => onResizeMatrix(id, Number(event.currentTarget.value), columns)}
            />
          </label>
          <label>
            <span>Cols</span>
            <input
              aria-label={`Matrix ${id} columns`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={columns}
              onChange={(event) => onResizeMatrix(id, rows, Number(event.currentTarget.value))}
            />
          </label>
        </div>
      </div>
      <div
        className="matrix-grid linear-algebra-matrix-grid"
        data-columns={columns}
        style={gridColumnStyle(columns)}
      >
        {matrix.map((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <SignedNumberInput
              key={`m${id.toLowerCase()}-${rowIndex}-${columnIndex}`}
              value={value}
              onValueChange={(nextValue) => onSetMatrixCell(id, rowIndex, columnIndex, nextValue)}
            />
          )),
        )}
      </div>
    </div>
  );
}

function MatrixWorkspace({
  matrixA,
  matrixB,
  onOpenGuideMode,
  onOpenGuideArticle,
  onResizeMatrix,
  onSetMatrixCell,
}: MatrixWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Matrix Workspace</strong>
          <p>
            Edit named matrices below, then use the main editor above or the soft keys to
            build Matrix operations.
          </p>
        </div>
        <div className="linear-algebra-badge-row">
          <span className="equation-badge">Editor source</span>
          <span className="equation-origin-badge">A/B matrices</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('matrix')}>Guide: Matrix mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="grid-two">
        <MatrixValueCard
          id="A"
          matrix={matrixA}
          onResizeMatrix={onResizeMatrix}
          onSetMatrixCell={onSetMatrixCell}
        />
        <MatrixValueCard
          id="B"
          matrix={matrixB}
          onResizeMatrix={onResizeMatrix}
          onSetMatrixCell={onSetMatrixCell}
        />
      </div>
    </section>
  );
}

export { MatrixWorkspace };
