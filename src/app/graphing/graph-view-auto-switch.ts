import { useCallback, useEffect, useRef, useState } from 'react';
import type { GraphDocumentV4 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

const NOTICE_MS = 6_000;

export type GraphViewAutoSwitch = {
  from: 'real' | 'complex';
  to: 'real' | 'complex';
  reason: 'complex-mapping-added' | 'complex-mapping-removed';
};

function complexMappingIds(document: GraphDocumentV4) {
  return new Set(document.items.flatMap((item) => (
    item.kind === 'relation' && item.relation.kind === 'complex-mapping' ? [item.itemId] : [])));
}

/**
 * The view follows complex mappings (z-expressions) only: a newly authored
 * mapping opens the Complex pane from Real, and removing the last mapping
 * returns to Real only when Complex was opened automatically. Trajectories
 * f(t) draw in the Real pane and never switch. A user's explicit mode choice
 * is never overridden for a mapping that already existed.
 */
export function graphViewAutoSwitch({ previous, next, mode, autoSwitched }: {
  previous: GraphDocumentV4;
  next: GraphDocumentV4;
  mode: 'real' | 'complex' | 'both';
  autoSwitched: boolean;
}): GraphViewAutoSwitch | null {
  const before = complexMappingIds(previous);
  const after = complexMappingIds(next);
  if (mode === 'real' && [...after].some((itemId) => !before.has(itemId))) {
    return { from: 'real', to: 'complex', reason: 'complex-mapping-added' };
  }
  if (mode === 'complex' && autoSwitched && before.size > 0 && after.size === 0) {
    return { from: 'complex', to: 'real', reason: 'complex-mapping-removed' };
  }
  return null;
}

function viewPolicyFor(mode: 'real' | 'complex'): GraphWorkspaceSessionStateV7['surface']['viewPolicy'] {
  return mode === 'real' ? { mode: 'real' } : { mode: 'complex', interpretation: 'complex-mapping' };
}

/**
 * Session-local auto-switch state. Whether Complex was opened automatically
 * is not persisted: after a reload the user's mode stands as chosen.
 */
export function useGraphViewAutoSwitch() {
  const autoSwitchedRef = useRef(false);
  const [notice, setNotice] = useState<GraphViewAutoSwitch | null>(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  /** Applies the switch rule to a document change about to be committed. */
  const applyAutoView = useCallback((current: GraphWorkspaceSessionStateV7, next: GraphWorkspaceSessionStateV7) => {
    const change = graphViewAutoSwitch({ previous: current.document, next: next.document,
      mode: next.surface.viewPolicy.mode, autoSwitched: autoSwitchedRef.current });
    if (!change) return next;
    autoSwitchedRef.current = change.to === 'complex';
    setNotice(change);
    return { ...next, surface: { ...next.surface, viewPolicy: viewPolicyFor(change.to) } };
  }, []);
  /** An explicit user choice ends automatic switching for the current mappings. */
  const markManualView = useCallback(() => { autoSwitchedRef.current = false; setNotice(null); }, []);
  const dismissAutoView = useCallback(() => setNotice(null), []);
  return { applyAutoView, autoViewNotice: notice, dismissAutoView, markManualView };
}
