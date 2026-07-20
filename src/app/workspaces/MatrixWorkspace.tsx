import { useEffect, useState, type CSSProperties } from 'react';
import {
  isValidMatrixValueName,
  LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS,
  LINEAR_ALGEBRA_MATRIX_MAX_ROWS,
  LINEAR_ALGEBRA_MIN_EDITING_DIMENSION,
  matrixNamedValueCellLatex,
  normalizeMatrixValueName,
  resolveMatrixNamedValueOperand,
  type LinearAlgebraScalarDomain,
  type LinearAlgebraScalarWireV1,
  type LinearAlgebraSubstitutionMode,
  type LinearAlgebraMatrixNamedValue,
} from '../../lib/linear-algebra/runtime-request';
import type { StoredVariableValue, VariableSubstitutionSnapshot } from '../../types/calculator';
import { LinearAlgebraOperandPicker } from './LinearAlgebraOperandPicker';
import { LinearAlgebraScalarCell } from './LinearAlgebraScalarCell';
import { LinearAlgebraScalarControls } from './LinearAlgebraScalarControls';

type MatrixWorkspaceProps = {
  activeMatrixLeftId: string;
  activeMatrixRightId: string;
  matrixValues: readonly LinearAlgebraMatrixNamedValue[];
  matrixDomain: LinearAlgebraScalarDomain;
  matrixSubstitutionMode: LinearAlgebraSubstitutionMode;
  storedVariables: readonly StoredVariableValue[];
  onOpenGuideMode: (mode: 'matrix') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onAddMatrixValue: () => void;
  onDeleteMatrixValue: (id: string) => void;
  onDuplicateMatrixValue: (id: string) => void;
  onInsertMatrixName: (name: string) => void;
  onRenameMatrixValue: (id: string, name: string) => void;
  onResizeMatrixValue: (id: string, rows: number, columns: number) => void;
  onSetActiveMatrixValueIds: (leftId: string, rightId: string) => void;
  onSetMatrixCellLatex: (
    id: string,
    row: number,
    column: number,
    latex: string,
  ) => string | null | Promise<string | null>;
  onSetMatrixDomain: (domain: LinearAlgebraScalarDomain) => void;
  onSetMatrixSubstitutionMode: (mode: LinearAlgebraSubstitutionMode) => void;
};

function matrixColumnCount(matrix: readonly (readonly unknown[])[]) {
  return matrix[0]?.length ?? 1;
}

function gridColumnStyle(columns: number): CSSProperties {
  return {
    '--linear-algebra-columns': String(columns),
  } as CSSProperties;
}

type MatrixValueCardProps = {
  activeLeftId: string;
  activeRightId: string;
  activeRoles: string[];
  canDuplicate: boolean;
  canDelete: boolean;
  matrixValues: readonly LinearAlgebraMatrixNamedValue[];
  value: LinearAlgebraMatrixNamedValue;
  resolvedValue?: readonly (readonly LinearAlgebraScalarWireV1[])[];
  validationKey: string;
  onDeleteMatrixValue: MatrixWorkspaceProps['onDeleteMatrixValue'];
  onDuplicateMatrixValue: MatrixWorkspaceProps['onDuplicateMatrixValue'];
  onInsertMatrixName: MatrixWorkspaceProps['onInsertMatrixName'];
  onRenameMatrixValue: MatrixWorkspaceProps['onRenameMatrixValue'];
  onResizeMatrixValue: MatrixWorkspaceProps['onResizeMatrixValue'];
  onSetActiveMatrixValueIds: MatrixWorkspaceProps['onSetActiveMatrixValueIds'];
  onSetMatrixCellLatex: MatrixWorkspaceProps['onSetMatrixCellLatex'];
};

function MatrixValueCard({
  activeLeftId,
  activeRightId,
  activeRoles,
  canDuplicate,
  canDelete,
  matrixValues,
  value,
  resolvedValue,
  validationKey,
  onDeleteMatrixValue,
  onDuplicateMatrixValue,
  onInsertMatrixName,
  onRenameMatrixValue,
  onResizeMatrixValue,
  onSetActiveMatrixValueIds,
  onSetMatrixCellLatex,
}: MatrixValueCardProps) {
  const { id, name, value: matrix } = value;
  const rows = matrix.length || 1;
  const columns = matrixColumnCount(matrix);
  const [draftName, setDraftName] = useState(name);
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const validationId = `matrix-name-feedback-${id}`;

  useEffect(() => {
    const resetTimeoutId = window.setTimeout(() => {
      setDraftName(name);
      setNameFeedback(null);
    }, 0);
    return () => window.clearTimeout(resetTimeoutId);
  }, [name]);

  function validateAndRename(rawName: string) {
    const normalizedName = normalizeMatrixValueName(rawName);
    setDraftName(normalizedName || rawName);
    if (!normalizedName) {
      setNameFeedback('Enter one Matrix letter.');
      return;
    }
    if (!isValidMatrixValueName(normalizedName)) {
      setNameFeedback('Use one Matrix letter A-W, Y, or Z.');
      return;
    }
    const duplicate = matrixValues.some((matrixValue) =>
      matrixValue.id !== id && matrixValue.name === normalizedName);
    if (duplicate) {
      setNameFeedback('Name already exists.');
      return;
    }
    setNameFeedback(null);
    onRenameMatrixValue(id, normalizedName);
  }

  function resetInvalidDraft() {
    if (nameFeedback) {
      setDraftName(name);
      setNameFeedback(null);
    }
  }

  return (
    <div className={`editor-card linear-algebra-value-card${columns > 4 ? ' linear-algebra-value-card--wide' : ''}`}>
      <div className="linear-algebra-value-card-header">
        <div className="linear-algebra-value-title">
          <strong>Matrix</strong>
          <span className="linear-algebra-name-field">
            <input
              aria-describedby={nameFeedback ? validationId : undefined}
              aria-invalid={Boolean(nameFeedback)}
              aria-label={`Matrix ${name} name`}
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
            <span>Rows</span>
            <input
              aria-label={`Matrix ${name} rows`}
              type="number"
              min={LINEAR_ALGEBRA_MIN_EDITING_DIMENSION}
              max={LINEAR_ALGEBRA_MATRIX_MAX_ROWS}
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
              min={LINEAR_ALGEBRA_MIN_EDITING_DIMENSION}
              max={LINEAR_ALGEBRA_MATRIX_MAX_COLUMNS}
              step={1}
              value={columns}
              onChange={(event) => onResizeMatrixValue(id, rows, Number(event.currentTarget.value))}
            />
          </label>
        </div>
        <div className="linear-algebra-card-actions">
          <div className="linear-algebra-role-actions" aria-label={`Matrix ${name} operand actions`}>
            <button
              type="button"
              className="linear-algebra-tool-button linear-algebra-role-button"
              aria-label={`Set Matrix ${name} as Left`}
              disabled={id === activeLeftId}
              onClick={() => onSetActiveMatrixValueIds(id, activeRightId)}
            >
              Set Left
            </button>
            <button
              type="button"
              className="linear-algebra-tool-button linear-algebra-role-button"
              aria-label={`Set Matrix ${name} as Right`}
              disabled={id === activeRightId}
              onClick={() => onSetActiveMatrixValueIds(activeLeftId, id)}
            >
              Set Right
            </button>
          </div>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Insert Matrix ${name} in editor`}
            onClick={() => onInsertMatrixName(name)}
          >
            Insert {name}
          </button>
          <button
            type="button"
            className="linear-algebra-tool-button"
            aria-label={`Duplicate Matrix ${name}`}
            disabled={!canDuplicate}
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
          row.map((_cell, columnIndex) => (
            <LinearAlgebraScalarCell
              ariaLabel={`Matrix ${name} row ${rowIndex + 1} column ${columnIndex + 1}`}
              columnIndex={columnIndex}
              groupId={`matrix-${id}`}
              key={`m${id}-${rowIndex}-${columnIndex}`}
              onCommit={(latex) => onSetMatrixCellLatex(id, rowIndex, columnIndex, latex)}
              resolvedLatex={resolvedValue?.[rowIndex]?.[columnIndex]?.canonicalLatex}
              rowIndex={rowIndex}
              validationKey={validationKey}
              value={matrixNamedValueCellLatex(value, rowIndex, columnIndex)}
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
  matrixDomain,
  matrixSubstitutionMode,
  storedVariables,
  onOpenGuideMode,
  onOpenGuideArticle,
  onAddMatrixValue,
  onDeleteMatrixValue,
  onDuplicateMatrixValue,
  onInsertMatrixName,
  onRenameMatrixValue,
  onResizeMatrixValue,
  onSetActiveMatrixValueIds,
  onSetMatrixCellLatex,
  onSetMatrixDomain,
  onSetMatrixSubstitutionMode,
}: MatrixWorkspaceProps) {
  const fallbackLeftId = matrixValues[0]?.id ?? '';
  const fallbackRightId = matrixValues[1]?.id ?? fallbackLeftId;
  const matrixIds = new Set(matrixValues.map((value) => value.id));
  const activeLeftId = matrixIds.has(activeMatrixLeftId) ? activeMatrixLeftId : fallbackLeftId;
  const activeRightId = matrixIds.has(activeMatrixRightId) ? activeMatrixRightId : fallbackRightId;
  const canAddMatrix = matrixValues.length < 25;
  const protectedNames = matrixValues.map((value) => value.name);
  const resolutions = matrixValues.map((value) => resolveMatrixNamedValueOperand(value, {
    domain: matrixDomain,
    mode: matrixSubstitutionMode,
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
      roles.push('Active Left');
    }
    if (id === activeRightId) {
      roles.push('Active Right');
    }
    return roles;
  }

  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Matrix Workspace</strong>
          <p>
            Create named matrices, choose active Left/Right operands, then use the editor
            or soft keys to build Matrix operations.
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
      <LinearAlgebraScalarControls
        domain={matrixDomain}
        substitutionMode={matrixSubstitutionMode}
        onDomainChange={onSetMatrixDomain}
        onSubstitutionModeChange={onSetMatrixSubstitutionMode}
        usedValues={[...usedByName.values()]}
      />
      <div className="linear-algebra-library-toolbar">
        <div className="linear-algebra-active-operands">
          <LinearAlgebraOperandPicker
            activeId={activeLeftId}
            ariaLabel="Active Matrix left operand"
            label="Left"
            options={matrixValues}
            onChange={(id) => onSetActiveMatrixValueIds(id, activeRightId)}
          />
          <LinearAlgebraOperandPicker
            activeId={activeRightId}
            ariaLabel="Active Matrix right operand"
            label="Right"
            options={matrixValues}
            onChange={(id) => onSetActiveMatrixValueIds(activeLeftId, id)}
          />
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
        {matrixValues.map((value, valueIndex) => (
          <MatrixValueCard
            key={value.id}
            activeLeftId={activeLeftId}
            activeRightId={activeRightId}
            activeRoles={activeRolesFor(value.id)}
            canDuplicate={canAddMatrix}
            canDelete={matrixValues.length > 1}
            matrixValues={matrixValues}
            value={value}
            resolvedValue={'error' in resolutions[valueIndex]
              ? undefined
              : resolutions[valueIndex].operand.resolved}
            validationKey={`${matrixDomain}:${matrixSubstitutionMode}`}
            onDeleteMatrixValue={onDeleteMatrixValue}
            onDuplicateMatrixValue={onDuplicateMatrixValue}
            onInsertMatrixName={onInsertMatrixName}
            onRenameMatrixValue={onRenameMatrixValue}
            onResizeMatrixValue={onResizeMatrixValue}
            onSetActiveMatrixValueIds={onSetActiveMatrixValueIds}
            onSetMatrixCellLatex={onSetMatrixCellLatex}
          />
        ))}
      </div>
    </section>
  );
}

export { MatrixWorkspace };
