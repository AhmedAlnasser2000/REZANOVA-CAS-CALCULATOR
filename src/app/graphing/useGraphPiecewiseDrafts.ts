import { useCallback, type RefObject } from 'react';
import type { GraphDocumentV4, GraphItemSpecV1 } from '../../lib/graphing';
import {
  buildGraphPiecewiseItemFromAuthoringDraft,
  graphPiecewiseDraftFromItem,
  replaceGraphDocumentItem,
} from './graph-document';
import type { GraphPiecewiseAuthoringDraftV1, GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

// The piecewise branch editor's drafts (GRAPHING-PIECEWISE2): a new piecewise
// item is drawn as soon as its draft is complete; an existing item's draft is
// applied with Apply (or Enter), and invalid branches hide the item after a
// short grace rather than drawing something half typed.

/** The draft field key of the otherwise row. */
export const GRAPH_PIECEWISE_DRAFT_OTHERWISE = 'otherwise';

export type GraphPiecewiseDraftAction =
  | { action: 'add' }
  | { action: 'otherwise-on' }
  | { action: 'otherwise-off' }
  | { action: 'remove'; branchId: string }
  | { action: 'up'; branchId: string }
  | { action: 'down'; branchId: string }
  | { action: 'duplicate'; branchId: string }
  | { action: 'move'; branchId: string; toIndex: number };

type PiecewiseItem = Extract<GraphItemSpecV1, { kind: 'piecewise' }>;

interface UseGraphPiecewiseDraftsInput {
  activeInputRevisionRef: RefObject<string | null>;
  activeSamplingItemIdRef: RefObject<string | null>;
  blankItemId: string;
  commitSession: (next: GraphWorkspaceSessionStateV7, immediate?: boolean) => void;
  nextItemId: () => string;
  pushHistory: (document: GraphDocumentV4, typingItemId: string | null) => void;
  releasePiecewiseSuppression: (itemId: string) => void;
  sessionRef: RefObject<GraphWorkspaceSessionStateV7>;
  setBlankItemId: (itemId: string) => void;
  suppressPiecewiseAfterGrace: (itemId: string) => void;
}

const freshBranchId = (itemId: string, index: number) => `${itemId}.branch.${index + 1}.${Date.now().toString(36)}`;

function previousItem(document: GraphDocumentV4, itemId: string) {
  return document.items.find((candidate): candidate is PiecewiseItem => candidate.itemId === itemId && candidate.kind === 'piecewise');
}

function buildFromDraft(document: GraphDocumentV4, draft: GraphPiecewiseAuthoringDraftV1, sourceRevision?: number) {
  const previous = previousItem(document, draft.itemId);
  return buildGraphPiecewiseItemFromAuthoringDraft({
    itemId: draft.itemId,
    sourceRevision: sourceRevision ?? (previous?.source.sourceRevision ?? 0) + 1,
    index: Math.max(0, document.items.findIndex((item) => item.itemId === draft.itemId)),
    target: draft.target,
    branches: draft.branches,
    ...(draft.otherwiseLatex !== undefined ? { otherwiseLatex: draft.otherwiseLatex } : {}),
    ...(previous ? { previous } : {}),
  });
}

/** A draft after one structural edit, or null when the edit does not apply. */
export function mutatedGraphPiecewiseDraft(draft: GraphPiecewiseAuthoringDraftV1, edit: GraphPiecewiseDraftAction): GraphPiecewiseAuthoringDraftV1 | null {
  const branches = [...draft.branches];
  if (edit.action === 'add') {
    branches.push({ branchId: freshBranchId(draft.itemId, branches.length), valueLatex: '', conditionLatex: '' });
    return { ...draft, branches };
  }
  if (edit.action === 'otherwise-on') return draft.otherwiseLatex !== undefined ? null : { ...draft, otherwiseLatex: '' };
  if (edit.action === 'otherwise-off') {
    if (draft.otherwiseLatex === undefined) return null;
    const { otherwiseLatex: _otherwise, ...rest } = draft;
    void _otherwise;
    return rest;
  }
  const index = branches.findIndex((branch) => branch.branchId === edit.branchId);
  if (index < 0) return null;
  if (edit.action === 'remove') {
    if (branches.length <= 1) return null;
    branches.splice(index, 1);
  } else if (edit.action === 'duplicate') {
    branches.splice(index + 1, 0, { ...branches[index]!, branchId: freshBranchId(draft.itemId, branches.length) });
  } else {
    const toIndex = edit.action === 'up' ? index - 1 : edit.action === 'down' ? index + 1 : edit.toIndex;
    if (toIndex < 0 || toIndex >= branches.length || toIndex === index) return null;
    const [moved] = branches.splice(index, 1);
    branches.splice(toIndex, 0, moved!);
  }
  return { ...draft, branches };
}

export function useGraphPiecewiseDrafts({
  activeInputRevisionRef,
  activeSamplingItemIdRef,
  blankItemId,
  commitSession,
  nextItemId,
  pushHistory,
  releasePiecewiseSuppression,
  sessionRef,
  setBlankItemId,
  suppressPiecewiseAfterGrace,
}: UseGraphPiecewiseDraftsInput) {
  const replaceDraft = useCallback((itemId: string, next: GraphPiecewiseAuthoringDraftV1 | null, immediate = false) => {
    const current = sessionRef.current;
    const drafts = current.authoring?.piecewiseDrafts ?? [];
    commitSession({ ...current, authoring: { piecewiseDrafts: next
      ? drafts.map((candidate) => candidate.itemId === itemId ? next : candidate)
      : drafts.filter((candidate) => candidate.itemId !== itemId) } }, immediate);
  }, [commitSession, sessionRef]);

  /** A new draft row; a create draft is promoted to an item as soon as it is complete. */
  const settleDraft = useCallback((draft: GraphPiecewiseAuthoringDraftV1) => {
    const current = sessionRef.current;
    const built = buildFromDraft(current.document, draft, draft.mode === 'create' ? 1 : undefined);
    if (built && draft.mode === 'create') {
      pushHistory(current.document, null);
      activeInputRevisionRef.current = null;
      commitSession({
        ...current,
        document: replaceGraphDocumentItem(current.document, built),
        authoring: { piecewiseDrafts: (current.authoring?.piecewiseDrafts ?? []).filter((candidate) => candidate.itemId !== draft.itemId) },
      }, true);
      return true;
    }
    // Branches that are valid again bring the item back at once; invalid ones hide it after a short grace.
    releasePiecewiseSuppression(draft.itemId);
    if (!built && draft.mode === 'replace') suppressPiecewiseAfterGrace(draft.itemId);
    replaceDraft(draft.itemId, draft);
    return false;
  }, [activeInputRevisionRef, commitSession, pushHistory, releasePiecewiseSuppression, replaceDraft, sessionRef, suppressPiecewiseAfterGrace]);

  const createPiecewiseDraft = useCallback(() => {
    const current = sessionRef.current;
    const itemId = blankItemId;
    const draft: GraphPiecewiseAuthoringDraftV1 = {
      version: 1,
      draftId: `${itemId}.piecewise-draft`,
      itemId,
      mode: 'create',
      target: 'y',
      branches: [1, 2].map((number) => ({ branchId: `${itemId}.branch.${number}`, valueLatex: '', conditionLatex: '' })),
    };
    commitSession({
      ...current,
      authoring: { piecewiseDrafts: [...(current.authoring?.piecewiseDrafts ?? []), draft] },
    }, true);
    setBlankItemId(nextItemId());
    return itemId;
  }, [blankItemId, commitSession, nextItemId, sessionRef, setBlankItemId]);

  const beginPiecewiseDraft = useCallback((itemId: string) => {
    const current = sessionRef.current;
    const existing = current.authoring?.piecewiseDrafts.find((draft) => draft.itemId === itemId);
    if (existing) return existing.itemId;
    const item = previousItem(current.document, itemId);
    if (!item) return null;
    commitSession({
      ...current,
      authoring: { piecewiseDrafts: [...(current.authoring?.piecewiseDrafts ?? []), graphPiecewiseDraftFromItem(item)] },
    }, true);
    return itemId;
  }, [commitSession, sessionRef]);

  const updatePiecewiseDraft = useCallback((input: {
    itemId: string;
    branchId: string;
    field: 'valueLatex' | 'conditionLatex';
    value: string;
  }) => {
    const draft = sessionRef.current.authoring?.piecewiseDrafts.find((candidate) => candidate.itemId === input.itemId);
    if (!draft) return false;
    return settleDraft(input.branchId === GRAPH_PIECEWISE_DRAFT_OTHERWISE
      ? { ...draft, otherwiseLatex: input.value }
      : { ...draft, branches: draft.branches.map((branch) => branch.branchId === input.branchId
        ? { ...branch, [input.field]: input.value }
        : branch) });
  }, [sessionRef, settleDraft]);

  const commitPiecewiseDraft = useCallback((itemId: string) => {
    activeSamplingItemIdRef.current = itemId;
    const current = sessionRef.current;
    const drafts = current.authoring?.piecewiseDrafts ?? [];
    const draft = drafts.find((candidate) => candidate.itemId === itemId);
    if (!draft) return false;
    const previous = previousItem(current.document, itemId);
    const promoted = buildFromDraft(current.document, draft);
    if (!promoted) return false;
    if (previous) pushHistory(current.document, null);
    activeInputRevisionRef.current = null;
    releasePiecewiseSuppression(itemId);
    commitSession({
      ...current,
      document: replaceGraphDocumentItem(current.document, promoted),
      authoring: { piecewiseDrafts: drafts.filter((candidate) => candidate.itemId !== itemId) },
    }, true);
    return true;
  }, [activeInputRevisionRef, activeSamplingItemIdRef, commitSession, pushHistory, releasePiecewiseSuppression, sessionRef]);

  const removePiecewiseDraft = useCallback((itemId: string) => {
    replaceDraft(itemId, null, true);
    releasePiecewiseSuppression(itemId);
  }, [releasePiecewiseSuppression, replaceDraft]);

  const mutatePiecewiseDraft = useCallback((input: { itemId: string } & GraphPiecewiseDraftAction) => {
    const draft = sessionRef.current.authoring?.piecewiseDrafts.find((candidate) => candidate.itemId === input.itemId);
    const next = draft ? mutatedGraphPiecewiseDraft(draft, input) : null;
    if (next) settleDraft(next);
  }, [sessionRef, settleDraft]);

  return {
    beginPiecewiseDraft,
    commitPiecewiseDraft,
    createPiecewiseDraft,
    mutatePiecewiseDraft,
    removePiecewiseDraft,
    updatePiecewiseDraft,
  };
}
