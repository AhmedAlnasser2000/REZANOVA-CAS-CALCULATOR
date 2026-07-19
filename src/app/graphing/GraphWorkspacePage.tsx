import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Focus,
  Grid3X3,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Redo2,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { MathEditor } from '../../components/MathEditor';
import type { GraphItemSpecV1 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV1 } from './graph-workspace-session';
import graphBrandIcon from '../../../src-tauri/icons/32x32.png';
import {
  graphConditionLatex,
  graphItemSourceLatex,
  graphDraftMessage,
  graphPiecewiseBranchValueLatex,
} from './graph-document';
import { GraphSvgViewport, type GraphTraceRouteKind } from './GraphSvgViewport';
import { useGraphWorkspaceController } from './useGraphWorkspaceController';

type GraphWorkspacePageProps = {
  session: GraphWorkspaceSessionStateV1;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  onUpdateSession: (session: GraphWorkspaceSessionStateV1) => void;
};

type GraphExpressionRowProps = {
  item: GraphItemSpecV1 | null;
  itemId: string;
  errorVisible: boolean;
  onBlur: () => void;
  onChange: (latex: string) => void;
  onDelete?: () => void;
  runtimeWarning?: string;
  onSubmit: () => void;
  onToggle?: () => void;
  onUpdateParameter?: (values: Partial<Pick<
    Extract<GraphItemSpecV1, { kind: 'parameter' }>['parameter'],
    'value' | 'minimum' | 'maximum' | 'step' | 'animation'
  >>) => boolean;
  onSettleParameter?: () => void;
  samplingBusy?: boolean;
  onEditPiecewiseBranch?: (input: {
    branchId: string;
    valueLatex: string;
    conditionLatex: string;
  }) => boolean;
  onMutatePiecewiseBranch?: (action: 'add' | 'remove' | 'up' | 'down', branchId?: string) => void;
};

function GraphParameterControls({
  item,
  onSettle,
  onUpdate,
  samplingBusy,
}: {
  item: Extract<GraphItemSpecV1, { kind: 'parameter' }>;
  onSettle: () => void;
  onUpdate: NonNullable<GraphExpressionRowProps['onUpdateParameter']>;
  samplingBusy: boolean;
}) {
  const parameter = item.parameter;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);
  const playing = parameter.animation?.enabled === true && !reducedMotion;
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      if (samplingBusy) return;
      const span = parameter.maximum - parameter.minimum;
      if (!(span > 0)) return;
      const candidate = parameter.value + parameter.step;
      onUpdate({ value: candidate > parameter.maximum ? parameter.minimum : candidate });
    }, 80);
    return () => window.clearInterval(timer);
  }, [onUpdate, parameter.maximum, parameter.minimum, parameter.step, parameter.value, playing, samplingBusy]);

  const commitNumber = (
    key: 'value' | 'minimum' | 'maximum' | 'step',
    rawValue: string,
  ) => {
    const value = Number(rawValue);
    if (Number.isFinite(value)) onUpdate({ [key]: value });
    onSettle();
  };

  return (
    <div className="graph-parameter-controls" data-testid={`graph-parameter-${parameter.symbol}`}>
      <div className="graph-parameter-heading">
        <strong>{parameter.symbol}</strong>
        <span>{parameter.origin === 'authored-definition' ? 'Authored parameter' : 'Graph slider'}</span>
        <output aria-label={`${parameter.symbol} value`}>{parameter.value.toFixed(2)}</output>
      </div>
      <div className="graph-parameter-slider-row">
        <input
          aria-label={`${parameter.symbol} slider`}
          max={parameter.maximum}
          min={parameter.minimum}
          onChange={(event) => onUpdate({ value: event.currentTarget.valueAsNumber })}
          onKeyUp={(event) => {
            if (event.key === 'Enter') onSettle();
          }}
          onPointerUp={onSettle}
          step={parameter.step}
          type="range"
          value={parameter.value}
        />
        <button
          aria-label={playing ? `Pause ${parameter.symbol}` : `Play ${parameter.symbol}`}
          className="graph-parameter-play"
          disabled={reducedMotion}
          onClick={() => {
            onUpdate({
              animation: {
                direction: 'forward',
                enabled: !playing,
                periodMs: Math.max(80, Math.round((parameter.maximum - parameter.minimum) / parameter.step) * 80),
              },
            });
            if (playing) onSettle();
          }}
          title={reducedMotion ? 'Animation is disabled by reduced motion.' : undefined}
          type="button"
        >
          {playing ? <Pause aria-hidden="true" size={14} /> : <Play aria-hidden="true" size={14} />}
        </button>
      </div>
      <div className="graph-parameter-fields">
        {([
          ['value', 'Value'],
          ['minimum', 'Min'],
          ['maximum', 'Max'],
          ['step', 'Step'],
        ] as const).map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              aria-label={`${parameter.symbol} ${label.toLowerCase()}`}
              defaultValue={parameter[key]}
              key={`${key}:${parameter[key]}`}
              onBlur={(event) => commitNumber(key, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              step={key === 'step' ? 'any' : parameter.step}
              type="number"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function GraphPiecewiseBranchEditor({
  branch,
  index,
  onCommit,
  onMutate,
}: {
  branch: Extract<GraphItemSpecV1, { kind: 'piecewise' }>['piecewise']['branches'][number];
  index: number;
  onCommit: GraphExpressionRowProps['onEditPiecewiseBranch'];
  onMutate: NonNullable<GraphExpressionRowProps['onMutatePiecewiseBranch']>;
}) {
  const [conditionLatex, setConditionLatex] = useState(() => graphConditionLatex(branch.condition));
  const [valueLatex, setValueLatex] = useState(() => graphPiecewiseBranchValueLatex(branch));
  const [invalid, setInvalid] = useState(false);
  const commit = () => setInvalid(!(onCommit?.({ branchId: branch.branchId, valueLatex, conditionLatex }) ?? false));
  return (
    <div className="graph-piecewise-branch" data-branch-id={branch.branchId}>
      <span className="graph-piecewise-branch-index">{index + 1}</span>
      <MathEditor
        className="graph-piecewise-field"
        dataTestId={`graph-piecewise-value-${branch.branchId}`}
        onBlur={commit}
        onChange={setValueLatex}
        onSubmit={commit}
        placeholder="value"
        shortcutProfile="graphing"
        value={valueLatex}
      />
      <span className="graph-piecewise-if">if</span>
      <MathEditor
        className="graph-piecewise-field"
        dataTestId={`graph-piecewise-condition-${branch.branchId}`}
        onBlur={commit}
        onChange={setConditionLatex}
        onSubmit={commit}
        placeholder="condition"
        shortcutProfile="graphing"
        value={conditionLatex}
      />
      <div className="graph-piecewise-branch-actions">
        <button aria-label={`Move branch ${index + 1} up`} className="graph-mini-button" onClick={() => onMutate('up', branch.branchId)} type="button"><ArrowUp size={13} /></button>
        <button aria-label={`Move branch ${index + 1} down`} className="graph-mini-button" onClick={() => onMutate('down', branch.branchId)} type="button"><ArrowDown size={13} /></button>
        <button aria-label={`Remove branch ${index + 1}`} className="graph-mini-button" onClick={() => onMutate('remove', branch.branchId)} type="button"><Trash2 size={13} /></button>
      </div>
      {invalid ? <span className="graph-piecewise-invalid">Finish a valid value and condition.</span> : null}
    </div>
  );
}

function GraphExpressionRow({
  errorVisible,
  item,
  itemId,
  onBlur,
  onChange,
  onDelete,
  onEditPiecewiseBranch,
  onMutatePiecewiseBranch,
  onSettleParameter,
  onSubmit,
  onToggle,
  onUpdateParameter,
  runtimeWarning,
  samplingBusy = false,
}: GraphExpressionRowProps) {
  const [piecewiseExpanded, setPiecewiseExpanded] = useState(false);
  const draftMessage = item?.kind === 'invalid-relation-draft'
    ? graphDraftMessage(item.parseStop)
    : '';
  const colorToken = item?.kind === 'parameter'
    ? 'graph-violet'
    : item && 'presentation' in item
      ? item.presentation.colorToken
      : 'graph-blue';
  const hidden = item ? !item.visible : false;

  return (
    <div
      className={`graph-expression-row${item ? '' : ' is-blank'}${hidden ? ' is-hidden' : ''}`}
      data-color-token={colorToken}
      data-graph-item-id={itemId}
      data-testid={item ? 'graph-expression-row' : 'graph-expression-blank-row'}
    >
      <span className="graph-expression-color" aria-hidden="true" />
      {item?.kind === 'parameter' && item.parameter.origin === 'slider-created' ? (
        <strong className="graph-parameter-symbol" aria-label={`Parameter ${item.parameter.symbol}`}>
          {item.parameter.symbol}
        </strong>
      ) : (
        <MathEditor
          className="graph-expression-editor"
          dataTestId={`graph-expression-editor-${itemId}`}
          onBlur={onBlur}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder={item ? '' : 'Enter an expression…'}
          shortcutProfile="graphing"
          value={item ? graphItemSourceLatex(item) : ''}
        />
      )}
      {item ? (
        <div className="graph-expression-actions">
          {item.kind === 'piecewise' ? (
            <button
              aria-expanded={piecewiseExpanded}
              aria-label={piecewiseExpanded ? 'Collapse piecewise branches' : 'Expand piecewise branches'}
              className="graph-icon-button"
              onClick={() => setPiecewiseExpanded((expanded) => !expanded)}
              type="button"
            >
              {piecewiseExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : null}
          <button
            aria-label={hidden ? 'Show graph' : 'Hide graph'}
            className="graph-icon-button"
            onClick={onToggle}
            type="button"
          >
            {hidden ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
          </button>
          <button
            aria-label="Delete expression"
            className="graph-icon-button"
            onClick={onDelete}
            type="button"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      ) : null}
      {(errorVisible && draftMessage) || runtimeWarning ? (
        <p className="graph-expression-error" role="status">
          <AlertTriangle aria-hidden="true" size={14} />
          <span>{runtimeWarning ?? draftMessage}</span>
        </p>
      ) : null}
      {item?.kind === 'piecewise' && piecewiseExpanded && onMutatePiecewiseBranch ? (
        <div className="graph-piecewise-editor">
          <strong>Piecewise branches</strong>
          {item.piecewise.branches.map((branch, index) => (
            <GraphPiecewiseBranchEditor
              branch={branch}
              index={index}
              key={branch.branchId}
              onCommit={onEditPiecewiseBranch}
              onMutate={onMutatePiecewiseBranch}
            />
          ))}
          <button className="graph-piecewise-add" onClick={() => onMutatePiecewiseBranch('add')} type="button">+ Add branch</button>
        </div>
      ) : null}
      {item?.kind === 'parameter' && onUpdateParameter && onSettleParameter ? (
        <GraphParameterControls
          item={item}
          onSettle={onSettleParameter}
          onUpdate={onUpdateParameter}
          samplingBusy={samplingBusy}
        />
      ) : null}
    </div>
  );
}

export default function GraphWorkspacePage({
  onUpdateSession,
  session: initialSession,
  workspaceContext,
}: GraphWorkspacePageProps) {
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 600 });
  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const promotedItemIdRef = useRef<string | null>(null);
  const controller = useGraphWorkspaceController({
    cssSize: viewportSize,
    initialSession,
    onPersistSession: onUpdateSession,
    workspaceContext,
  });
  const scene = controller.sampleResult?.scene ?? null;
  const visibleCount = controller.session.document.items.filter((item) => item.visible).length;
  const runtimeWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    for (const reason of controller.sampleResult?.stopReasons ?? []) {
      if (!reason.path || warnings.has(reason.path)) continue;
      if (reason.code === 'region-topology-inconclusive') {
        warnings.set(
          reason.path,
          'Uncertain cells were omitted rather than filling this region as complete.',
        );
      } else if (reason.code === 'sampling-budget-exceeded') {
        warnings.set(
          reason.path,
          'This item reached its safe plotting budget; only bounded geometry is shown.',
        );
      } else if (reason.detailCode === 'piecewise-overlap') {
        warnings.set(reason.path, 'Piecewise branches overlap; all matching branches are drawn.');
      } else if (reason.detailCode?.startsWith('piecewise-impossible:')) {
        warnings.set(reason.path, 'One piecewise branch has an impossible condition in this view.');
      }
    }
    return warnings;
  }, [controller.sampleResult]);
  const itemRoutes = useMemo(() => {
    const routes: Record<string, GraphTraceRouteKind> = {};
    for (const item of controller.session.document.items) {
      if (item.kind === 'point-set') {
        routes[item.itemId] = 'point-set';
        continue;
      }
      if (item.kind === 'relation'
        && (item.relation.kind === 'explicit-y'
          || item.relation.kind === 'explicit-x')) {
        routes[item.itemId] = item.relation.kind;
      } else if (item.kind === 'relation' && item.relation.kind === 'polar-radius') {
        routes[item.itemId] = { kind: 'polar-radius', parameterSymbol: 'theta' };
      } else if (item.kind === 'relation' && item.relation.kind === 'parametric-curve') {
        routes[item.itemId] = {
          kind: 'parametric-curve',
          parameterSymbol: item.relation.parameterSymbol,
        };
      }
    }
    return routes;
  }, [controller.session.document.items]);
  const hasPolarRelation = controller.session.document.items.some((item) => (
    item.kind === 'relation' && item.visible && item.relation.kind === 'polar-radius'
  ));

  const focusNextRow = useCallback((itemId: string) => {
    requestAnimationFrame(() => {
      const rows = [...document.querySelectorAll<HTMLElement>('[data-graph-item-id]')];
      const index = rows.findIndex((row) => row.dataset.graphItemId === itemId);
      const nextField = rows[index + 1]?.querySelector<HTMLElement>('math-field');
      nextField?.focus();
    });
  }, []);

  useLayoutEffect(() => {
    const itemId = promotedItemIdRef.current;
    if (!itemId) return;
    const field = document.querySelector<HTMLElement>(
      `[data-graph-item-id="${itemId}"] math-field`,
    );
    if (!field?.isConnected) return;
    if (document.activeElement !== field) {
      field.focus();
    }
    promotedItemIdRef.current = null;
  }, [controller.blankItemId]);

  return (
    <article className="app-page graph-page" data-testid="graph-page">
      <header className="app-page-shell-header graph-page-header">
        <span className="graph-brand-mark" aria-hidden="true">
          <img alt="" src={graphBrandIcon} />
        </span>
        <strong>REZANOVA</strong>
        <span className="graph-header-divider" aria-hidden="true" />
        <span>Graphing</span>
      </header>

      <main
        className={`graph-workbench${controller.session.surface.expressionRailCollapsed ? ' is-rail-collapsed' : ''}`}
      >
        <div className="graph-toolbar" role="toolbar" aria-label="Graph controls">
          <button
            aria-label={controller.session.surface.expressionRailCollapsed ? 'Expand expression rail' : 'Collapse expression rail'}
            className="graph-toolbar-button graph-toolbar-button--icon"
            onClick={controller.toggleRail}
            type="button"
          >
            {controller.session.surface.expressionRailCollapsed
              ? <PanelLeftOpen aria-hidden="true" size={18} />
              : <PanelLeftClose aria-hidden="true" size={18} />}
          </button>
          <span className="graph-toolbar-separator" aria-hidden="true" />
          <button
            aria-label="Undo graph edit"
            className="graph-toolbar-button graph-toolbar-button--icon"
            disabled={!controller.canUndo}
            onClick={controller.undo}
            type="button"
          >
            <Undo2 aria-hidden="true" size={18} />
          </button>
          <button
            aria-label="Redo graph edit"
            className="graph-toolbar-button graph-toolbar-button--icon"
            disabled={!controller.canRedo}
            onClick={controller.redo}
            type="button"
          >
            <Redo2 aria-hidden="true" size={18} />
          </button>
          <span className="graph-toolbar-separator" aria-hidden="true" />
          <button className="graph-toolbar-button" onClick={controller.autoFit} type="button">
            <Focus aria-hidden="true" size={17} />
            <span>Auto-Fit</span>
          </button>
          <button
            aria-expanded={gridPanelOpen}
            className="graph-toolbar-button"
            onClick={() => setGridPanelOpen((open) => !open)}
            type="button"
          >
            <Grid3X3 aria-hidden="true" size={17} />
            <span>Grid &amp; Axes</span>
          </button>
          <span className="graph-toolbar-context">Real · SVG reference</span>
        </div>

        {gridPanelOpen ? (
          <section aria-label="Grid and axes settings" className="graph-grid-panel">
            <div className="graph-grid-panel-heading">
              <strong>Grid &amp; Axes</strong>
              <button aria-label="Close grid settings" onClick={() => setGridPanelOpen(false)} type="button">
                <X aria-hidden="true" size={15} />
              </button>
            </div>
            <span className="graph-grid-panel-label">Grid type</span>
            <div className="graph-grid-kind" role="group" aria-label="Grid type">
              {(['cartesian', 'polar', 'none'] as const).map((kind) => (
                <button
                  aria-pressed={controller.session.surface.grid.kind === kind}
                  key={kind}
                  onClick={() => controller.updateGrid({
                    kind,
                    angleLabels: kind === 'polar',
                  })}
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
                  checked={controller.session.surface.grid[key]}
                  disabled={key === 'angleLabels' && controller.session.surface.grid.kind !== 'polar'}
                  onChange={(event) => controller.updateGrid({ [key]: event.currentTarget.checked })}
                  type="checkbox"
                />
              </label>
            ))}
          </section>
        ) : null}

        <aside className="graph-expression-rail" aria-label="Expressions">
          <div className="graph-expression-list">
            {[...controller.session.document.items, null].map((item) => {
              const itemId = item?.itemId ?? controller.blankItemId;
              return (
                <GraphExpressionRow
                  errorVisible={item
                    ? controller.visibleDraftErrors.has(item.itemId)
                    : false}
                  item={item}
                  itemId={itemId}
                  key={itemId}
                  onBlur={() => {
                    if (item) controller.blurItem(itemId);
                    controller.flushSampling();
                  }}
                  onChange={(latex) => {
                    if (!item && latex.trim()) promotedItemIdRef.current = itemId;
                    controller.editItem(itemId, latex);
                  }}
                  onDelete={item ? () => controller.removeItem(itemId) : undefined}
                  onEditPiecewiseBranch={item?.kind === 'piecewise'
                    ? (input) => controller.editPiecewiseBranch({ itemId, ...input })
                    : undefined}
                  onMutatePiecewiseBranch={item?.kind === 'piecewise'
                    ? (action, branchId) => controller.mutatePiecewiseBranch({ itemId, action, branchId })
                    : undefined}
                  onSettleParameter={item?.kind === 'parameter'
                    ? () => {
                        controller.endTypingTransaction();
                        controller.flushSampling();
                      }
                    : undefined}
                  onSubmit={() => {
                    controller.endTypingTransaction();
                    controller.flushSampling();
                    focusNextRow(itemId);
                  }}
                  onToggle={item ? () => controller.toggleItem(itemId) : undefined}
                  onUpdateParameter={item?.kind === 'parameter'
                    ? (values) => controller.updateParameter(itemId, values)
                    : undefined}
                  runtimeWarning={item ? runtimeWarnings.get(itemId) : undefined}
                  samplingBusy={controller.status.kind === 'sampling' || controller.status.kind === 'editing'}
                />
              );
            })}
          </div>
          <div className="graph-rail-note">
            {controller.unresolvedSymbols.length > 0 ? (
              <div className="graph-parameter-discovery" role="group" aria-label="Create graph sliders">
                <strong>Unresolved parameters</strong>
                {controller.unresolvedSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => controller.createParameters([symbol])}
                    type="button"
                  >
                    Create slider for {symbol}
                  </button>
                ))}
                {controller.unresolvedSymbols.length > 1 ? (
                  <button onClick={() => controller.createParameters(controller.unresolvedSymbols)} type="button">
                    Create all sliders
                  </button>
                ) : null}
              </div>
            ) : null}
            <button
              className="graph-add-point-button"
              onClick={() => {
                const itemId = controller.addPointSet();
                requestAnimationFrame(() => document.querySelector<HTMLElement>(
                  `[data-graph-item-id="${itemId}"] math-field`,
                )?.focus({ preventScroll: true }));
              }}
              type="button"
            >
              + Point Set
            </button>
            <span>Bare x-based expressions plot directly. You do not need to type y =.</span>
          </div>
        </aside>

        <section className="graph-viewport-panel" aria-label="Graph viewport">
          <GraphSvgViewport
            onSizeChange={setViewportSize}
            onViewportChange={controller.setViewport}
            itemRoutes={itemRoutes}
            pending={controller.isScenePending}
            scene={scene}
            viewport={controller.session.surface.viewport}
          />
          {controller.isScenePending ? (
            <span className="graph-pending-badge">Updating</span>
          ) : null}
          {hasPolarRelation && controller.session.surface.grid.kind !== 'polar' ? (
            <button
              className="graph-polar-grid-suggestion"
              onClick={() => controller.updateGrid({ kind: 'polar', angleLabels: true })}
              type="button"
            >
              Switch to Polar grid
            </button>
          ) : null}
        </section>
      </main>

      <footer className="app-page-shell-footer graph-page-footer">
        <span className={`graph-status is-${controller.status.kind}`}>
          <span className="graph-status-dot" aria-hidden="true" />
          {controller.status.label}
        </span>
        <span>{visibleCount} visible {visibleCount === 1 ? 'item' : 'items'}</span>
        <span>Click to trace · scroll to zoom · drag to pan</span>
      </footer>
    </article>
  );
}
