import { type CSSProperties, type PointerEvent as ReactPointerEvent, useMemo, useRef } from 'react';
import { LocateFixed, Pin, PinOff, X } from 'lucide-react';
import type {
  GraphAnalysisEvidenceV1,
  GraphAnalyzeTabV1,
  GraphFeatureValueV1,
  GraphItemPresentationV2,
  GraphPinnedAnnotationV1,
  GraphViewportV1,
} from '../../lib/graphing';
import { GraphStylePopover } from './GraphAppearanceControls';
import type { GraphWorkspaceSessionStateV5 } from './graph-workspace-session';
import { graphAnalysisAnnotationId, graphFeatureNumber } from './graph-analysis-overlay-support';
function featureText(value: GraphFeatureValueV1 | undefined) {
  if (!value) return '—';
  return value.kind === 'exact' ? value.value.canonicalLatex : `≈ ${Number(value.value.toPrecision(7))}`;
}
function label(feature: string) { return feature.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '); }

export function GraphAnalysisMarkers({
  pinned, preview, viewport,
}: {
  pinned: GraphPinnedAnnotationV1[];
  preview: GraphAnalysisEvidenceV1 | null;
  viewport: GraphViewportV1;
}) {
  const entries = [
    ...pinned.map((entry) => ({ id: entry.annotationId, feature: entry.feature, coordinates: entry.coordinates, preview: false })),
    ...(preview?.coordinates ? [{ id: preview.evidenceId, feature: preview.feature, coordinates: preview.coordinates, preview: true }] : []),
  ];
  return <div className="graph-analysis-markers" aria-hidden="true">
    {entries.map((entry) => {
      const x = graphFeatureNumber(entry.coordinates.x); const y = graphFeatureNumber(entry.coordinates.y);
      if (x === undefined || y === undefined) return null;
      const left = ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * 100;
      const top = (1 - (y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * 100;
      if (left < 0 || left > 100 || top < 0 || top > 100) return null;
      return <span className={`graph-analysis-marker${entry.preview ? ' is-preview' : ''}`}
        key={`${entry.id}:${entry.preview}`} style={{ left: `${left}%`, top: `${top}%` }}>
        <i /> <b>{label(entry.feature)}</b>
      </span>;
    })}
  </div>;
}

export function GraphAnalyzeOverlay({
  activeTab, analysis, colorVisionMode, itemPresentation, message, onClose, onPin,
  onPreview, onRecenter, onTabChange, onUpdatePresentation, onWidthChange,
  pinned, selectedItemLabel, state, theme, width,
}: {
  activeTab: GraphAnalyzeTabV1;
  analysis: GraphAnalysisEvidenceV1[];
  colorVisionMode: GraphWorkspaceSessionStateV5['surface']['appearance']['colorVisionMode'];
  itemPresentation?: GraphItemPresentationV2;
  message: string;
  onClose: () => void;
  onPin: (entry: GraphAnalysisEvidenceV1) => void;
  onPreview: (entry: GraphAnalysisEvidenceV1 | null) => void;
  onRecenter: (entry: GraphAnalysisEvidenceV1) => void;
  onTabChange: (tab: GraphAnalyzeTabV1) => void;
  onUpdatePresentation?: (presentation: GraphItemPresentationV2) => void;
  onWidthChange: (width: number) => void;
  pinned: GraphPinnedAnnotationV1[];
  selectedItemLabel: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  theme: GraphWorkspaceSessionStateV5['surface']['appearance']['theme'];
  width: number;
}) {
  const panelRef = useRef<HTMLElement | null>(null);
  const grouped = useMemo(() => analysis.reduce((map, entry) => {
    const entries = map.get(entry.feature) ?? [];
    entries.push(entry); map.set(entry.feature, entries); return map;
  }, new Map<GraphAnalysisEvidenceV1['feature'], GraphAnalysisEvidenceV1[]>()), [analysis]);
  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const right = panelRef.current?.getBoundingClientRect().right ?? window.innerWidth - 24;
    const move = (next: PointerEvent) => onWidthChange(Math.max(300, Math.min(560, right - next.clientX)));
    const done = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', done); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', done, { once: true });
  };
  return <aside aria-label="Analyze graph" className="graph-analyze-overlay" ref={panelRef}
    style={{ '--graph-analyze-width': `${width}px` } as CSSProperties}>
    <div aria-label="Resize Analyze panel" className="graph-analyze-resize" onPointerDown={resize} role="separator" />
    <header className="graph-analyze-heading">
      <div><strong>Analyze</strong><span>{selectedItemLabel}</span></div>
      <button aria-label="Close Analyze" onClick={onClose} type="button"><X size={17} /></button>
    </header>
    <div className="graph-analyze-tabs" role="tablist" aria-label="Analyze sections">
      {(['features', 'evidence', 'style'] as const).map((tab) => <button aria-selected={activeTab === tab}
        key={tab} onClick={() => onTabChange(tab)} role="tab" type="button">{label(tab)}</button>)}
    </div>
    <p className={`graph-analyze-status is-${state}`} role="status">{message}</p>
    <div className="graph-analyze-content">
      {activeTab === 'features' ? <>
        {analysis.length === 0 && state !== 'loading' ? <p className="graph-analyze-empty">No supported findings for this item and current bounded scope.</p> : null}
        {[...grouped.entries()].map(([feature, entries]) => <section className="graph-feature-group" key={feature}>
          <h3>{label(feature)}</h3>
          {entries.map((entry) => {
            const mayPin = entry.level === 'exact-proved' || entry.level === 'numeric-validated';
            const pinnedNow = pinned.some((candidate) => candidate.annotationId === graphAnalysisAnnotationId(entry));
            return <article className="graph-feature-card" key={entry.evidenceId} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
            }} onFocus={() => onPreview(entry)} onMouseEnter={() => onPreview(entry)} onMouseLeave={() => onPreview(null)} tabIndex={0}>
              <div><strong>{entry.coordinates?.x ? `x ${featureText(entry.coordinates.x)}` : label(entry.feature)}</strong>
                {entry.coordinates?.y ? <span>y {featureText(entry.coordinates.y)}</span> : null}</div>
              <span className={`graph-evidence-badge is-${entry.level}`}>{entry.level.replaceAll('-', ' ')}</span>
              <div className="graph-feature-actions">
                <button disabled={!entry.coordinates} onClick={() => onRecenter(entry)} type="button"><LocateFixed size={14} /> Recenter</button>
                <button disabled={!mayPin || !entry.coordinates} onClick={() => onPin(entry)}
                  title={mayPin ? undefined : 'Only exact or numerically validated findings can be pinned.'} type="button">
                  {pinnedNow ? <PinOff size={14} /> : <Pin size={14} />} {pinnedNow ? 'Unpin' : 'Pin'}
                </button>
              </div>
            </article>;
          })}
        </section>)}
        <section className="graph-analyze-solve"><h3>Solve</h3><p>Complex bounded solving arrives in Move 26.</p></section>
      </> : null}
      {activeTab === 'evidence' ? analysis.map((entry) => <article className="graph-evidence-card" key={entry.evidenceId}>
        <header><strong>{label(entry.feature)}</strong><span>{entry.level.replaceAll('-', ' ')}</span></header>
        <dl><div><dt>Scope</dt><dd>{entry.itemIds.join(', ')}</dd></div>
          <div><dt>Method</dt><dd>{entry.basis.validator ?? entry.basis.source}</dd></div>
          <div><dt>Certainty</dt><dd>{entry.level === 'exact-proved' ? 'Proved in the supported symbolic family.'
            : entry.level === 'numeric-validated' ? 'Validated inside the stated numeric window.'
              : 'Not eligible for a persistent annotation.'}</dd></div>
          {entry.basis.residualBound !== undefined ? <div><dt>Residual</dt><dd>≤ {entry.basis.residualBound}</dd></div> : null}</dl>
      </article>) : null}
      {activeTab === 'style' ? <div className="graph-analyze-style">
        {itemPresentation && onUpdatePresentation ? <GraphStylePopover colorVisionMode={colorVisionMode}
          onClose={onClose} onUpdate={onUpdatePresentation} presentation={itemPresentation} theme={theme} />
          : <p className="graph-analyze-empty">Select a styled graph item to edit its appearance.</p>}
      </div> : null}
    </div>
  </aside>;
}
