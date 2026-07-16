import { useEffect, useState, type CSSProperties } from 'react';
import {
  isValidVectorValueName,
  LINEAR_ALGEBRA_MIN_EDITING_DIMENSION,
  LINEAR_ALGEBRA_VECTOR_MAX_LENGTH,
  normalizeVectorValueName,
  resolveVectorNamedValueOperand,
  vectorNamedValueCellLatex,
  type LinearAlgebraScalarDomain,
  type LinearAlgebraScalarWireV1,
  type LinearAlgebraSubstitutionMode,
  type LinearAlgebraVectorNamedValue,
} from '../../lib/linear-algebra/runtime-request';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../types/calculator';
import { LinearAlgebraOperandPicker } from './LinearAlgebraOperandPicker';
import { LinearAlgebraScalarCell } from './LinearAlgebraScalarCell';
import { LinearAlgebraScalarControls } from './LinearAlgebraScalarControls';

type VectorWorkspaceProps = {
  activeVectorLeftId: string;
  activeVectorRightId: string;
  vectorValues: readonly LinearAlgebraVectorNamedValue[];
  vectorDomain: LinearAlgebraScalarDomain;
  vectorSubstitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[];
  onOpenGuideMode: (mode: 'vector') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onAddVectorValue: () => void;
  onDeleteVectorValue: (id: string) => void;
  onDuplicateVectorValue: (id: string) => void;
  onInsertVectorName: (name: string) => void;
  onRenameVectorValue: (id: string, name: string) => void;
  onResizeVectorValue: (id: string, length: number) => void;
  onSetActiveVectorValueIds: (leftId: string, rightId: string) => void;
  onSetVectorCellLatex: (id: string, index: number, latex: string) => string | null;
  onSetVectorDomain: (domain: LinearAlgebraScalarDomain) => void;
  onSetVectorSubstitutionMode: (mode: LinearAlgebraSubstitutionMode) => void;
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
  resolvedValue?: readonly LinearAlgebraScalarWireV1[];
  validationKey: string;
  onDeleteVectorValue: VectorWorkspaceProps['onDeleteVectorValue'];
  onDuplicateVectorValue: VectorWorkspaceProps['onDuplicateVectorValue'];
  onInsertVectorName: VectorWorkspaceProps['onInsertVectorName'];
  onRenameVectorValue: VectorWorkspaceProps['onRenameVectorValue'];
  onResizeVectorValue: VectorWorkspaceProps['onResizeVectorValue'];
  onSetActiveVectorValueIds: VectorWorkspaceProps['onSetActiveVectorValueIds'];
  onSetVectorCellLatex: VectorWorkspaceProps['onSetVectorCellLatex'];
};

function VectorValueCard({
  activeLeftId,
  activeRightId,
  activeRoles,
  canDuplicate,
  canDelete,
  vectorValues,
  value,
  resolvedValue,
  validationKey,
  onDeleteVectorValue,
  onDuplicateVectorValue,
  onInsertVectorName,
  onRenameVectorValue,
  onResizeVectorValue,
  onSetActiveVectorValueIds,
  onSetVectorCellLatex,
}: VectorValueCardProps) {
  const { id, name, value: vector } = value;
  const length = vector.length || 1;
  const [draftName, setDraftName] = useState(name);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const validationId = `vector-name-feedback-${id}`;

  useEffect(() => {
    const resetTimeoutId = window.setTimeout(() => {
      setDraftName(name);
      setNameFeedback(null);
    }, 0);
    return () => window.clearTimeout(resetTimeoutId);
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
    <div className={`editor-card linear-algebra-value-card${length > 4 ? ' linear-algebra-value-card--wide' : ''}`}>
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
              min={LINEAR_ALGEBRA_MIN_EDITING_DIMENSION}
              max={LINEAR_ALGEBRA_VECTOR_MAX_LENGTH}
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
        {vector.map((_cell, index) => (
          <LinearAlgebraScalarCell
            ariaLabel={`Vector ${name} component ${index + 1}`}
            columnIndex={index}
            groupId={`vector-${id}`}
            key={`v${id}-${index}`}
            onCommit={(latex) => onSetVectorCellLatex(id, index, latex)}
            resolvedLatex={resolvedValue?.[index]?.canonicalLatex}
            rowIndex={0}
            validationKey={validationKey}
            value={vectorNamedValueCellLatex(value, index)}
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
  vectorDomain,
  vectorSubstitutionMode,
  storedVariables,
  onOpenGuideMode,
  onOpenGuideArticle,
  onAddVectorValue,
  onDeleteVectorValue,
  onDuplicateVectorValue,
  onInsertVectorName,
  onRenameVectorValue,
  onResizeVectorValue,
  onSetActiveVectorValueIds,
  onSetVectorCellLatex,
  onSetVectorDomain,
  onSetVectorSubstitutionMode,
}: VectorWorkspaceProps) {
  const fallbackLeftId = vectorValues[0]?.id ?? '';
  const fallbackRightId = vectorValues[1]?.id ?? fallbackLeftId;
  const vectorIds = new Set(vectorValues.map((value) => value.id));
  const activeLeftId = vectorIds.has(activeVectorLeftId) ? activeVectorLeftId : fallbackLeftId;
  const activeRightId = vectorIds.has(activeVectorRightId) ? activeVectorRightId : fallbackRightId;
  const canAddVector = vectorValues.length < 26;
  const protectedNames = vectorValues.map((value) => value.name);
  const resolutions = vectorValues.map((value) => resolveVectorNamedValueOperand(value, {
    domain: vectorDomain,
    mode: vectorSubstitutionMode,
    protectedNames,
    storedVariables,
  }));
  const usedByName = new Map<string, VariableSubstitutionSnapshot>();
  for (const resolution of resolutions) {
    if (!('error' in resolution)) {
      for (const substitution of resolution.substitutions) usedByName.set(substitution.name, substitution);
    }
  }

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
      <LinearAlgebraScalarControls
        domain={vectorDomain}
        substitutionMode={vectorSubstitutionMode}
        onDomainChange={onSetVectorDomain}
        onSubstitutionModeChange={onSetVectorSubstitutionMode}
        usedValues={[...usedByName.values()]}
      />
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
        {vectorValues.map((value, valueIndex) => (
          <VectorValueCard
            key={value.id}
            activeLeftId={activeLeftId}
            activeRightId={activeRightId}
            activeRoles={activeRolesFor(value.id)}
            canDuplicate={canAddVector}
            canDelete={vectorValues.length > 1}
            vectorValues={vectorValues}
            value={value}
            resolvedValue={'error' in resolutions[valueIndex]
              ? undefined
              : resolutions[valueIndex].operand.resolved}
            validationKey={`${vectorDomain}:${vectorSubstitutionMode}`}
            onDeleteVectorValue={onDeleteVectorValue}
            onDuplicateVectorValue={onDuplicateVectorValue}
            onInsertVectorName={onInsertVectorName}
            onRenameVectorValue={onRenameVectorValue}
            onResizeVectorValue={onResizeVectorValue}
            onSetActiveVectorValueIds={onSetActiveVectorValueIds}
            onSetVectorCellLatex={onSetVectorCellLatex}
          />
        ))}
      </div>
    </section>
  );
}

export { VectorWorkspace };
