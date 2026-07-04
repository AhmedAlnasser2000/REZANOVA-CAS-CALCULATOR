import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { KeyboardEvent } from 'react';
import { MathStatic } from '../../../components/MathStatic';
import {
  defaultLimitPiecewiseRows,
  parseLimitPiecewiseDraft,
  serializeLimitPiecewiseRequest,
  type LimitPiecewiseRow,
  type LimitPiecewiseRowIssue,
} from '../../../lib/calculus/limit-piecewise-row-editor';
import { parseNaturalLimitRequest } from '../../../lib/calculus/limit-request';

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
  return value.trim().replace(/^if\b\s*/iu, '');
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
  const nextRows = [...rows];
  const [moved] = nextRows.splice(fromIndex, 1);
  if (!moved) {
    return normalizeRows(rows);
  }
  nextRows.splice(toIndex, 0, moved);
  return normalizeRows(nextRows);
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
    const firstExpressionRef = useRef<HTMLInputElement | null>(null);
    const dragIndexRef = useRef<number | null>(null);
    const parsedDraft = useMemo(() => parseLimitPiecewiseDraft(requestLatex), [requestLatex]);
    const parsedRequest = useMemo(() => parseNaturalLimitRequest(requestLatex), [requestLatex]);
    const request = parsedDraft?.request ?? (parsedRequest.ok ? parsedRequest.request : null);
    const rows = parsedDraft?.rows ?? defaultLimitPiecewiseRows();
    const issues = parsedDraft?.issues ?? [];
    const canonicalRequestLatex = parsedDraft
      ? serializeLimitPiecewiseRequest(parsedDraft.request, parsedDraft.rows)
      : '';

    useImperativeHandle(forwardedRef, () => ({
      focus: () => firstExpressionRef.current?.focus(),
    }) as HTMLElement, []);

    useEffect(() => {
      if (canonicalRequestLatex && canonicalRequestLatex !== requestLatex.trim()) {
        onChange(canonicalRequestLatex);
      }
    }, [canonicalRequestLatex, onChange, requestLatex]);

    const commitRows = (nextRows: LimitPiecewiseRow[]) => {
      if (!request) {
        return;
      }
      onChange(serializeLimitPiecewiseRequest(request, nextRows));
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        onSubmit?.();
      }
    };

    return (
      <div
        className="limit-piecewise-editor"
        data-testid="main-editor"
        data-value={requestLatex}
        data-placeholder="Piecewise limit expression"
      >
        <div className="limit-piecewise-editor__limit">
          <MathStatic
            className="limit-piecewise-editor__limit-math"
            latex={request ? `\\lim_{${request.variableLatex}\\to ${request.target.normalizedTargetLatex}}` : '\\lim'}
            deferRender
          />
          <div className="limit-piecewise-editor__cases" data-testid="limit-piecewise-row-editor">
            <div className="limit-piecewise-editor__header" aria-hidden="true">
              <span />
              <span />
              <span>Expression</span>
              <span>Condition</span>
              <span />
            </div>
            {rows.map((row, index) => {
              const expressionIssue = issueFor(issues, row.id, 'expression');
              const conditionIssue = issueFor(issues, row.id, 'condition');
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
                    }}
                  >
                    ⋮⋮
                  </span>
                  <span className="limit-piecewise-row__number">{index + 1}</span>
                  <label className={`limit-piecewise-row__field ${expressionIssue ? 'has-error' : ''}`}>
                    <input
                      ref={index === 0 ? firstExpressionRef : undefined}
                      value={row.expressionLatex}
                      placeholder="expression"
                      aria-label={`Expression row ${index + 1}`}
                      spellCheck={false}
                      onKeyDown={handleKeyDown}
                      onChange={(event) => commitRows(rowsWithUpdate(rows, row.id, {
                        expressionLatex: event.target.value,
                      }))}
                      aria-invalid={Boolean(expressionIssue)}
                    />
                    {expressionIssue ? (
                      <small>{expressionIssue.message}</small>
                    ) : null}
                  </label>
                  <label className={`limit-piecewise-row__field ${conditionIssue ? 'has-error' : ''}`}>
                    <input
                      value={row.otherwise ? 'Otherwise' : row.conditionLatex}
                      placeholder="condition"
                      aria-label={`Condition row ${index + 1}`}
                      spellCheck={false}
                      readOnly={row.otherwise}
                      onKeyDown={handleKeyDown}
                      onChange={(event) => {
                        const value = cleanConditionInput(event.target.value);
                        const otherwise = /^otherwise$/iu.test(value.trim());
                        commitRows(rowsWithUpdate(rows, row.id, {
                          conditionLatex: otherwise ? '\\text{otherwise}' : value,
                          otherwise,
                        }));
                      }}
                      aria-invalid={Boolean(conditionIssue)}
                    />
                    {conditionIssue ? (
                      <small>{conditionIssue.message}</small>
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
