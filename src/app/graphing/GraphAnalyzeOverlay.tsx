import { type CSSProperties, type FormEvent, type PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from 'react';
import { LocateFixed, Pin, PinOff, X } from 'lucide-react';
import type {
  GraphAnalysisEvidenceV1,
  GraphAuthoredAssumptionV1,
  GraphAnalyzeTabV1,
  GraphFeatureValueV1,
  GraphPinnedAnnotationV2,
  GraphViewportV1,
} from '../../lib/graphing';
import { graphAnalysisAnnotationId, graphFeatureNumber } from './graph-analysis-overlay-support';
import { asymptoteLabelNumber } from './ptx/ptx-asymptote-layer';
import { graphIntervalWords } from './graph-piecewise-coverage';
/** Exact values as read: \frac{1}{2} → 1/2, \sqrt{13} → √13 (roots first, so \frac{\sqrt{13}}{2} → √13/2). */
function latexText(latex: string) {
  return latex.replace(/\\sqrt\{([^{}]*)\}/gu, '√$1').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/gu, '$1/$2')
    .replace(/\\(?:left|right)/gu, '');
}
function featureText(value: GraphFeatureValueV1 | undefined) {
  if (!value) return '—';
  return value.kind === 'exact' ? latexText(value.value.canonicalLatex) : `≈ ${Number(value.value.toPrecision(7))}`;
}
const short = (value: number) => String(Number(value.toPrecision(6))).replace('-', '−');
/** A stretch card: "Zero for x ≤ −2" (the curve lies on the axis) or "Same curve for x ≥ 0" (two curves coincide). */
function stretchText(entry: GraphAnalysisEvidenceV1) {
  const interval = entry.detail?.interval;
  if (entry.detail?.shared && !interval) return 'Same curve';
  return interval ? `${entry.feature === 'root' ? 'Zero' : 'Same curve'} for ${graphIntervalWords(interval)}` : null;
}
/** A piecewise boundary card: "Jump of 1 at x = 0" with "left 0 · right 1" beneath. */
function boundaryText(entry: GraphAnalysisEvidenceV1) {
  const boundary = entry.detail?.boundary; const x = graphFeatureNumber(entry.coordinates?.x);
  if (!boundary || x === undefined) return null;
  const at = `at x = ${short(x)}`;
  const title = boundary.kind === 'jump' && boundary.jump !== undefined ? `Jump of ${short(boundary.jump)} ${at}`
    : boundary.kind === 'removable' ? `Hole ${at}` : boundary.kind === 'vertical-asymptote' ? `Vertical asymptote ${at}`
      : boundary.kind === 'one-sided' ? `One-sided ${at}` : `Continuous ${at}`;
  const sides = [boundary.left !== undefined ? `left ${short(boundary.left)}` : null, boundary.right !== undefined ? `right ${short(boundary.right)}` : null,
    boundary.value !== undefined ? `value ${short(boundary.value)}` : null].filter(Boolean).join(' · ');
  return { title, sides };
}
function label(feature: string) { return feature.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '); }

export function GraphAnalysisMarkers({
  pinned, preview, viewport,
}: {
  pinned: GraphPinnedAnnotationV2[];
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

/** An asymptote card reads as its line: x = 1, y = 2, or y = mx + b (slope in the relation value). */
function asymptoteEquation(entry: GraphAnalysisEvidenceV1) {
  const number = (value: GraphFeatureValueV1 | undefined) => (value ? graphFeatureNumber(value) : undefined);
  const text = (value: number) => String(Number(value.toPrecision(6))).replace('-', '−');
  // Same wording as the lines on the graph: tan x reads x = π/2, not x = 1.5708.
  if (entry.feature === 'vertical-asymptote') { const x = number(entry.coordinates?.x); return x === undefined ? null : `x = ${asymptoteLabelNumber(x)}`; }
  if (entry.feature === 'horizontal-asymptote') { const y = number(entry.coordinates?.y); return y === undefined ? null : `y = ${text(y)}`; }
  if (entry.feature === 'oblique-asymptote') {
    const slope = number(entry.relationValue); const intercept = number(entry.coordinates?.y);
    if (slope === undefined || intercept === undefined) return null;
    const m = slope === 1 ? '' : slope === -1 ? '−' : text(slope);
    return `y = ${m}x${intercept === 0 ? '' : ` ${intercept < 0 ? '−' : '+'} ${text(Math.abs(intercept))}`}`;
  }
  return null;
}

export function GraphAnalyzeOverlay({
  activeTab, analysis, assumptions, complexSolve, hasSelection, message, onAddAssumption, onClose, onPin,
  onPreview, onRecenter, onRemoveAssumption, onTabChange, onWidthChange,
  pinned, selectedItemLabel, state, width,
}: {
  activeTab: GraphAnalyzeTabV1;
  analysis: GraphAnalysisEvidenceV1[];
  assumptions: GraphAuthoredAssumptionV1[];
  /** Zero/pole search and assumptions apply only to a selected complex mapping. */
  complexSolve: boolean;
  hasSelection: boolean;
  message: string;
  onAddAssumption: (sourceLatex: string) => boolean;
  onClose: () => void;
  onPin: (entry: GraphAnalysisEvidenceV1) => void;
  onPreview: (entry: GraphAnalysisEvidenceV1 | null) => void;
  onRemoveAssumption: (assumptionId: string) => void;
  onRecenter: (entry: GraphAnalysisEvidenceV1) => void;
  onTabChange: (tab: GraphAnalyzeTabV1) => void;
  onWidthChange: (width: number) => void;
  pinned: GraphPinnedAnnotationV2[];
  selectedItemLabel: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  width: number;
}) {
  const [assumptionDraft, setAssumptionDraft] = useState('');
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
      {(['features', 'evidence'] as const).map((tab) => <button aria-selected={activeTab === tab}
        key={tab} onClick={() => onTabChange(tab)} role="tab" type="button">{label(tab)}</button>)}
    </div>
    <p className={`graph-analyze-status is-${state}`} role="status">{message}</p>
    <div className="graph-analyze-content">
      {activeTab === 'features' ? <>
        {hasSelection && analysis.length === 0 && state !== 'loading' ? <p className="graph-analyze-empty">No supported findings for this item and current bounded scope.</p> : null}
        {[...grouped.entries()].map(([feature, entries]) => <section className="graph-feature-group" key={feature}>
          <h3>{label(feature)}</h3>
          {entries.map((entry) => {
            const mayPin = entry.level === 'exact-proved' || entry.level === 'interval-proved' || entry.level === 'numeric-validated';
            const pinnedNow = pinned.some((candidate) => candidate.annotationId === graphAnalysisAnnotationId(entry));
            const complexCoordinate = (entry.feature.startsWith('complex-') || entry.feature === 'branch-point')
              && entry.coordinates?.x && entry.coordinates?.y
              ? `z ${featureText(entry.coordinates.x)} ${graphFeatureNumber(entry.coordinates.y) !== undefined
                && (graphFeatureNumber(entry.coordinates.y) ?? 0) < 0 ? '−' : '+'} ${featureText(entry.coordinates.y).replace('≈ -', '≈ ')}i`
              : null;
            return <article className="graph-feature-card" key={entry.evidenceId} onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) onPreview(null);
            }} onFocus={() => onPreview(entry)} onMouseEnter={() => onPreview(entry)} onMouseLeave={() => onPreview(null)} tabIndex={0}>
              {entry.detail?.interval || entry.detail?.shared ? <div><strong>{stretchText(entry)}</strong><span>{entry.feature === 'root'
                ? 'every point here is a root' : 'every point here is on both curves'}</span></div>
                : boundaryText(entry) ? <div><strong>{boundaryText(entry)!.title}</strong><span>{boundaryText(entry)!.sides}</span></div>
                : <div><strong>{asymptoteEquation(entry) ?? complexCoordinate ?? (entry.coordinates?.x ? `x ${featureText(entry.coordinates.x)}` : label(entry.feature))}</strong>
                  {!asymptoteEquation(entry) && !complexCoordinate && entry.coordinates?.y ? <span>y {featureText(entry.coordinates.y)}</span> : null}</div>}
              {entry.coordinates?.z ? <span className="graph-feature-z">z {featureText(entry.coordinates.z)}</span> : null}
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
        {complexSolve ? <section className="graph-analyze-solve"><h3>Complex solve</h3>
          <p>Zeros and poles are searched only inside the visible or locked rectangle. Validated candidates do not imply global completeness.</p>
          <div className="graph-assumption-list">{assumptions.map((entry) => <span key={entry.assumptionId}>
            {entry.sourceLatex}<button aria-label={`Remove assumption ${entry.sourceLatex}`}
              onClick={() => onRemoveAssumption(entry.assumptionId)} type="button">×</button></span>)}</div>
          <form onSubmit={(event: FormEvent) => { event.preventDefault(); if (onAddAssumption(assumptionDraft)) setAssumptionDraft(''); }}>
            <input aria-label="Graph-local complex assumption" maxLength={8192}
              onChange={(event) => setAssumptionDraft(event.currentTarget.value)}
              placeholder="Assumption, e.g. z ≠ 0" value={assumptionDraft} />
            <button disabled={!assumptionDraft.trim()} type="submit">Add</button>
          </form>
        </section> : null}
      </> : null}
      {activeTab === 'evidence' ? analysis.map((entry) => <article className="graph-evidence-card" key={entry.evidenceId}>
        <header><strong>{label(entry.feature)}</strong><span>{entry.level.replaceAll('-', ' ')}</span></header>
        <dl><div><dt>Scope</dt><dd>{entry.itemIds.join(', ')}</dd></div>
          <div><dt>Method</dt><dd>{entry.basis.validator ?? entry.basis.source}</dd></div>
          <div><dt>Certainty</dt><dd>{entry.level === 'exact-proved' ? 'Proved in the supported symbolic family.'
            : entry.level === 'interval-proved' ? 'Proved by interval arithmetic: the true value lies within the stated bound.'
            : entry.level === 'numeric-validated' ? 'Validated inside the stated numeric window.'
              : 'Not eligible for a persistent annotation.'}</dd></div>
          {entry.basis.residualBound !== undefined ? <div><dt>Residual</dt><dd>≤ {entry.basis.residualBound}</dd></div> : null}</dl>
      </article>) : null}
    </div>
  </aside>;
}
