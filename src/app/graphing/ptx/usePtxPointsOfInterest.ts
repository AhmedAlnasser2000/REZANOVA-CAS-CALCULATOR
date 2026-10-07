import { useEffect, useRef, useState } from 'react';
import {
  buildGraphAnalyzeInputRevisionId,
  GraphAnalysisApplicationHost,
  graphExactMathJsonNumber,
  runGraphAnalyzeWithOoe,
  type GraphAnalysisEvidenceV1,
  type GraphFeatureValueV1,
  type PtxLevel,
} from '../../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../../types/calculator/workspace-instance-types';
import { classifiedGraphItems, graphParameterEnvironment } from '../graph-controller-support';
import type { GraphWorkspaceSessionStateV7 } from '../graph-workspace-session';
import { ptxStretchesFromEvidence, type PtxStretch } from './ptx-stretch-layer';

const NO_STRETCHES: PtxStretch[] = [];

/** A point of interest drawn as a dot: a root, extremum, intersection or y-intercept of the selected item. */
export type PtxDot = {
  key: string;
  plane: 'real' | 'complex';
  /** `endpoint` and `hole` are a piecewise branch's filled and open end circles (from the scene, not Analyze). */
  feature: 'root' | 'extremum' | 'intersection' | 'y-intercept' | 'x-intercept' | 'endpoint' | 'hole' | 'complex-zero' | 'complex-pole'
    | 'turning-point' | 'curve-endpoint' | 'origin-crossing' | 'region-corner'
    /** A curve that is a single point (x² + y² = 0), from the scene. */
    | 'isolated-point';
  /** Which way a turning point faces, which end, whether an end or corner belongs to the curve, and the parameter there. */
  detail?: GraphAnalysisEvidenceV1['detail'];
  itemIds: string[];
  x: number;
  y: number;
  level: PtxLevel;
  errorBound: number;
};

const FEATURES = ['root', 'x-intercept', 'extremum', 'intersection', 'y-intercept', 'complex-zero', 'complex-pole',
  'turning-point', 'curve-endpoint', 'origin-crossing', 'region-corner'] as const;
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
const DOT_LEVELS = new Set<GraphAnalysisEvidenceV1['level']>(['exact-proved', 'interval-proved', 'numeric-validated', 'sampled-estimate']);
// Its own worker, so dots never cancel (or wait behind) the Analyze panel.
const pointsHost = new GraphAnalysisApplicationHost();

function numberOf(value: GraphFeatureValueV1 | undefined) {
  if (!value) return null;
  if (value.kind === 'approximate') return { value: value.value, errorBound: value.errorBound ?? 0 };
  const exact = graphExactMathJsonNumber(value.value.mathJson);
  return exact === undefined ? null : { value: exact, errorBound: 0 };
}

/** Evidence to dots: only the selected item's findings with both coordinates and a usable level. */
export function ptxDotsFromEvidence(evidence: readonly GraphAnalysisEvidenceV1[], selectedItemId: string, plane: 'real' | 'complex'): PtxDot[] {
  const dots: PtxDot[] = [];
  for (const entry of evidence) {
    if (!entry.itemIds.includes(selectedItemId) || !DOT_LEVELS.has(entry.level)) continue;
    if (!(FEATURES as readonly string[]).includes(entry.feature)) continue;
    const x = numberOf(entry.coordinates?.x); const y = numberOf(entry.coordinates?.y);
    if (!x || !y) continue;
    // One dot per place: a root of y = f(x) is also its x-intercept, and the first name found is kept.
    const tolerance = 1e-9 * Math.max(1, Math.abs(x.value), Math.abs(y.value));
    if (dots.some((dot) => Math.abs(dot.x - x.value) <= tolerance && Math.abs(dot.y - y.value) <= tolerance)) continue;
    dots.push({
      key: entry.evidenceId, plane, feature: entry.feature as PtxDot['feature'], itemIds: entry.itemIds,
      x: x.value, y: y.value, level: entry.level as PtxLevel, errorBound: Math.max(x.errorBound, y.errorBound),
      ...(entry.detail ? { detail: entry.detail } : {}),
    });
  }
  return dots;
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
  const [stretches, setStretches] = useState<PtxStretch[]>([]);
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
      // The selected item first, so its points are found even when the view holds many heavy curves.
      const items = classifiedGraphItems(snapshot.document).filter((item) => item.visible)
        .sort((a, b) => Number(b.itemId === selectedItemId) - Number(a.itemId === selectedItemId));
      const selected = items.find((item) => item.itemId === selectedItemId);
      const showing = new Set(snapshot.document.items.flatMap((item) => {
        const mode = modeOf(item);
        return mode === 'always' || (mode === 'auto' && item.itemId === selectedItemId) ? [item.itemId] : [];
      }));
      const selectable = selected && (selected.kind === 'relation' || selected.kind === 'piecewise');
      if (!selectable && showing.size === 0) { if (live) { setDots([]); setStretches([]); setAsymptotes([]); } return; }
      const plane = selected?.kind === 'relation' && (selected.relation.kind === 'complex-locus' || selected.relation.kind === 'complex-mapping'
        || selected.relation.kind === 'complex-roots') ? 'complex' : 'real';
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
        // Only the selected item's points and the items whose asymptotes show: every other curve only meets them.
        focusItemIds: [...new Set([...(selectable && selectedItemId ? [selectedItemId] : []), ...showing])],
        numericWindow: snapshot.surface.viewport,
        // Each item gets a fair share inside the analysis; more items get more time in all.
        maximumTimeMs: Math.min(1500, 300 + 150 * items.length),
      };
      void runGraphAnalyzeWithOoe(request, {
        activeInputRevisionId: buildGraphAnalyzeInputRevisionId(request),
        workspaceInstance: context,
        isWorkspaceInstanceOpen: () => true,
        host: pointsHost,
      }).then((envelope) => {
        if (!live || envelope.ooe.commitAssessment.commitDecision !== 'committed') return;
        setDots(selectable && selectedItemId ? ptxDotsFromEvidence(envelope.payload.evidence, selectedItemId, plane) : []);
        setStretches(selectable && plane === 'real' ? ptxStretchesFromEvidence(envelope.payload.evidence, selectedItemId) : []);
        setAsymptotes(ptxAsymptotesFromEvidence(envelope.payload.evidence, showing));
      }).catch(() => { if (live) { setDots([]); setStretches([]); setAsymptotes([]); } });
    }, 260);
    return () => { live = false; window.clearTimeout(timer); pointsHost.cancelActive('Points of interest input changed.'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- showingKey carries the presentation modes.
  }, [selectedItemId, session.document.mathematicsRevision, session.surface.parameterRevision,
    session.surface.viewportRevision, showingKey, workspaceContext.workspaceInstanceId]);
  return { dots: selectedItemId ? dots : [], stretches: selectedItemId ? stretches : NO_STRETCHES, asymptotes };
}
