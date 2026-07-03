import type { CSSProperties } from 'react';
import { SignedNumberInput } from '../../components/SignedNumberInput';

type VectorWorkspaceProps = {
  vectorA: number[];
  vectorB: number[];
  onOpenGuideMode: (mode: 'vector') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onResizeVector: (vectorId: 'A' | 'B', length: number) => void;
  onSetVectorCell: (vectorId: 'A' | 'B', index: number, value: number) => void;
};

function gridColumnStyle(columns: number): CSSProperties {
  return {
    '--linear-algebra-columns': String(columns),
  } as CSSProperties;
}

type VectorValueCardProps = {
  id: 'A' | 'B';
  label: 'u' | 'v';
  vector: number[];
  onResizeVector: VectorWorkspaceProps['onResizeVector'];
  onSetVectorCell: VectorWorkspaceProps['onSetVectorCell'];
};

function VectorValueCard({
  id,
  label,
  vector,
  onResizeVector,
  onSetVectorCell,
}: VectorValueCardProps) {
  const length = vector.length || 1;

  return (
    <div className="editor-card linear-algebra-value-card">
      <div className="linear-algebra-value-card-header">
        <strong>Vector {label}</strong>
        <div className="linear-algebra-size-controls">
          <label>
            <span>Length</span>
            <input
              aria-label={`Vector ${label} length`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={length}
              onChange={(event) => onResizeVector(id, Number(event.currentTarget.value))}
            />
          </label>
        </div>
      </div>
      <div
        className="vector-grid linear-algebra-vector-grid"
        data-columns={length}
        style={gridColumnStyle(length)}
      >
        {vector.map((value, index) => (
          <SignedNumberInput
            key={`v${id.toLowerCase()}-${index}`}
            value={value}
            onValueChange={(nextValue) => onSetVectorCell(id, index, nextValue)}
          />
        ))}
      </div>
    </div>
  );
}

function VectorWorkspace({
  vectorA,
  vectorB,
  onOpenGuideMode,
  onOpenGuideArticle,
  onResizeVector,
  onSetVectorCell,
}: VectorWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Vector Workspace</strong>
          <p>
            Edit named vectors u and v below, then use the main editor above or the
            soft keys to build Vector operations.
          </p>
        </div>
        <div className="linear-algebra-badge-row">
          <span className="equation-badge">Editor source</span>
          <span className="equation-origin-badge">u/v vectors</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('vector')}>Guide: Vector mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="grid-two">
        <VectorValueCard
          id="A"
          label="u"
          vector={vectorA}
          onResizeVector={onResizeVector}
          onSetVectorCell={onSetVectorCell}
        />
        <VectorValueCard
          id="B"
          label="v"
          vector={vectorB}
          onResizeVector={onResizeVector}
          onSetVectorCell={onSetVectorCell}
        />
      </div>
    </section>
  );
}

export { VectorWorkspace };
