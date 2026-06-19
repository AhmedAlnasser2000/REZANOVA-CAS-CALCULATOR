import { useEffect, useState } from 'react';
import {
  formatPendingRuntimeStatusLabel,
  formatReadyRuntimeElapsedLabel,
  runtimeElapsedMs,
} from './runtimeElapsedTime';
import type { PendingRuntimeStatus } from './useHistoryDisplayRuntime';

export const USER_VISIBLE_OOE_TICKET_CAPABILITY_IDS = [
  'equation.solve',
  'table.build',
  'calculus.evaluate',
  'statistics.evaluate',
  'trigonometry.evaluate',
  'geometry.evaluate',
  'linearAlgebra.matrix',
  'linearAlgebra.vector',
  'expression.evaluate',
  'expression.simplify',
  'expression.factor',
  'expression.expand',
  'calculate.algebraTransform',
  'calculate.workbench',
] as const;

export function useDisplayRuntimeStatus({
  activeRuntimeStatus,
  editorAnalysisStopped,
  lastRuntimeElapsedMs,
}: {
  activeRuntimeStatus: PendingRuntimeStatus | null;
  editorAnalysisStopped: boolean;
  lastRuntimeElapsedMs: number | null;
}) {
  const activeRuntimeStartedAtMs = activeRuntimeStatus?.startedAtMs ?? null;
  const activeRuntimeStatusKind = activeRuntimeStatus?.status ?? null;
  const activeRuntimeTicketId = activeRuntimeStatus?.ticketId ?? null;
  const [runtimeElapsedNowMs, setRuntimeElapsedNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (activeRuntimeStartedAtMs === null || activeRuntimeStatusKind === null) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setRuntimeElapsedNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [
    activeRuntimeStartedAtMs,
    activeRuntimeStatusKind,
    activeRuntimeTicketId,
  ]);

  const activeRuntimeStatusLabel = activeRuntimeStatus
    ? formatPendingRuntimeStatusLabel(
        activeRuntimeStatus.status,
        runtimeElapsedMs(activeRuntimeStatus.startedAtMs, runtimeElapsedNowMs),
      )
    : null;
  const readyRuntimeStatusLabel = lastRuntimeElapsedMs !== null
    ? formatReadyRuntimeElapsedLabel(lastRuntimeElapsedMs)
    : 'Ready';
  const editorRuntimeStopDisabled =
    activeRuntimeStatusKind === 'stopping'
      ? true
      : editorAnalysisStopped && activeRuntimeStatusKind !== 'computing';

  return {
    activeRuntimeStatusLabel,
    editorRuntimeStopDisabled,
    readyRuntimeStatusLabel,
  };
}
