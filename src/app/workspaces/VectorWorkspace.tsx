import { SignedNumberInput } from '../../components/SignedNumberInput';

type VectorWorkspaceProps = {
  vectorA: number[];
  vectorB: number[];
  onOpenGuideMode: (mode: 'vector') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onSetVectorCell: (vectorId: 'A' | 'B', index: number, value: number) => void;
};

function VectorWorkspace({
  vectorA,
  vectorB,
  onOpenGuideMode,
  onOpenGuideArticle,
  onSetVectorCell,
}: VectorWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Vector Workspace</strong>
          <p>
            Edit named vectors below, then use the main editor above or the soft keys to
            build Vector operations.
          </p>
        </div>
        <div className="linear-algebra-badge-row">
          <span className="equation-badge">Editor source</span>
          <span className="equation-origin-badge">A/B vectors</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('vector')}>Guide: Vector mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="grid-two">
        <div className="editor-card">
          <strong>Vector A</strong>
          <div className="vector-grid">
            {vectorA.map((value, index) => (
              <SignedNumberInput key={`va-${index}`} value={value} onValueChange={(nextValue) => onSetVectorCell('A', index, nextValue)} />
            ))}
          </div>
        </div>
        <div className="editor-card">
          <strong>Vector B</strong>
          <div className="vector-grid">
            {vectorB.map((value, index) => (
              <SignedNumberInput key={`vb-${index}`} value={value} onValueChange={(nextValue) => onSetVectorCell('B', index, nextValue)} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export { VectorWorkspace };
