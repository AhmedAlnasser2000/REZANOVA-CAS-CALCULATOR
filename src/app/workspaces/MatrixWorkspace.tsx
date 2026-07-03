import type { CSSProperties } from 'react';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import type { LinearAlgebraMatrixNamedValue } from '../../lib/linear-algebra/named-values';

type MatrixWorkspaceProps = {
  activeMatrixLeftId: string;
  activeMatrixRightId: string;
  matrixValues: readonly LinearAlgebraMatrixNamedValue[];
  onOpenGuideMode: (mode: 'matrix') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onAddMatrixValue: () => void;
  onDeleteMatrixValue: (id: string) => void;
  onDuplicateMatrixValue: (id: string) => void;
  onRenameMatrixValue: (id: string, name: string) => void;
  onResizeMatrixValue: (id: string, rows: number, columns: number) => void;
  onSetActiveMatrixValueIds: (leftId: string, rightId: string) => void;
  onSetMatrixCell: (id: string, row: number, column: number, value: number) => void;
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
  activeRoles: string[];
  canDelete: boolean;
  value: LinearAlgebraMatrixNamedValue;
  onDeleteMatrixValue: MatrixWorkspaceProps['onDeleteMatrixValue'];
  onDuplicateMatrixValue: MatrixWorkspaceProps['onDuplicateMatrixValue'];
  onRenameMatrixValue: MatrixWorkspaceProps['onRenameMatrixValue'];
  onResizeMatrixValue: MatrixWorkspaceProps['onResizeMatrixValue'];
  onSetMatrixCell: MatrixWorkspaceProps['onSetMatrixCell'];
};

function MatrixValueCard({
  activeRoles,
  canDelete,
  value,
  onDeleteMatrixValue,
  onDuplicateMatrixValue,
  onRenameMatrixValue,
  onResizeMatrixValue,
  onSetMatrixCell,
}: MatrixValueCardProps) {
  const { id, name, value: matrix } = value;
  const rows = matrix.length || 1;
  const columns = matrixColumnCount(matrix);

  return (
    <div className="editor-card linear-algebra-value-card">
      <div className="linear-algebra-value-card-header">
        <div className="linear-algebra-value-title">
          <strong>Matrix</strong>
          <input
            aria-label={`Matrix ${name} name`}
            className="linear-algebra-name-input"
            maxLength={1}
            value={name}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => onRenameMatrixValue(id, event.currentTarget.value)}
          />
          {activeRoles.map((role) => (
            <span className="equation-badge" key={role}>{role}</span>
          ))}
        </div>
        <div className="linear-algebra-size-controls">
          <label>
            <span>Rows</span>
            <input
              aria-label={`Matrix ${name} rows`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={rows}
              onChange={(event) => onResizeMatrixValue(id, Number(event.currentTarget.value), columns)}
            />
          </label>
          <label>
            <span>Cols</span>
            <input
              aria-label={`Matrix ${name} columns`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={columns}
              onChange={(event) => onResizeMatrixValue(id, rows, Number(event.currentTarget.value))}
            />
          </label>
        </div>
        <div className="linear-algebra-card-actions">
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Duplicate Matrix ${name}`}
            onClick={() => onDuplicateMatrixValue(id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Delete Matrix ${name}`}
            disabled={!canDelete}
            onClick={() => onDeleteMatrixValue(id)}
          >
            Delete
          </button>
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
              key={`m${id}-${rowIndex}-${columnIndex}`}
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
  activeMatrixLeftId,
  activeMatrixRightId,
  matrixValues,
  onOpenGuideMode,
  onOpenGuideArticle,
  onAddMatrixValue,
  onDeleteMatrixValue,
  onDuplicateMatrixValue,
  onRenameMatrixValue,
  onResizeMatrixValue,
  onSetActiveMatrixValueIds,
  onSetMatrixCell,
}: MatrixWorkspaceProps) {
  const fallbackLeftId = matrixValues[0]?.id ?? '';
  const fallbackRightId = matrixValues[1]?.id ?? fallbackLeftId;
  const matrixIds = new Set(matrixValues.map((value) => value.id));
  const activeLeftId = matrixIds.has(activeMatrixLeftId) ? activeMatrixLeftId : fallbackLeftId;
  const activeRightId = matrixIds.has(activeMatrixRightId) ? activeMatrixRightId : fallbackRightId;
  const canAddMatrix = matrixValues.length < 25;

  function activeRolesFor(id: string) {
    const roles: string[] = [];
    if (id === activeLeftId) {
      roles.push('Left');
    }
    if (id === activeRightId) {
      roles.push('Right');
    }
    return roles;
  }

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
          <span className="equation-origin-badge">Named matrices</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('matrix')}>Guide: Matrix mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="linear-algebra-library-toolbar">
        <div className="linear-algebra-active-operands">
          <label>
            <span>Left</span>
            <select
              aria-label="Active Matrix left operand"
              value={activeLeftId}
              onChange={(event) => onSetActiveMatrixValueIds(event.currentTarget.value, activeRightId)}
            >
              {matrixValues.map((value) => (
                <option key={value.id} value={value.id}>{value.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Right</span>
            <select
              aria-label="Active Matrix right operand"
              value={activeRightId}
              onChange={(event) => onSetActiveMatrixValueIds(activeLeftId, event.currentTarget.value)}
            >
              {matrixValues.map((value) => (
                <option key={value.id} value={value.id}>{value.name}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="linear-algebra-tool-button linear-algebra-add-button"
          disabled={!canAddMatrix}
          onClick={() => onAddMatrixValue()}
        >
          Add Matrix
        </button>
      </div>
      <div className="linear-algebra-library-grid">
        {matrixValues.map((value) => (
          <MatrixValueCard
            key={value.id}
            activeRoles={activeRolesFor(value.id)}
            canDelete={matrixValues.length > 1}
            value={value}
            onDeleteMatrixValue={onDeleteMatrixValue}
            onDuplicateMatrixValue={onDuplicateMatrixValue}
            onRenameMatrixValue={onRenameMatrixValue}
            onResizeMatrixValue={onResizeMatrixValue}
            onSetMatrixCell={onSetMatrixCell}
          />
        ))}
      </div>
    </section>
  );
}

export { MatrixWorkspace };
