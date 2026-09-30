import { useEffect, useRef, useState } from 'react';
import {
  buildGraphAnalyzeInputRevisionId,
  GraphAnalysisApplicationHost,
  runGraphAnalyzeWithOoe,
  type GraphAnalysisEvidenceV1,
  type GraphFeatureValueV1,
  type PtxLevel,
} from '../../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator/workspace-instance-types';
import { classifiedGraphItems, graphParameterEnvironment } from '../graph-controller-support';
import type { GraphWorkspaceSessionStateV7 } from '../graph-workspace-session';

/** A point of interest drawn as a dot: a root, extremum, intersection or y-intercept of the selected item. */
export type PtxDot = {
  key: string;
  plane: 'real' | 'complex';
  /** `endpoint` and `hole` are a piecewise branch's filled and open end circles (from the scene, not Analyze). */
  feature: 'root' | 'extremum' | 'intersection' | 'y-intercept' | 'endpoint' | 'hole' | 'complex-zero' | 'complex-pole';
  itemIds: string[];
  x: number;
  y: number;
  level: PtxLevel;
  errorBound: number;
};

const FEATURES = ['root', 'extremum', 'intersection', 'y-intercept', 'complex-zero', 'complex-pole'] as const;
const LINE_FEATURES = ['vertical-asymptote', 'horizontal-asymptote', 'oblique-asymptote'] as const;

/** An asymptote line of a curve: x = a, y = b, or y = slope·x + intercept. */
export type PtxAsymptoteLine = {
  key: string;
  itemId: string;
  kind: 'vertical' | 'horizontal' | 'oblique';
  /** x for vertical lines, y for horizontal ones, the intercept for oblique ones. */
  value: number;
  slope: number;
  level: PtxLevel;
};

export type GraphAsymptoteMode = 'auto' | 'always' | 'off';
const DOT_LEVELS = new Set<GraphAnalysisEvidenceV1['level']>(['exact-proved', 'numeric-validated', 'sampled-estimate']);
// Its own worker, so dots never cancel (or wait behind) the Analyze panel.
const pointsHost = new GraphAnalysisApplicationHost();

function numberOf(value: GraphFeatureValueV1 | undefined) {
  if (!value) return null;
  if (value.kind === 'approximate') return { value: value.value, errorBound: value.errorBound ?? 0 };
  return typeof value.value.mathJson === 'number' ? { value: value.value.mathJson, errorBound: 0 } : null;
}

/** Evidence to dots: only the selected item's findings with both coordinates and a usable level. */
export function ptxDotsFromEvidence(evidence: readonly GraphAnalysisEvidenceV1[], selectedItemId: string, plane: 'real' | 'complex'): PtxDot[] {
  return evidence.flatMap((entry): PtxDot[] => {
    if (!entry.itemIds.includes(selectedItemId) || !DOT_LEVELS.has(entry.level)) return [];
    if (!(FEATURES as readonly string[]).includes(entry.feature)) return [];
    const x = numberOf(entry.coordinates?.x); const y = numberOf(entry.coordinates?.y);
    if (!x || !y) return [];
    return [{
      key: entry.evidenceId, plane, feature: entry.feature as PtxDot['feature'], itemIds: entry.itemIds,
      x: x.value, y: y.value, level: entry.level as PtxLevel, errorBound: Math.max(x.errorBound, y.errorBound),
    }];
  });
}

/** Evidence to asymptote lines, for the items whose lines are showing. */
export function ptxAsymptotesFromEvidence(evidence: readonly GraphAnalysisEvidenceV1[], showing: ReadonlySet<string>): PtxAsymptoteLine[] {
  return evidence.flatMap((entry): PtxAsymptoteLine[] => {
    const itemId = entry.itemIds[0];
    if (!itemId || !showing.has(itemId) || !DOT_LEVELS.has(entry.level)) return [];
    const level = entry.level as PtxLevel;
    if (entry.feature === 'vertical-asymptote') {
      const x = numberOf(entry.coordinates?.x); return x ? [{ key: entry.evidenceId, itemId, kind: 'vertical', value: x.value, slope: 0, level }] : [];
    }
    if (entry.feature === 'horizontal-asymptote') {
      const y = numberOf(entry.coordinates?.y); return y ? [{ key: entry.evidenceId, itemId, kind: 'horizontal', value: y.value, slope: 0, level }] : [];
    }
    if (entry.feature === 'oblique-asymptote') {
      const intercept = numberOf(entry.coordinates?.y); const slope = numberOf(entry.relationValue);
      return intercept && slope ? [{ key: entry.evidenceId, itemId, kind: 'oblique', value: intercept.value, slope: slope.value, level }] : [];
    }
    return [];
  });
}

/**
 * Points of interest for the selected item (Desmos-style dots) and asymptote
 * lines (the selected item's unless its mode is Off, plus every item set to
 * Always), computed by the PTX finders in the analysis worker after the view settles.
 */
export function usePtxPointsOfInterest({ session, workspaceContext }: {
  session: GraphWorkspaceSessionStateV7;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}) {
  const [dots, setDots] = useState<PtxDot[]>([]);
  const [asymptotes, setAsymptotes] = useState<PtxAsymptoteLine[]>([]);
  const sessionRef = useRef(session);
  const contextRef = useRef(workspaceContext);
  const sequence = useRef(0);
  useEffect(() => { sessionRef.current = session; contextRef.current = workspaceContext; });
  const selectedItemId = session.surface.selectedItemId;
  const modeOf = (item: (typeof session.document.items)[number]): GraphAsymptoteMode => (
    'presentation' in item && item.presentation.version === 2 ? item.presentation.asymptotes ?? 'auto' : 'auto');
  // Which items show lines depends on presentation, which does not bump the mathematics revision.
  const showingKey = session.document.items.filter((item) => item.kind === 'relation' || item.kind === 'piecewise')
    .map((item) => `${item.itemId}:${modeOf(item)}`).join('|');
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      const snapshot = sessionRef.current;
      const context = contextRef.current;
      const items = classifiedGraphItems(snapshot.document).filter((item) => item.visible);
      const selected = items.find((item) => item.itemId === selectedItemId);
      const showing = new Set(snapshot.document.items.flatMap((item) => {
        const mode = modeOf(item);
        return mode === 'always' || (mode === 'auto' && item.itemId === selectedItemId) ? [item.itemId] : [];
      }));
      const selectable = selected && (selected.kind === 'relation' || selected.kind === 'piecewise');
      if (!selectable && showing.size === 0) { if (live) { setDots([]); setAsymptotes([]); } return; }
      const plane = selected?.kind === 'relation' && (selected.relation.kind === 'complex-locus' || selected.relation.kind === 'complex-mapping') ? 'complex' : 'real';
      const request = {
        version: 1 as const,
        requestId: `${context.workspaceInstanceId}.ptx-points.${++sequence.current}`,
        workspaceInstanceId: context.workspaceInstanceId,
        documentId: snapshot.document.documentId,
        revisions: { mathematics: snapshot.document.mathematicsRevision, viewport: snapshot.surface.viewportRevision, parameter: snapshot.surface.parameterRevision },
        items,
        parameterEnvironment: graphParameterEnvironment(snapshot.document),
        assumptions: snapshot.document.assumptions,
        features: [...FEATURES, ...LINE_FEATURES],
        numericWindow: snapshot.surface.viewport,
        maximumTimeMs: 400,
      };
      void runGraphAnalyzeWithOoe(request, {
        activeInputRevisionId: buildGraphAnalyzeInputRevisionId(request),
        workspaceInstance: context,
        isWorkspaceInstanceOpen: () => true,
        host: pointsHost,
      }).then((envelope) => {
        if (!live || envelope.ooe.commitAssessment.commitDecision !== 'committed') return;
        setDots(selectable && selectedItemId ? ptxDotsFromEvidence(envelope.payload.evidence, selectedItemId, plane) : []);
        setAsymptotes(ptxAsymptotesFromEvidence(envelope.payload.evidence, showing));
      }).catch(() => { if (live) { setDots([]); setAsymptotes([]); } });
    }, 260);
    return () => { live = false; window.clearTimeout(timer); pointsHost.cancelActive('Points of interest input changed.'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- showingKey carries the presentation modes.
  }, [selectedItemId, session.document.mathematicsRevision, session.surface.parameterRevision,
    session.surface.viewportRevision, showingKey, workspaceContext.workspaceInstanceId]);
  return { dots: selectedItemId ? dots : [], asymptotes };
}
