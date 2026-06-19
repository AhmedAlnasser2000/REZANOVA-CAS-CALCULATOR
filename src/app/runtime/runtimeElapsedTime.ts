export type RuntimeElapsedPendingStatus = 'computing' | 'stopping';

const MIN_FINAL_RUNTIME_SECONDS = 0.01;

export function runtimeElapsedMs(startedAtMs: number, nowMs = Date.now()) {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) {
    return 0;
  }

  return Math.max(0, Math.floor(nowMs - startedAtMs));
}

export function formatRuntimeElapsedRunning(elapsedMs: number) {
  if (!Number.isFinite(elapsedMs)) {
    return '0s';
  }

  return `${Math.max(0, Math.floor(elapsedMs / 1000))}s`;
}

export function formatRuntimeElapsedFinal(elapsedMs: number) {
  if (!Number.isFinite(elapsedMs)) {
    return `${MIN_FINAL_RUNTIME_SECONDS.toFixed(2)}s`;
  }

  const seconds = Math.max(MIN_FINAL_RUNTIME_SECONDS, elapsedMs / 1000);
  return `${seconds.toFixed(2)}s`;
}

export function formatPendingRuntimeStatusLabel(
  status: RuntimeElapsedPendingStatus,
  elapsedMs: number,
) {
  const statusLabel = status === 'stopping' ? 'Stopping' : 'Computing';
  return `${statusLabel} · ${formatRuntimeElapsedRunning(elapsedMs)}`;
}

export function formatReadyRuntimeElapsedLabel(elapsedMs: number) {
  return `Ready · ${formatRuntimeElapsedFinal(elapsedMs)}`;
}
