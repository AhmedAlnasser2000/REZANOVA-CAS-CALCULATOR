import { useEffect, useState, type CSSProperties } from 'react';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import {
  isValidVectorValueName,
  normalizeVectorValueName,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/runtime-request';
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
  onInsertVectorName: (name: string) => void;
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
  activeLeftId: string;
  activeRightId: string;
  activeRoles: string[];
  canDuplicate: boolean;
  canDelete: boolean;
  vectorValues: readonly LinearAlgebraVectorNamedValue[];
  value: LinearAlgebraVectorNamedValue;
  onDeleteVectorValue: VectorWorkspaceProps['onDeleteVectorValue'];
  onDuplicateVectorValue: VectorWorkspaceProps['onDuplicateVectorValue'];
  onInsertVectorName: VectorWorkspaceProps['onInsertVectorName'];
  onRenameVectorValue: VectorWorkspaceProps['onRenameVectorValue'];
  onResizeVectorValue: VectorWorkspaceProps['onResizeVectorValue'];
  onSetActiveVectorValueIds: VectorWorkspaceProps['onSetActiveVectorValueIds'];
  onSetVectorCell: VectorWorkspaceProps['onSetVectorCell'];
};

function VectorValueCard({
  activeLeftId,
  activeRightId,
  activeRoles,
  canDuplicate,
  canDelete,
  vectorValues,
  value,
  onDeleteVectorValue,
  onDuplicateVectorValue,
  onInsertVectorName,
  onRenameVectorValue,
  onResizeVectorValue,
  onSetActiveVectorValueIds,
  onSetVectorCell,
}: VectorValueCardProps) {
  const { id, name, value: vector } = value;
  const length = vector.length || 1;
  const [draftName, setDraftName] = useState(name);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const validationId = `vector-name-feedback-${id}`;

  useEffect(() => {
    setDraftName(name);
    setNameFeedback(null);
  }, [name]);

  function validateAndRename(rawName: string) {
    const normalizedName = normalizeVectorValueName(rawName);
    setDraftName(normalizedName || rawName);
    if (!normalizedName) {
      setNameFeedback('Enter one Vector letter.');
      return;
    }
    if (!isValidVectorValueName(normalizedName)) {
      setNameFeedback('Use one lowercase Vector letter.');
      return;
    }
    const duplicate = vectorValues.some((vectorValue) =>
      vectorValue.id !== id && vectorValue.name === normalizedName);
    if (duplicate) {
      setNameFeedback('Name already exists.');
      return;
    }
    setNameFeedback(null);
    onRenameVectorValue(id, normalizedName);
  }

  function resetInvalidDraft() {
    if (nameFeedback) {
      setDraftName(name);
      setNameFeedback(null);
    }
  }

  return (
    <div className="editor-card linear-algebra-value-card">
      <div className="linear-algebra-value-card-header">
        <div className="linear-algebra-value-title">
          <strong>Vector</strong>
          <span className="linear-algebra-name-field">
            <input
              aria-describedby={nameFeedback ? validationId : undefined}
              aria-invalid={Boolean(nameFeedback)}
              aria-label={`Vector ${name} name`}
              className="linear-algebra-name-input"
              maxLength={1}
              value={draftName}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={resetInvalidDraft}
              onChange={(event) => validateAndRename(event.currentTarget.value)}
            />
            {nameFeedback ? (
              <span className="linear-algebra-validation-message" id={validationId} role="alert">
                {nameFeedback}
              </span>
            ) : null}
          </span>
          {activeRoles.map((role) => (
            <span className="linear-algebra-active-badge" key={role}>{role}</span>
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
          <div className="linear-algebra-role-actions" aria-label={`Vector ${name} operand actions`}>
            <button
              type="button"
              className="linear-algebra-tool-button linear-algebra-role-button"
              aria-label={`Set Vector ${name} as First`}
              disabled={id === activeLeftId}
              onClick={() => onSetActiveVectorValueIds(id, activeRightId)}
            >
              Set First
            </button>
            <button
              type="button"
              className="linear-algebra-tool-button linear-algebra-role-button"
              aria-label={`Set Vector ${name} as Second`}
              disabled={id === activeRightId}
              onClick={() => onSetActiveVectorValueIds(activeLeftId, id)}
            >
              Set Second
            </button>
          </div>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Insert Vector ${name} in editor`}
            onClick={() => onInsertVectorName(name)}
          >
            Insert {name}
          </button>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Duplicate Vector ${name}`}
            disabled={!canDuplicate}
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
  onInsertVectorName,
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
      roles.push('Active First');
    }
    if (id === activeRightId) {
      roles.push('Active Second');
    }
    return roles;
  }

  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Vector Workspace</strong>
          <p>
            Create named vectors, choose active First/Second operands, then use the
            editor or soft keys to build Vector operations.
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
            activeLeftId={activeLeftId}
            activeRightId={activeRightId}
            activeRoles={activeRolesFor(value.id)}
            canDuplicate={canAddVector}
            canDelete={vectorValues.length > 1}
            vectorValues={vectorValues}
            value={value}
            onDeleteVectorValue={onDeleteVectorValue}
            onDuplicateVectorValue={onDuplicateVectorValue}
            onInsertVectorName={onInsertVectorName}
            onRenameVectorValue={onRenameVectorValue}
            onResizeVectorValue={onResizeVectorValue}
            onSetActiveVectorValueIds={onSetActiveVectorValueIds}
            onSetVectorCell={onSetVectorCell}
          />
        ))}
      </div>
    </section>
  );
}

export { VectorWorkspace };
