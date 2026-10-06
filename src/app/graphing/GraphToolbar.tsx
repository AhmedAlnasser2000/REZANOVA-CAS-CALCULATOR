import { memo, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { Focus, Grid3X3, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Redo2, Search, Undo2, X } from 'lucide-react';
import { useLightDismiss } from '../../components/useLightDismiss';
import { GraphThemeControls } from './GraphAppearanceControls';
import { graphToolbarLevel, type GraphToolbarWidths } from './graph-toolbar-overflow';
import type { GraphAppearanceThemeV1 } from '../../lib/graphing';
import type { useGraphWorkspaceController } from './useGraphWorkspaceController';

// The Graph toolbar (GRAPHING-UI1). As it narrows, controls leave the bar in
// this order: the view chip disappears, then Theme, Accessible colors, 1:1 and
// Grid & Axes move into a "…" menu, and last Auto-Fit and Analyze show only
// their icons. Undo/Redo, Auto-Fit, Analyze and the Real/Complex/Both switch
// always stay. What fits is worked out from a hidden row that always holds
// every control (graph-toolbar-overflow.ts), never from the bar itself.

const HIDE_ORDER = ['context', 'theme', 'colors', 'equal', 'grid', 'labels', 'history'] as const;
type HideKey = typeof HIDE_ORDER[number];

type Controller = ReturnType<typeof useGraphWorkspaceController>;

/** An element's width with its horizontal margins. */
function outerWidth(element: HTMLElement) {
  const style = getComputedStyle(element);
  return element.getBoundingClientRect().width + (Number.parseFloat(style.marginLeft) || 0) + (Number.parseFloat(style.marginRight) || 0);
}

export function GraphToolbar({ controller, equalAxes, gridPanelOpen, onToggleRail, railCollapsed, setEqualAxes, setGridPanelOpen }: {
  controller: Controller;
  equalAxes: boolean;
  gridPanelOpen: boolean;
  /** The expression list's state and toggle (a drawer in narrow windows). */
  onToggleRail: () => void;
  railCollapsed: boolean;
  setEqualAxes: Dispatch<SetStateAction<boolean>>;
  setGridPanelOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const { session } = controller;
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const gridButtonRef = useRef<HTMLButtonElement>(null);
  const gridPanelRef = useRef<HTMLElement>(null);
  const [level, setLevel] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const hidden = useMemo(() => new Set<HideKey>(HIDE_ORDER.slice(0, level)), [level]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const measure = measureRef.current;
    if (!bar || !measure) return undefined;
    const fit = () => {
      const available = bar.clientWidth;
      // Not laid out (a hidden tab, or a test DOM): nothing to fit yet.
      if (available === 0) return;
      const all = (key: string) => [...measure.querySelectorAll<HTMLElement>(`[data-measure="${key}"]`)];
      const width = (key: string) => all(key).reduce((sum, element) => sum + outerWidth(element), 0);
      const style = getComputedStyle(bar);
      const widths: GraphToolbarWidths = {
        fixed: all('fixed').map(outerWidth), history: all('history').map(outerWidth), context: width('context'), theme: width('theme'), colors: width('colors'),
        equal: width('equal'), grid: width('grid'), autofit: width('autofit'), autofitIcon: width('autofit-icon'),
        analyze: width('analyze'), analyzeIcon: width('analyze-icon'), more: width('more'),
        gap: Number.parseFloat(style.columnGap) || 0,
        padding: (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0),
      };
      setLevel(graphToolbarLevel(widths, available));
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return undefined;
    // The bar's width comes from the workbench, the measuring row's from its content (theme name, view chip,
    // notice): neither depends on what the bar currently shows, so the level cannot feed back into itself.
    const observer = new ResizeObserver(fit);
    observer.observe(bar);
    observer.observe(measure);
    return () => observer.disconnect();
  }, []);

  const moreTriggers = useMemo(() => [moreButtonRef], []);
  const gridTriggers = useMemo(() => [gridButtonRef, moreButtonRef], []);
  useLightDismiss({ open: moreOpen, onClose: () => setMoreOpen(false), layerRef: moreMenuRef, triggerRefs: moreTriggers });
  useLightDismiss({ open: gridPanelOpen, onClose: () => setGridPanelOpen(false), layerRef: gridPanelRef, triggerRefs: gridTriggers });

  const gridButton = (inMenu: boolean) => <button aria-expanded={gridPanelOpen} className="graph-toolbar-button"
    onClick={() => setGridPanelOpen((open) => !open)}
    ref={inMenu ? undefined : gridButtonRef} type="button">
    <Grid3X3 aria-hidden="true" size={17} /><span>Grid &amp; Axes</span>
  </button>;
  const themeControls = (inMenu: boolean) => <GraphThemeControls colorVisionMode={session.surface.appearance.colorVisionMode}
    onChange={controller.updateAppearance} parts={inMenu
      ? { theme: hidden.has('theme'), colors: hidden.has('colors') }
      : { theme: !hidden.has('theme'), colors: !hidden.has('colors') }}
    theme={session.surface.appearance.theme} />;
  const equalButton = () => <button aria-label="Equal axes" aria-pressed={equalAxes} className="graph-toolbar-button"
    onClick={() => setEqualAxes((current) => !current)}
    title="Equal axes: one unit is the same length on x and y, so circles are round" type="button">
    <span>1:1</span></button>;
  const moved = HIDE_ORDER.filter((key) => key !== 'context' && key !== 'labels' && hidden.has(key));
  const historyButtons = <>
    <button aria-label="Undo graph edit" className="graph-toolbar-button graph-toolbar-button--icon"
      disabled={!controller.canUndo} onClick={controller.undo} type="button">
      <Undo2 aria-hidden="true" size={18} />
    </button>
    <button aria-label="Redo graph edit" className="graph-toolbar-button graph-toolbar-button--icon"
      disabled={!controller.canRedo} onClick={controller.redo} type="button">
      <Redo2 aria-hidden="true" size={18} />
    </button>
  </>;
  const label = (text: string) => (hidden.has('labels') ? null : <span>{text}</span>);
  const contextText = session.surface.viewPolicy.mode === 'real'
    ? `Real · ${session.surface.panes.real.dimension === '3d' ? 'Three interactive' : 'SVG reference'}`
    : session.surface.viewPolicy.mode === 'complex' ? 'Complex · mapping' : 'Real + Complex';
  const noticeText = controller.autoViewNotice?.to === 'complex' ? 'Opened Complex for z' : 'Back to Real';

  return <>
    <div className="graph-toolbar" data-hidden-controls={level} ref={barRef} role="toolbar" aria-label="Graph controls">
      <button
        aria-label={railCollapsed ? 'Expand expression rail' : 'Collapse expression rail'}
        className="graph-toolbar-button graph-toolbar-button--icon"
        onClick={onToggleRail}
        type="button"
      >
        {railCollapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
      </button>
      <span className="graph-toolbar-separator" aria-hidden="true" />
      {hidden.has('history') ? null : historyButtons}
      {hidden.has('history') ? null : <span className="graph-toolbar-separator" aria-hidden="true" />}
      <button aria-label="Auto-Fit" className="graph-toolbar-button" onClick={controller.autoFit} title="Auto-Fit" type="button">
        <Focus aria-hidden="true" size={17} />
        {label('Auto-Fit')}
      </button>
      {hidden.has('grid') ? null : gridButton(false)}
      {hidden.has('theme') && hidden.has('colors') ? null : themeControls(false)}
      <button aria-label="Analyze" aria-pressed={session.surface.analyzeOpen} className="graph-toolbar-button" title="Analyze"
        onClick={() => {
          if (!session.surface.analyzeOpen && !session.surface.selectedItemId) {
            const first = session.document.items.find((item) => item.kind !== 'note' && item.kind !== 'parameter' && item.visible);
            if (first) controller.selectItem(first.itemId);
          }
          controller.updateAnalyze({ open: !session.surface.analyzeOpen });
        }} type="button"><Search aria-hidden="true" size={16} />{label('Analyze')}</button>
      <div aria-label="Graph number domain" className="graph-domain-switch" role="group">
        {(['real', 'complex', 'both'] as const).map((mode) => <button
          aria-pressed={session.surface.viewPolicy.mode === mode} key={mode}
          onClick={() => controller.updateViewPolicy(mode)} type="button">
          {mode[0].toUpperCase() + mode.slice(1)}
        </button>)}
      </div>
      {hidden.has('equal') ? null : equalButton()}
      {moved.length > 0 ? <div className="graph-toolbar-more">
        <button aria-expanded={moreOpen} aria-haspopup="true" aria-label="More graph controls"
          className="graph-toolbar-button graph-toolbar-button--icon" data-testid="graph-toolbar-more"
          onClick={() => setMoreOpen((open) => !open)} ref={moreButtonRef} type="button">
          <MoreHorizontal aria-hidden="true" size={18} />
        </button>
        {moreOpen ? <div aria-label="More graph controls" className="graph-toolbar-more-menu" data-testid="graph-toolbar-more-menu"
          ref={moreMenuRef} role="group">
          {hidden.has('history') ? <div className="graph-toolbar-more-row">{historyButtons}</div> : null}
          {hidden.has('grid') ? gridButton(true) : null}
          {hidden.has('theme') || hidden.has('colors') ? themeControls(true) : null}
          {hidden.has('equal') ? equalButton() : null}
        </div> : null}
      </div> : null}
      {/* The auto-switch notice names the view while it shows, so the context chip steps aside. */}
      {controller.autoViewNotice || hidden.has('context') ? null : <span className="graph-toolbar-context">{contextText}</span>}
      {controller.autoViewNotice ? <span className="graph-view-notice" data-testid="graph-view-notice" role="status"
        title={controller.autoViewNotice.to === 'complex'
          ? 'This expression uses z, the complex variable, so the Complex view opened.'
          : 'No complex map is left, so the view returned to Real.'}>
        {noticeText}
        <button onClick={() => controller.updateViewPolicy(controller.autoViewNotice!.from)} type="button">Undo</button>
      </span> : null}
    </div>

    {/* Every control at its natural width, never shown or reachable: what fits is worked out from these. */}
    <GraphToolbarMeasureRow contextText={controller.autoViewNotice ? null : contextText} measureRef={measureRef}
      noticeText={controller.autoViewNotice ? noticeText : null} theme={session.surface.appearance.theme} />

    {gridPanelOpen ? (
      <section aria-label="Grid and axes settings" className="graph-grid-panel" ref={gridPanelRef}>
        <div className="graph-grid-panel-heading">
          <strong>Grid &amp; Axes</strong>
          <button aria-label="Close grid settings" onClick={() => {
            setGridPanelOpen(false);
            gridTriggers.map((ref) => ref.current).find((element) => element?.isConnected)?.focus();
          }} type="button">
            <X aria-hidden="true" size={15} />
          </button>
        </div>
        <span className="graph-grid-panel-label">Grid type</span>
        <div className="graph-grid-kind" role="group" aria-label="Grid type">
          {(['cartesian', 'polar', 'none'] as const).map((kind) => (
            <button
              aria-pressed={session.surface.grid.kind === kind}
              key={kind}
              onClick={() => controller.updateGrid({ kind, angleLabels: kind === 'polar' })}
              type="button"
            >
              {kind[0].toUpperCase() + kind.slice(1)}
            </button>
          ))}
        </div>
        {([
          ['major', 'Major grid'],
          ['minor', 'Minor grid'],
          ['axisNumbers', 'Axis numbers'],
          ['angleLabels', 'Angle values'],
          ['unitCircle', 'Unit Circle overlay'],
        ] as const).map(([key, label]) => (
          <label className="graph-grid-toggle" key={key}>
            <span>{label}</span>
            <input
              checked={session.surface.grid[key]}
              disabled={key === 'angleLabels' && session.surface.grid.kind !== 'polar'}
              onChange={(event) => controller.updateGrid({ [key]: event.currentTarget.checked })}
              type="checkbox"
            />
          </label>
        ))}
      </section>
    ) : null}
  </>;
}

/** The hidden measuring row; memoised so typing in the expression list never re-renders it. */
const GraphToolbarMeasureRow = memo(function GraphToolbarMeasureRow({ contextText, measureRef, noticeText, theme }: {
  contextText: string | null;
  measureRef: RefObject<HTMLDivElement | null>;
  noticeText: string | null;
  theme: GraphAppearanceThemeV1;
}) {
  return <div aria-hidden="true" className="graph-toolbar-measure" inert ref={measureRef}>
      <button className="graph-toolbar-button graph-toolbar-button--icon" data-measure="fixed" tabIndex={-1} type="button">
        <PanelLeftClose size={18} /></button>
      <span className="graph-toolbar-separator" data-measure="fixed" />
      <button className="graph-toolbar-button graph-toolbar-button--icon" data-measure="history" tabIndex={-1} type="button">
        <Undo2 size={18} /></button>
      <button className="graph-toolbar-button graph-toolbar-button--icon" data-measure="history" tabIndex={-1} type="button">
        <Redo2 size={18} /></button>
      <span className="graph-toolbar-separator" data-measure="history" />
      <button className="graph-toolbar-button" data-measure="autofit" tabIndex={-1} type="button"><Focus size={17} /><span>Auto-Fit</span></button>
      <button className="graph-toolbar-button" data-measure="autofit-icon" tabIndex={-1} type="button"><Focus size={17} /></button>
      <button className="graph-toolbar-button" data-measure="grid" tabIndex={-1} type="button"><Grid3X3 size={17} /><span>Grid &amp; Axes</span></button>
      <div className="graph-toolbar-measure-item" data-measure="theme">
        <GraphThemeControls colorVisionMode="standard" onChange={() => {}} parts={{ theme: true, colors: false }}
          theme={theme} /></div>
      <div className="graph-toolbar-measure-item" data-measure="colors">
        <GraphThemeControls colorVisionMode="standard" onChange={() => {}} parts={{ theme: false, colors: true }}
          theme={theme} /></div>
      <button className="graph-toolbar-button" data-measure="analyze" tabIndex={-1} type="button"><Search size={16} /><span>Analyze</span></button>
      <button className="graph-toolbar-button" data-measure="analyze-icon" tabIndex={-1} type="button"><Search size={16} /></button>
      <div className="graph-domain-switch" data-measure="fixed">
        {['Real', 'Complex', 'Both'].map((mode) => <button key={mode} tabIndex={-1} type="button">{mode}</button>)}</div>
      <button className="graph-toolbar-button" data-measure="equal" tabIndex={-1} type="button"><span>1:1</span></button>
      <button className="graph-toolbar-button graph-toolbar-button--icon" data-measure="more" tabIndex={-1} type="button">
        <MoreHorizontal size={18} /></button>
      {noticeText !== null
        ? <span className="graph-view-notice" data-measure="fixed">{noticeText}<button tabIndex={-1} type="button">Undo</button></span>
        : <span className="graph-toolbar-context" data-measure="context">{contextText}</span>}
    </div>;
});
