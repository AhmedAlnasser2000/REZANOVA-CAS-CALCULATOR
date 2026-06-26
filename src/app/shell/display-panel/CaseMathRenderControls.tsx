import { useEffect, useState } from 'react';
import { NotationText } from '../../../components/NotationText';
import {
  DISPLAY_CASE_ROW_REVEAL_DELAY_MS,
  nextCaseMathVisibleRowCount,
} from '../../../lib/display/scheduling/display-render-scheduler';
import type { CaseMathSizePolicy } from '../../../lib/display/scheduling/result-size-policy';

export function CaseMathCompactPreview({
  label,
  onShowFull,
  policy,
}: {
  label: string;
  onShowFull: () => void;
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
      <button
        type="button"
        className="prompt-action result-large-preview-action"
        onClick={onShowFull}
      >
        Show full formula cases
      </button>
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

function scheduleCaseRowRevealFrame(callback: () => void) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const frameId = window.requestAnimationFrame(callback);
    return () => window.cancelAnimationFrame?.(frameId);
  }

  const timeoutId = window.setTimeout(callback, DISPLAY_CASE_ROW_REVEAL_DELAY_MS);
  return () => window.clearTimeout(timeoutId);
}

export function useProgressiveCaseRowCount({
  enabled,
  signature,
  totalRows,
}: {
  enabled: boolean;
  signature: string;
  totalRows: number;
}) {
  const [state, setState] = useState(() => ({
    signature,
    visibleRows: enabled ? 0 : totalRows,
  }));

  useEffect(() => {
    if (!enabled) {
      setState((previous) => (
        previous.signature === signature && previous.visibleRows === totalRows
          ? previous
          : { signature, visibleRows: totalRows }
      ));
      return undefined;
    }

    if (totalRows <= 0) {
      setState({ signature, visibleRows: 0 });
      return undefined;
    }

    let cancelled = false;
    let visibleRows = 0;
    let cancelFrame: (() => void) | undefined;

    setState({ signature, visibleRows });

    const revealNext = () => {
      if (cancelled) {
        return;
      }

      visibleRows = nextCaseMathVisibleRowCount(visibleRows, totalRows);
      setState({ signature, visibleRows });

      if (visibleRows < totalRows) {
        cancelFrame = scheduleCaseRowRevealFrame(revealNext);
      }
    };

    cancelFrame = scheduleCaseRowRevealFrame(revealNext);

    return () => {
      cancelled = true;
      cancelFrame?.();
    };
  }, [enabled, signature, totalRows]);

  if (!enabled) {
    return totalRows;
  }

  return state.signature === signature ? Math.min(state.visibleRows, totalRows) : 0;
}
