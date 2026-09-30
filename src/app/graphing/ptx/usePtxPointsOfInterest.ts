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
  feature: 'root' | 'extremum' | 'intersection' | 'y-intercept' | 'endpoint' | 'hole';
  itemIds: string[];
  x: number;
  y: number;
  level: PtxLevel;
  errorBound: number;
};

const FEATURES = ['root', 'extremum', 'intersection', 'y-intercept'] as const;
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

/**
 * Points of interest for the selected item (Desmos-style dots), computed by the
 * PTX finders in the analysis worker after the view settles.
 */
export function usePtxPointsOfInterest({ session, workspaceContext }: {
  session: GraphWorkspaceSessionStateV7;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}) {
  const [dots, setDots] = useState<PtxDot[]>([]);
  const sessionRef = useRef(session);
  const contextRef = useRef(workspaceContext);
  const sequence = useRef(0);
  useEffect(() => { sessionRef.current = session; contextRef.current = workspaceContext; });
  const selectedItemId = session.surface.selectedItemId;
  useEffect(() => {
    let live = true;
    const timer = window.setTimeout(() => {
      const snapshot = sessionRef.current;
      const context = contextRef.current;
      const items = classifiedGraphItems(snapshot.document).filter((item) => item.visible);
      const selected = items.find((item) => item.itemId === selectedItemId);
      if (!selectedItemId || !selected || (selected.kind !== 'relation' && selected.kind !== 'piecewise')) { if (live) setDots([]); return; }
      const plane = selected.kind === 'relation' && selected.relation.kind === 'complex-locus' ? 'complex' : 'real';
      const request = {
        version: 1 as const,
        requestId: `${context.workspaceInstanceId}.ptx-points.${++sequence.current}`,
        workspaceInstanceId: context.workspaceInstanceId,
        documentId: snapshot.document.documentId,
        revisions: { mathematics: snapshot.document.mathematicsRevision, viewport: snapshot.surface.viewportRevision, parameter: snapshot.surface.parameterRevision },
        items,
        parameterEnvironment: graphParameterEnvironment(snapshot.document),
        assumptions: snapshot.document.assumptions,
        features: [...FEATURES],
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
        setDots(ptxDotsFromEvidence(envelope.payload.evidence, selectedItemId, plane));
      }).catch(() => { if (live) setDots([]); });
    }, 260);
    return () => { live = false; window.clearTimeout(timer); pointsHost.cancelActive('Points of interest input changed.'); };
  }, [selectedItemId, session.document.mathematicsRevision, session.surface.parameterRevision,
    session.surface.viewportRevision, workspaceContext.workspaceInstanceId]);
  return selectedItemId ? dots : [];
}
