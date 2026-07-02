import { SignedNumberInput } from '../../components/SignedNumberInput';

type MatrixWorkspaceProps = {
  matrixA: number[][];
  matrixB: number[][];
  onOpenGuideMode: (mode: 'matrix') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onSetMatrixCell: (matrixId: 'A' | 'B', row: number, column: number, value: number) => void;
};

function MatrixWorkspace({
  matrixA,
  matrixB,
  onOpenGuideMode,
  onOpenGuideArticle,
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
        <div className="editor-card">
          <strong>Matrix A</strong>
          <div className="matrix-grid" data-columns={2}>
            {matrixA.map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <SignedNumberInput key={`ma-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => onSetMatrixCell('A', rowIndex, columnIndex, nextValue)} />
              )),
            )}
          </div>
        </div>
        <div className="editor-card">
          <strong>Matrix B</strong>
          <div className="matrix-grid" data-columns={2}>
            {matrixB.map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <SignedNumberInput key={`mb-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => onSetMatrixCell('B', rowIndex, columnIndex, nextValue)} />
              )),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export { MatrixWorkspace };
