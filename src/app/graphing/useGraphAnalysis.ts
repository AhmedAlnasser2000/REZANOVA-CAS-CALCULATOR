import { useEffect, useRef, useState } from 'react';
import {
  buildGraphAnalyzeInputRevisionId,
  graphAnalysisApplicationHost,
  runGraphAnalyzeWithOoe,
  type GraphAnalysisResultV1,
} from '../../lib/graphing';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { classifiedGraphItems, graphParameterEnvironment } from './graph-controller-support';
import type { GraphWorkspaceSessionStateV7 } from './graph-workspace-session';

const ALL_FEATURES = [
  'root', 'x-intercept', 'y-intercept', 'extremum', 'intersection', 'hole', 'pole',
  'vertical-asymptote', 'horizontal-asymptote', 'oblique-asymptote',
  'domain-boundary', 'piecewise-continuity', 'level-contour', 'stationary-point', 'local-extremum',
  'complex-zero', 'complex-pole', 'branch-point',
] as const;

export function useGraphAnalysis(input: {
  session: GraphWorkspaceSessionStateV7;
  workspaceContext: WorkspaceInstanceRuntimeContext;
}) {
  const { session, workspaceContext } = input;
  const sessionRef = useRef(session);
  const workspaceContextRef = useRef(workspaceContext);
  const requestSequence = useRef(0);
  const [result, setResult] = useState<GraphAnalysisResultV1 | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [message, setMessage] = useState('Open Analyze to inspect the selected graph item.');
  useEffect(() => {
    sessionRef.current = session;
    workspaceContextRef.current = workspaceContext;
  });

  useEffect(() => {
    if (!session.surface.analyzeOpen) return undefined;
    const timer = window.setTimeout(() => {
      const snapshot = sessionRef.current;
      const activeWorkspaceContext = workspaceContextRef.current;
      const selectedId = snapshot.surface.selectedItemId;
      const items = classifiedGraphItems(snapshot.document).filter((item) => item.visible);
      if (!selectedId || !items.some((item) => item.itemId === selectedId)) {
        setResult(null); setState('ready'); setMessage('Select a visible relation to analyze.'); return;
      }
      const request = {
        version: 1 as const,
        requestId: `${activeWorkspaceContext.workspaceInstanceId}.analysis.${++requestSequence.current}`,
        workspaceInstanceId: activeWorkspaceContext.workspaceInstanceId,
        documentId: snapshot.document.documentId,
        revisions: {
          mathematics: snapshot.document.mathematicsRevision,
          viewport: snapshot.surface.viewportRevision,
          parameter: snapshot.surface.parameterRevision,
        },
        items,
        parameterEnvironment: graphParameterEnvironment(snapshot.document),
        assumptions: snapshot.document.assumptions,
        complexSearchRegion: snapshot.surface.complex.searchRegion ?? {
          reMin: snapshot.surface.viewport.xMin, reMax: snapshot.surface.viewport.xMax,
          imMin: snapshot.surface.viewport.yMin, imMax: snapshot.surface.viewport.yMax,
        },
        features: [...ALL_FEATURES],
        numericWindow: snapshot.surface.viewport,
        maximumTimeMs: 600,
      };
      const activeInputRevisionId = buildGraphAnalyzeInputRevisionId(request);
      setState('loading'); setMessage('Analyzing selected graph item…');
      void runGraphAnalyzeWithOoe(request, {
        activeInputRevisionId,
        workspaceInstance: activeWorkspaceContext,
        isWorkspaceInstanceOpen: () => true,
      }).then((envelope) => {
        if (request.requestId !== `${activeWorkspaceContext.workspaceInstanceId}.analysis.${requestSequence.current}`) return;
        if (envelope.ooe.commitAssessment.commitDecision !== 'committed') return;
        setResult(envelope.payload); setState('ready');
        setMessage(envelope.payload.evidence.length
          ? `${envelope.payload.evidence.length} finding(s) with explicit evidence.`
          : 'No supported features were found in this scope.');
      }).catch((error: unknown) => {
        setResult(null); setState('error');
        setMessage(error instanceof Error ? error.message : 'Graph analysis failed.');
      });
    }, 240);
    return () => { window.clearTimeout(timer); graphAnalysisApplicationHost.cancelActive('Graph analysis input changed.'); };
  }, [session.document.mathematicsRevision, session.surface.analyzeOpen,
    session.surface.parameterRevision, session.surface.selectedItemId,
    workspaceContext.workspaceInstanceId]);

  return { message, result, state: session.surface.analyzeOpen ? state : 'idle' as const };
}
