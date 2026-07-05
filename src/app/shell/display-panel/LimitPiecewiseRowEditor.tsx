import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import {
  defaultLimitPiecewiseRows,
  parseLimitPiecewiseDraft,
  serializeLimitPiecewiseRequest,
  serializeLimitPiecewiseRows,
  type LimitPiecewiseRow,
  type LimitPiecewiseRowIssue,
} from '../../../lib/calculus/limit-piecewise-row-editor';
import { parseNaturalLimitRequest, type NaturalLimitRequest } from '../../../lib/calculus/limit-request';

type LimitPiecewiseRowEditorProps = {
  requestLatex: string;
  onChange: (requestLatex: string) => void;
  onSubmit?: () => void;
};

function issueFor(
  issues: readonly LimitPiecewiseRowIssue[],
  rowId: string,
  field: 'expression' | 'condition',
) {
  return issues.find((issue) => issue.rowId === rowId && issue.field === field);
}

function cleanConditionInput(value: string) {
  return value.replace(/^(\s*)if\b\s*/iu, '$1');
}

function normalizeLimitTargetDraft(value: string) {
  const trimmed = value.trim();
  const compact = trimmed.replace(/\s+/gu, '').replaceAll('∞', '\\infty').toLowerCase();
  const withoutPlus = compact.startsWith('+') ? compact.slice(1) : compact;
  if (['\\infty', 'infty', 'infinity', 'infinty'].includes(withoutPlus)) {
    return '\\infty';
  }
  const withoutMinus = compact.startsWith('-') ? compact.slice(1) : '';
  if (['\\infty', 'infty', 'infinity', 'infinty'].includes(withoutMinus)) {
    return '-\\infty';
  }
  return trimmed;
}

function normalizeRows(rows: readonly LimitPiecewiseRow[]) {
  const otherwise = rows.find((row) => row.otherwise);
  const regularRows = rows.filter((row) => !row.otherwise);
  return [...regularRows, ...(otherwise ? [otherwise] : [])]
    .map((row, index) => ({ ...row, id: `piecewise-row-${index + 1}` }));
}

function rowsWithUpdate(
  rows: readonly LimitPiecewiseRow[],
  rowId: string,
  patch: Partial<LimitPiecewiseRow>,
) {
  return normalizeRows(rows.map((row) => (
    row.id === rowId ? { ...row, ...patch } : row
  )));
}

function rowsWithDeletion(rows: readonly LimitPiecewiseRow[], rowId: string) {
  return normalizeRows(rows.filter((row) => row.id !== rowId));
}

function rowsWithInsertion(rows: readonly LimitPiecewiseRow[]) {
  const nextIndex = rows.length + 1;
  const nextRow: LimitPiecewiseRow = {
    id: `piecewise-row-${nextIndex}`,
    expressionLatex: '',
    conditionLatex: 'x<0',
    otherwise: false,
  };
  const otherwiseIndex = rows.findIndex((row) => row.otherwise);
  if (otherwiseIndex < 0) {
    return normalizeRows([...rows, nextRow]);
  }
  return normalizeRows([
    ...rows.slice(0, otherwiseIndex),
    nextRow,
    ...rows.slice(otherwiseIndex),
  ]);
}

function rowsWithReorder(rows: readonly LimitPiecewiseRow[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return normalizeRows(rows);
  }
  const fromRow = rows[fromIndex];
  const toRow = rows[toIndex];
  if (!fromRow || !toRow) {
    return normalizeRows(rows);
  }
  if (fromRow.otherwise !== toRow.otherwise) {
    return normalizeRows(rows.map((row, index) => {
      if (index === fromIndex) {
        return { ...row, expressionLatex: toRow.expressionLatex };
      }
      if (index === toIndex) {
        return { ...row, expressionLatex: fromRow.expressionLatex };
      }
      return row;
    }));
  }
  const nextRows = [...rows];
  const [moved] = nextRows.splice(fromIndex, 1);
  if (!moved) {
    return normalizeRows(rows);
  }
  nextRows.splice(toIndex, 0, moved);
  return normalizeRows(nextRows);
}

function targetInputValue(request: NaturalLimitRequest | null) {
  if (!request) {
    return '0';
  }
  const target = request.target;
  if (target.kind === 'infinite') {
    return target.normalizedTargetLatex;
  }
  if (target.direction === 'left') {
    return `${target.normalizedTargetLatex}^-`;
  }
  if (target.direction === 'right') {
    return `${target.normalizedTargetLatex}^+`;
  }
  return target.normalizedTargetLatex;
}

export const LimitPiecewiseRowEditor = forwardRef<HTMLElement, LimitPiecewiseRowEditorProps>(
  function LimitPiecewiseRowEditor(
    {
      requestLatex,
      onChange,
      onSubmit,
    },
    forwardedRef,
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const firstExpressionRef = useRef<HTMLInputElement | null>(null);
    const focusedInputRef = useRef<HTMLInputElement | null>(null);
    const dragIndexRef = useRef<number | null>(null);
    const [variableDraft, setVariableDraft] = useState('x');
    const [targetDraft, setTargetDraft] = useState('0');
    const parsedDraft = useMemo(() => parseLimitPiecewiseDraft(requestLatex), [requestLatex]);
    const parsedRequest = useMemo(() => parseNaturalLimitRequest(requestLatex), [requestLatex]);
    const request = parsedDraft?.request ?? (parsedRequest.ok ? parsedRequest.request : null);
    const rows = parsedDraft?.rows ?? defaultLimitPiecewiseRows();
    const issues = parsedDraft?.issues ?? [];
    const hasStartedRows = rows.some((row) => row.expressionLatex.trim());
    const canonicalRequestLatex = parsedDraft
      ? serializeLimitPiecewiseRequest(parsedDraft.request, parsedDraft.rows)
      : '';

    useImperativeHandle(forwardedRef, () => ({
      focus: () => {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement && editorRef.current?.contains(active)) {
          focusedInputRef.current = active;
          return;
        }
        (focusedInputRef.current ?? firstExpressionRef.current)?.focus();
      },
      blur: () => focusedInputRef.current?.blur(),
      get isConnected() {
        return editorRef.current?.isConnected ?? false;
      },
    }) as HTMLElement, []);

    useEffect(() => {
      if (canonicalRequestLatex && canonicalRequestLatex !== requestLatex.trim()) {
        onChange(canonicalRequestLatex);
      }
    }, [canonicalRequestLatex, onChange, requestLatex]);

    useEffect(() => {
      if (!request) {
        return;
      }
      setVariableDraft(request.variableLatex);
      setTargetDraft(targetInputValue(request));
    }, [request]);

    const commitRows = (nextRows: LimitPiecewiseRow[]) => {
      if (!request) {
        return;
      }
      onChange(serializeLimitPiecewiseRequest(request, nextRows));
    };

    const commitLimitControls = (nextVariableDraft = variableDraft, nextTargetDraft = targetDraft) => {
      if (!request) {
        return;
      }
      const nextVariable = nextVariableDraft.trim();
      const nextTarget = normalizeLimitTargetDraft(nextTargetDraft);
      if (!nextVariable || !nextTarget) {
        setVariableDraft(request.variableLatex);
        setTargetDraft(targetInputValue(request));
        return;
      }

      const candidate = `\\lim_{${nextVariable}\\to ${nextTarget}}${serializeLimitPiecewiseRows(rows)}`;
      const parsedCandidate = parseLimitPiecewiseDraft(candidate);
      if (!parsedCandidate) {
        setVariableDraft(request.variableLatex);
        setTargetDraft(targetInputValue(request));
        return;
      }
      onChange(serializeLimitPiecewiseRequest(parsedCandidate.request, parsedCandidate.rows));
    };

    const handleTextInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        onSubmit?.();
      }
    };

    const handleInputFocus = (event: FocusEvent<HTMLInputElement>) => {
      focusedInputRef.current = event.currentTarget;
    };

    const handleLimitControlKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      event.stopPropagation();
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        commitLimitControls();
        event.currentTarget.blur();
      }
    };

    return (
      <div
        ref={editorRef}
        className="limit-piecewise-editor"
        data-testid="main-editor"
        data-value={requestLatex}
        data-placeholder="Piecewise limit expression"
      >
        <div className="limit-piecewise-editor__limit">
          <div className="limit-piecewise-editor__limit-controls">
            <span className="limit-piecewise-editor__limit-word">lim</span>
            <label className="limit-piecewise-editor__limit-field">
              <span>variable</span>
              <input
                value={variableDraft}
                aria-label="Limit variable"
                spellCheck={false}
                onFocus={handleInputFocus}
                onKeyDown={handleLimitControlKeyDown}
                onBlur={() => commitLimitControls()}
                onChange={(event) => setVariableDraft(event.target.value)}
              />
            </label>
            <span className="limit-piecewise-editor__arrow" aria-hidden="true">-&gt;</span>
            <label className="limit-piecewise-editor__limit-field">
              <span>approaches</span>
              <input
                value={targetDraft}
                aria-label="Limit approaches"
                spellCheck={false}
                onFocus={handleInputFocus}
                onKeyDown={handleLimitControlKeyDown}
                onBlur={() => commitLimitControls()}
                onChange={(event) => setTargetDraft(event.target.value)}
              />
            </label>
          </div>
          <div className="limit-piecewise-editor__cases" data-testid="limit-piecewise-row-editor">
            <div className="limit-piecewise-editor__toolbar">
              <span>Piecewise rows</span>
              <button
                type="button"
                className="limit-piecewise-editor__remove"
                aria-label="Remove piecewise"
                title="Remove piecewise"
                onClick={() => onChange('')}
              >
                Remove Piecewise
              </button>
            </div>
            <div className="limit-piecewise-editor__header" aria-hidden="true">
              <span />
              <span />
              <span>Expression</span>
              <span>Condition</span>
              <span />
            </div>
            {rows.map((row, index) => {
              const expressionIssue = issueFor(issues, row.id, 'expression');
              const visibleExpressionIssue = hasStartedRows ? expressionIssue : undefined;
              const conditionIssue = issueFor(issues, row.id, 'condition');
              const visibleConditionIssue = hasStartedRows ? conditionIssue : undefined;
              return (
                <div
                  key={row.id}
                  className="limit-piecewise-row"
                  data-testid={`limit-piecewise-row-${index + 1}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fromIndex = dragIndexRef.current;
                    dragIndexRef.current = null;
                    if (fromIndex === null) {
                      return;
                    }
                    commitRows(rowsWithReorder(rows, fromIndex, index));
                  }}
                >
                  <span
                    className="limit-piecewise-row__drag"
                    aria-label="Drag row"
                    data-testid={`limit-piecewise-drag-${index + 1}`}
                    draggable
                    title="Drag row"
                    onDragStart={(event) => {
                      dragIndexRef.current = index;
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', row.id);
                    }}
                    onDragEnd={() => {
                      dragIndexRef.current = null;
                      window.getSelection?.()?.removeAllRanges();
                    }}
                  >
                    ⋮⋮
                  </span>
                  <span className="limit-piecewise-row__number">{index + 1}</span>
                  <label className={`limit-piecewise-row__field ${visibleExpressionIssue ? 'has-error' : ''}`}>
                    <input
                      ref={index === 0 ? firstExpressionRef : undefined}
                      value={row.expressionLatex}
                      placeholder="expression"
                      aria-label={`Expression row ${index + 1}`}
                      spellCheck={false}
                      onKeyDown={handleTextInputKeyDown}
                      onFocus={handleInputFocus}
                      onChange={(event) => commitRows(rowsWithUpdate(rows, row.id, {
                        expressionLatex: event.target.value,
                      }))}
                      aria-invalid={Boolean(visibleExpressionIssue)}
                    />
                    {visibleExpressionIssue ? (
                      <small>{visibleExpressionIssue.message}</small>
                    ) : null}
                  </label>
                  <label className={`limit-piecewise-row__field ${visibleConditionIssue ? 'has-error' : ''}`}>
                    <input
                      value={row.otherwise ? 'Otherwise' : row.conditionLatex}
                      placeholder="condition"
                      aria-label={`Condition row ${index + 1}`}
                      spellCheck={false}
                      onKeyDown={handleTextInputKeyDown}
                      onFocus={handleInputFocus}
                      onChange={(event) => {
                        const value = cleanConditionInput(event.target.value);
                        const otherwise = /^otherwise$/iu.test(value.trim());
                        commitRows(rowsWithUpdate(rows, row.id, {
                          conditionLatex: otherwise ? '\\text{otherwise}' : value,
                          otherwise,
                        }));
                      }}
                      aria-invalid={Boolean(visibleConditionIssue)}
                    />
                    {visibleConditionIssue ? (
                      <small>{visibleConditionIssue.message}</small>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    className="limit-piecewise-row__delete"
                    aria-label="Delete row"
                    title="Delete row"
                    onClick={() => commitRows(rowsWithDeletion(rows, row.id))}
                  >
                    x
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              className="limit-piecewise-editor__add"
              data-testid="limit-piecewise-add-row"
              onClick={() => commitRows(rowsWithInsertion(rows))}
            >
              Add Row
            </button>
          </div>
        </div>
      </div>
    );
  },
);
