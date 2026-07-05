import type { CSSProperties } from 'react';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import type { LinearAlgebraVectorNamedValue } from '../../lib/linear-algebra/runtime-request';
import { LinearAlgebraOperandPicker } from './LinearAlgebraOperandPicker';

type VectorWorkspaceProps = {
  activeVectorLeftId: string;
  activeVectorRightId: string;
  vectorValues: readonly LinearAlgebraVectorNamedValue[];
  onOpenGuideMode: (mode: 'vector') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onAddVectorValue: () => void;
  onDeleteVectorValue: (id: string) => void;
  onDuplicateVectorValue: (id: string) => void;
  onRenameVectorValue: (id: string, name: string) => void;
  onResizeVectorValue: (id: string, length: number) => void;
  onSetActiveVectorValueIds: (leftId: string, rightId: string) => void;
  onSetVectorCell: (id: string, index: number, value: number) => void;
};

function gridColumnStyle(columns: number): CSSProperties {
  return {
    '--linear-algebra-columns': String(columns),
  } as CSSProperties;
}

type VectorValueCardProps = {
  activeRoles: string[];
  canDelete: boolean;
  value: LinearAlgebraVectorNamedValue;
  onDeleteVectorValue: VectorWorkspaceProps['onDeleteVectorValue'];
  onDuplicateVectorValue: VectorWorkspaceProps['onDuplicateVectorValue'];
  onRenameVectorValue: VectorWorkspaceProps['onRenameVectorValue'];
  onResizeVectorValue: VectorWorkspaceProps['onResizeVectorValue'];
  onSetVectorCell: VectorWorkspaceProps['onSetVectorCell'];
};

function VectorValueCard({
  activeRoles,
  canDelete,
  value,
  onDeleteVectorValue,
  onDuplicateVectorValue,
  onRenameVectorValue,
  onResizeVectorValue,
  onSetVectorCell,
}: VectorValueCardProps) {
  const { id, name, value: vector } = value;
  const length = vector.length || 1;

  return (
    <div className="editor-card linear-algebra-value-card">
      <div className="linear-algebra-value-card-header">
        <div className="linear-algebra-value-title">
          <strong>Vector</strong>
          <input
            aria-label={`Vector ${name} name`}
            className="linear-algebra-name-input"
            maxLength={1}
            value={name}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => onRenameVectorValue(id, event.currentTarget.value)}
          />
          {activeRoles.map((role) => (
            <span className="equation-badge" key={role}>{role}</span>
          ))}
        </div>
        <div className="linear-algebra-size-controls">
          <label>
            <span>Length</span>
            <input
              aria-label={`Vector ${name} length`}
              type="number"
              min={1}
              max={8}
              step={1}
              value={length}
              onChange={(event) => onResizeVectorValue(id, Number(event.currentTarget.value))}
            />
          </label>
        </div>
        <div className="linear-algebra-card-actions">
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Duplicate Vector ${name}`}
            onClick={() => onDuplicateVectorValue(id)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Delete Vector ${name}`}
            disabled={!canDelete}
            onClick={() => onDeleteVectorValue(id)}
          >
            Delete
          </button>
        </div>
      </div>
      <div
        className="vector-grid linear-algebra-vector-grid"
        data-columns={length}
        style={gridColumnStyle(length)}
      >
        {vector.map((value, index) => (
          <SignedNumberInput
            key={`v${id}-${index}`}
            value={value}
            onValueChange={(nextValue) => onSetVectorCell(id, index, nextValue)}
          />
        ))}
      </div>
    </div>
  );
}

function VectorWorkspace({
  activeVectorLeftId,
  activeVectorRightId,
  vectorValues,
  onOpenGuideMode,
  onOpenGuideArticle,
  onAddVectorValue,
  onDeleteVectorValue,
  onDuplicateVectorValue,
  onRenameVectorValue,
  onResizeVectorValue,
  onSetActiveVectorValueIds,
  onSetVectorCell,
}: VectorWorkspaceProps) {
  const fallbackLeftId = vectorValues[0]?.id ?? '';
  const fallbackRightId = vectorValues[1]?.id ?? fallbackLeftId;
  const vectorIds = new Set(vectorValues.map((value) => value.id));
  const activeLeftId = vectorIds.has(activeVectorLeftId) ? activeVectorLeftId : fallbackLeftId;
  const activeRightId = vectorIds.has(activeVectorRightId) ? activeVectorRightId : fallbackRightId;
  const canAddVector = vectorValues.length < 26;

  function activeRolesFor(id: string) {
    const roles: string[] = [];
    if (id === activeLeftId) {
      roles.push('First');
    }
    if (id === activeRightId) {
      roles.push('Second');
    }
    return roles;
  }

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
          <span className="equation-origin-badge">Named vectors</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('vector')}>Guide: Vector mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="linear-algebra-library-toolbar">
        <div className="linear-algebra-active-operands">
          <LinearAlgebraOperandPicker
            activeId={activeLeftId}
            ariaLabel="Active Vector first operand"
            label="First"
            options={vectorValues}
            onChange={(id) => onSetActiveVectorValueIds(id, activeRightId)}
          />
          <LinearAlgebraOperandPicker
            activeId={activeRightId}
            ariaLabel="Active Vector second operand"
            label="Second"
            options={vectorValues}
            onChange={(id) => onSetActiveVectorValueIds(activeLeftId, id)}
          />
        </div>
        <button
          type="button"
          className="linear-algebra-tool-button linear-algebra-add-button"
          disabled={!canAddVector}
          onClick={() => onAddVectorValue()}
        >
          Add Vector
        </button>
      </div>
      <div className="linear-algebra-library-grid">
        {vectorValues.map((value) => (
          <VectorValueCard
            key={value.id}
            activeRoles={activeRolesFor(value.id)}
            canDelete={vectorValues.length > 1}
            value={value}
            onDeleteVectorValue={onDeleteVectorValue}
            onDuplicateVectorValue={onDuplicateVectorValue}
            onRenameVectorValue={onRenameVectorValue}
            onResizeVectorValue={onResizeVectorValue}
            onSetVectorCell={onSetVectorCell}
          />
        ))}
      </div>
    </section>
  );
}

export { VectorWorkspace };
