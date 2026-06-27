import { NotationText } from '../../../components/NotationText';
import type { CaseMathSizePolicy } from '../../../lib/display/scheduling/result-size-policy';

export function CaseMathCompactPreview({
  label,
  onOpenViewer,
  onShowFull,
  policy,
}: {
  label: string;
  onOpenViewer?: () => void;
  onShowFull?: () => void;
  policy: Extract<CaseMathSizePolicy, { kind: 'compact' }>;
}) {
  const groupedText = policy.groupCount > 1
    ? ` across ${policy.groupCount.toLocaleString()} generated branches`
    : '';

  return (
    <div className="result-large-preview result-case-compact-preview" data-testid={`${label}-compact-preview`}>
      <NotationText
        className="result-large-preview-note"
        text="Formula cases paused for responsiveness."
      />
      <NotationText
        className="result-large-preview-meta"
        text={`${policy.rowCount.toLocaleString()} guarded case rows${groupedText}; ${policy.latexLength.toLocaleString()} characters.`}
      />
      <NotationText
        className="result-large-preview-meta"
        text="Row-local conditions are preserved and render when the full cases are shown."
      />
      {onOpenViewer ? (
        <button
          type="button"
          className="prompt-action result-large-preview-action"
          data-testid={`${label}-open-formula-viewer`}
          onClick={onOpenViewer}
        >
          Open Formula Viewer
        </button>
      ) : (
        <button
          type="button"
          className="prompt-action result-large-preview-action"
          onClick={onShowFull}
        >
          Show full formula cases
        </button>
      )}
    </div>
  );
}

export function CaseMathRowPlaceholder({
  onShowRow,
  renderCost,
  testId,
}: {
  onShowRow: () => void;
  renderCost: number;
  testId: string;
}) {
  return (
    <div className="result-case-row-paused" data-testid={testId}>
      <NotationText
        className="result-large-preview-note"
        text="Formula row paused for responsiveness."
      />
      <NotationText
        className="result-large-preview-meta"
        text={`${renderCost.toLocaleString()} render-cost units. Row-local condition preserved.`}
      />
      <button
        type="button"
        className="prompt-action result-case-row-paused-action"
        onClick={onShowRow}
      >
        Show formula row
      </button>
    </div>
  );
}
