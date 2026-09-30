import { useCallback, useEffect, useRef, useState } from 'react';

const PIECEWISE_GRACE_MS = 200;

/**
 * Piecewise items whose edited branches have been invalid for longer than a
 * short grace period: they leave the scene until their branches are valid
 * again, the edit is applied or discarded, or the item is gone. Suppression
 * is per item and never blocks tracing of other curves.
 */
export function usePiecewiseSuppression(itemIds: readonly string[]) {
  const [suppressed, setSuppressed] = useState<ReadonlySet<string>>(new Set());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // Undo, redo or a session reload can remove a suppressed item without passing through removeItem.
  const presentKey = itemIds.join('|');
  const [prunedFor, setPrunedFor] = useState(presentKey);
  if (prunedFor !== presentKey) {
    setPrunedFor(presentKey);
    const present = new Set(itemIds);
    if ([...suppressed].some((itemId) => !present.has(itemId))) {
      setSuppressed(new Set([...suppressed].filter((itemId) => present.has(itemId))));
    }
  }
  useEffect(() => {
    const timers = timersRef.current;
    return () => { timers.forEach((timer) => clearTimeout(timer)); timers.clear(); };
  }, []);

  /** Ends an item's "invalid branches" state: its grace timer and its suppression from the scene. */
  const release = useCallback((itemId: string) => {
    const timer = timersRef.current.get(itemId);
    if (timer) clearTimeout(timer);
    timersRef.current.delete(itemId);
    setSuppressed((currentIds) => {
      if (!currentIds.has(itemId)) return currentIds;
      const next = new Set(currentIds); next.delete(itemId); return next;
    });
  }, []);

  /** Starts the grace period for an item whose branches just became invalid. */
  const suppressAfterGrace = useCallback((itemId: string) => {
    timersRef.current.set(itemId, setTimeout(() => {
      setSuppressed((currentIds) => new Set(currentIds).add(itemId));
      timersRef.current.delete(itemId);
    }, PIECEWISE_GRACE_MS));
  }, []);

  return { suppressed, release, suppressAfterGrace };
}
