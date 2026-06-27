import { useEffect, useState } from 'react';
import {
  DISPLAY_CASE_ROW_REVEAL_DELAY_MS,
  nextCaseMathVisibleRowCount,
} from '../../../lib/display/scheduling/display-render-scheduler';

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
    visibleRows: 0,
  }));

  useEffect(() => {
    if (!enabled || totalRows <= 0) {
      return undefined;
    }

    let cancelled = false;
    let visibleRows = 0;
    let cancelFrame: (() => void) | undefined;

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
