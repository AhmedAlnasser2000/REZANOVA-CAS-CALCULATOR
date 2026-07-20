import {
  type CSSProperties,
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
  GripVertical,
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
import {
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphAppearanceThemeV1,
  type GraphItemPresentationV2,
  type GraphItemSpecV1,
  type GraphNoteItemV1,
} from '../../lib/graphing';
import type {
  GraphPiecewiseAuthoringDraftV1,
  GraphWorkspaceSessionStateV4,
} from './graph-workspace-session';
import graphBrandIcon from '../../../src-tauri/icons/32x32.png';
import {
  graphDraftMessage,
  graphItemSourceLatex,
  graphPiecewiseDraftBranchFeedback,
} from './graph-document';
import type { GraphTraceRouteKind } from './GraphSvgViewport';
import { GraphViewportHost } from './GraphViewportHost';
import { GraphStylePopover, GraphThemeControls } from './GraphAppearanceControls';
import { useGraphWorkspaceController } from './useGraphWorkspaceController';

type GraphWorkspacePageProps = {
  session: GraphWorkspaceSessionStateV4;
  workspaceContext: WorkspaceInstanceRuntimeContext;
  onUpdateSession: (session: GraphWorkspaceSessionStateV4) => void;
};

type GraphRailEntry =
  | { kind: 'expression'; item: GraphItemSpecV1 | null; itemId: string }
  | { kind: 'note'; item: GraphNoteItemV1 }
  | { kind: 'piecewise-draft'; draft: GraphPiecewiseAuthoringDraftV1 };

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
  onUpdatePresentation?: (presentation: GraphItemPresentationV2) => void;
  appearance: {
    theme: GraphAppearanceThemeV1;
    colorVisionMode: 'standard' | 'color-vision-friendly';
  };
  onUpdateParameter?: (values: Partial<Pick<
    Extract<GraphItemSpecV1, { kind: 'parameter' }>['parameter'],
    'value' | 'minimum' | 'maximum' | 'step' | 'animation'
  >>) => boolean;
  onSettleParameter?: () => void;
  samplingBusy?: boolean;
  piecewiseDraft?: GraphPiecewiseAuthoringDraftV1;
  onBeginPiecewiseDraft?: () => void;
  onCommitPiecewiseDraft?: () => boolean;
  onCancelPiecewiseDraft?: () => void;
  onChangePiecewiseDraft?: (branchId: string, field: 'valueLatex' | 'conditionLatex', value: string) => void;
  onMutatePiecewiseDraft?: (action: 'add' | 'remove' | 'up' | 'down', branchId?: string) => void;
};

function GraphPiecewiseDraftRow({
  draft,
  onChange,
  onCommit,
  onDelete,
  onMutate,
  embedded = false,
}: {
  draft: GraphPiecewiseAuthoringDraftV1;
  onChange: (branchId: string, field: 'valueLatex' | 'conditionLatex', value: string) => void;
  onCommit: () => boolean;
  onDelete: () => void;
  onMutate: (action: 'add' | 'remove' | 'up' | 'down', branchId?: string) => void;
  embedded?: boolean;
}) {
  const [feedback, setFeedback] = useState<Record<string, { value?: string; condition?: string }>>({});
  useEffect(() => {
    const timer = setTimeout(() => setFeedback(Object.fromEntries(draft.branches.map((branch) => [
      branch.branchId,
      graphPiecewiseDraftBranchFeedback({
        target: draft.target,
        valueLatex: branch.valueLatex,
        conditionLatex: branch.conditionLatex,
      }),
    ]))), 200);
    return () => clearTimeout(timer);
  }, [draft.branches, draft.target]);
  const editor = <div className="graph-piecewise-editor">
      <div className="graph-piecewise-draft-heading"><strong>{draft.mode === 'replace' ? 'Piecewise branches' : 'Piecewise Function'}</strong>
        <button aria-label={draft.mode === 'replace' ? 'Cancel branch changes' : 'Delete piecewise draft'}
          className="graph-icon-button" onClick={onDelete} type="button"><Trash2 aria-hidden="true" size={16} /></button>
      </div>
      {draft.branches.map((branch, index) => <div className="graph-piecewise-branch" key={branch.branchId}>
        <span className="graph-piecewise-branch-index">{index + 1}</span>
        <MathEditor className="graph-piecewise-field" dataTestId={`graph-piecewise-draft-value-${branch.branchId}`}
          onBlur={onCommit} onChange={(value) => onChange(branch.branchId, 'valueLatex', value)} onSubmit={onCommit} placeholder="value"
          shortcutProfile="graphing" value={branch.valueLatex} />
        <span className="graph-piecewise-if">if</span>
        <MathEditor className="graph-piecewise-field" dataTestId={`graph-piecewise-draft-condition-${branch.branchId}`}
          onBlur={onCommit} onChange={(value) => onChange(branch.branchId, 'conditionLatex', value)} onSubmit={onCommit} placeholder={index === 0 ? 'x < 0' : 'x ≥ 0'}
          shortcutProfile="graphing" value={branch.conditionLatex} />
        {draft.branches.length > 2 ? <div className="graph-piecewise-branch-actions">
          <button aria-label={`Remove branch ${index + 1}`} onClick={() => onMutate('remove', branch.branchId)} type="button"><Trash2 size={13} /></button>
        </div> : null}
        {feedback[branch.branchId]?.value || feedback[branch.branchId]?.condition ? (
          <p className="graph-piecewise-branch-feedback" role="status">
            {feedback[branch.branchId]?.value ?? feedback[branch.branchId]?.condition}
          </p>
        ) : null}
      </div>)}
      <button className="graph-piecewise-add" onClick={() => onMutate('add')} type="button">+ Add branch</button>
      {draft.mode === 'replace' ? <button className="graph-piecewise-apply" onClick={onCommit} type="button">Apply branch changes</button> : null}
      <p className="graph-piecewise-draft-note">{draft.mode === 'replace'
        ? 'Valid branch changes apply atomically.'
        : 'Complete both values and conditions to create the graph.'}</p>
    </div>;
  if (embedded) return editor;
  return <div className="graph-expression-row graph-piecewise-draft" data-graph-item-id={draft.itemId}
    data-testid="graph-piecewise-authoring-draft"><span className="graph-expression-color" aria-hidden="true" />{editor}</div>;
}

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

function GraphExpressionRow({
  errorVisible,
  item,
  itemId,
  onBlur,
  onChange,
  onDelete,
  onBeginPiecewiseDraft,
  onCancelPiecewiseDraft,
  onChangePiecewiseDraft,
  onCommitPiecewiseDraft,
  onMutatePiecewiseDraft,
  onSettleParameter,
  onSubmit,
  onToggle,
  onUpdatePresentation,
  onUpdateParameter,
  runtimeWarning,
  piecewiseDraft,
  samplingBusy = false,
  appearance,
}: GraphExpressionRowProps) {
  const [piecewiseCollapsed, setPiecewiseCollapsed] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [editorOverflowing, setEditorOverflowing] = useState(false);
  const editorScrollRef = useRef<HTMLDivElement | null>(null);
  const measureEditorOverflow = useCallback(() => {
    const container = editorScrollRef.current;
    if (!container) return;
    const overflowing = container.scrollWidth > container.clientWidth + 1;
    setEditorOverflowing((current) => current === overflowing ? current : overflowing);
  }, []);
  useLayoutEffect(() => {
    const container = editorScrollRef.current;
    if (!container) return undefined;
    const field = container.querySelector('math-field');
    const frame = requestAnimationFrame(measureEditorOverflow);
    if (typeof ResizeObserver === 'undefined') {
      return () => cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(measureEditorOverflow);
    observer.observe(container);
    if (field) observer.observe(field);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [itemId, measureEditorOverflow]);
  const draftMessage = item?.kind === 'invalid-relation-draft'
    ? graphDraftMessage(item.parseStop)
    : '';
  const color = item?.kind === 'parameter'
    ? '#ae68f5'
    : item && 'presentation' in item
      ? resolveGraphPresentationColor(item.presentation, appearance.colorVisionMode)
      : '#5598ff';
  const presentationColor = item && 'presentation' in item
    ? normalizeGraphItemPresentation(item.presentation).color
    : null;
  const colorToken = presentationColor?.kind === 'token'
    ? presentationColor.token
    : item?.kind === 'parameter' ? 'graph-violet' : item ? undefined : 'graph-blue';
  const hidden = item ? !item.visible : false;
  const piecewiseEditorOpen = item?.kind === 'piecewise'
    && Boolean(piecewiseDraft)
    && !piecewiseCollapsed;

  return (
    <div
      className={`graph-expression-row${item ? '' : ' is-blank'}${hidden ? ' is-hidden' : ''}${item?.kind === 'piecewise' ? ' is-piecewise' : ''}`}
      style={{ '--graph-item-color': color } as CSSProperties}
      data-color-token={colorToken}
      data-graph-item-id={itemId}
      data-piecewise-state={item?.kind === 'piecewise' ? (piecewiseEditorOpen ? 'expanded' : 'summary') : undefined}
      data-testid={item ? 'graph-expression-row' : 'graph-expression-blank-row'}
    >
      {item && 'presentation' in item ? <button aria-expanded={styleOpen}
        aria-label="Style graph item" className="graph-expression-color" onClick={() => setStyleOpen((open) => !open)}
        type="button" /> : <span className="graph-expression-color" aria-hidden="true" />}
      {styleOpen && item && 'presentation' in item && onUpdatePresentation ? <GraphStylePopover
        colorVisionMode={appearance.colorVisionMode} onClose={() => setStyleOpen(false)}
        onUpdate={onUpdatePresentation} presentation={normalizeGraphItemPresentation(item.presentation)}
        theme={appearance.theme} /> : null}
      {item?.kind === 'parameter' && item.parameter.origin === 'slider-created' ? (
        <strong className="graph-parameter-symbol" aria-label={`Parameter ${item.parameter.symbol}`}>
          {item.parameter.symbol}
        </strong>
      ) : (
        <div
          className={`graph-expression-editor-scroll${item?.kind === 'piecewise' ? ' graph-piecewise-summary' : ''}${editorOverflowing ? ' is-overflowing' : ''}`}
          data-overflowing={editorOverflowing ? 'true' : 'false'}
          data-testid={item?.kind === 'piecewise' ? 'graph-piecewise-summary' : undefined}
          ref={editorScrollRef}
        >
          <MathEditor
            className={`graph-expression-editor${item?.kind === 'piecewise' ? ' graph-piecewise-summary-editor' : ''}`}
            dataTestId={`graph-expression-editor-${itemId}`}
            onBlur={onBlur}
            onChange={(latex) => {
              onChange(latex);
              requestAnimationFrame(measureEditorOverflow);
            }}
            onSubmit={onSubmit}
            placeholder={item ? '' : 'Enter an expression…'}
            readOnly={piecewiseEditorOpen}
            shortcutProfile="graphing"
            value={item ? graphItemSourceLatex(item) : ''}
          />
        </div>
      )}
      {item ? (
        <div className="graph-expression-actions">
          {item.kind === 'piecewise' ? (
            <button
              aria-controls={piecewiseEditorOpen ? `graph-piecewise-editor-${itemId}` : undefined}
              aria-expanded={piecewiseEditorOpen}
              aria-label={piecewiseEditorOpen ? 'Collapse piecewise branches' : 'Expand piecewise branches'}
              className="graph-icon-button"
              onClick={() => {
                if (piecewiseDraft) setPiecewiseCollapsed((collapsed) => !collapsed);
                else { onBeginPiecewiseDraft?.(); setPiecewiseCollapsed(false); }
              }}
              type="button"
            >
              {piecewiseEditorOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
      {item?.kind === 'piecewise' && piecewiseDraft && !piecewiseCollapsed && onChangePiecewiseDraft
        && onCommitPiecewiseDraft && onMutatePiecewiseDraft ? (
          <div className="graph-piecewise-expanded-editor" id={`graph-piecewise-editor-${itemId}`}>
            <GraphPiecewiseDraftRow draft={piecewiseDraft} embedded onChange={onChangePiecewiseDraft}
              onCommit={onCommitPiecewiseDraft} onDelete={() => {
                onCancelPiecewiseDraft?.();
                setPiecewiseCollapsed(true);
              }} onMutate={onMutatePiecewiseDraft} />
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

function GraphNoteRow({
  item,
  onChange,
  onDelete,
  readOnly,
}: {
  item: GraphNoteItemV1;
  onChange: (text: string) => void;
  onDelete: () => void;
  readOnly: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [limitAttempted, setLimitAttempted] = useState(false);
  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.max(72, textarea.scrollHeight)}px`;
  }, []);
  useLayoutEffect(() => {
    resize();
  }, [item.text, resize]);
  return (
    <section className="graph-note-row" data-graph-item-id={item.itemId} data-testid="graph-note-row">
      <textarea
        aria-describedby={limitAttempted ? `${item.itemId}-note-limit` : undefined}
        aria-label="Graph note"
        onChange={(event) => {
          const next = event.currentTarget.value;
          if (next.length > 16_384) {
            setLimitAttempted(true);
            return;
          }
          setLimitAttempted(false);
          onChange(next);
          requestAnimationFrame(resize);
        }}
        placeholder="Write a note…"
        readOnly={readOnly}
        ref={textareaRef}
        value={item.text}
      />
      {!readOnly ? <button aria-label="Delete note" className="graph-icon-button" onClick={onDelete} type="button">
        <Trash2 aria-hidden="true" size={16} />
      </button> : null}
      <span className="graph-note-count">{item.text.length.toLocaleString()} / 16,384</span>
      {limitAttempted ? <p className="graph-note-limit" id={`${item.itemId}-note-limit`} role="alert">
        Notes can contain up to 16,384 characters. No text was removed.
      </p> : null}
    </section>
  );
}

function GraphRowOrderControls({
  index,
  itemId,
  itemCount,
  onMove,
}: {
  index: number;
  itemId: string;
  itemCount: number;
  onMove: (itemId: string, index: number) => void;
}) {
  const [grabbed, setGrabbed] = useState(false);
  return <div className="graph-row-order-controls">
    <button
      aria-label={`Reorder item ${index + 1}`}
      aria-pressed={grabbed}
      className="graph-row-drag-handle"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/x-graph-item-id', itemId);
      }}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault(); setGrabbed((value) => !value); return;
        }
        if (!grabbed) return;
        if (event.key === 'Escape') { event.preventDefault(); setGrabbed(false); return; }
        if (event.key === 'ArrowUp' && index > 0) { event.preventDefault(); onMove(itemId, index - 1); }
        if (event.key === 'ArrowDown' && index < itemCount - 1) { event.preventDefault(); onMove(itemId, index + 1); }
      }}
      title="Drag to reorder. Press Space, then use arrow keys."
      type="button"
    ><GripVertical aria-hidden="true" size={16} /></button>
    <button aria-label={`Move item ${index + 1} up`} disabled={index === 0}
      onClick={() => onMove(itemId, index - 1)} type="button"><ArrowUp aria-hidden="true" size={12} /></button>
    <button aria-label={`Move item ${index + 1} down`} disabled={index === itemCount - 1}
      onClick={() => onMove(itemId, index + 1)} type="button"><ArrowDown aria-hidden="true" size={12} /></button>
  </div>;
}

export default function GraphWorkspacePage({
  onUpdateSession,
  session: initialSession,
  workspaceContext,
}: GraphWorkspacePageProps) {
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 600 });
  const [gridPanelOpen, setGridPanelOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const promotedItemIdRef = useRef<string | null>(null);
  const piecewiseFocusItemIdRef = useRef<string | null>(null);
  const controller = useGraphWorkspaceController({
    cssSize: viewportSize,
    initialSession,
    onPersistSession: onUpdateSession,
    workspaceContext,
  });
  const piecewiseDrafts = useMemo(
    () => controller.session.authoring?.piecewiseDrafts ?? [],
    [controller.session.authoring?.piecewiseDrafts],
  );
  const piecewiseDraftsByItem = useMemo(() => new Map(
    piecewiseDrafts.filter((draft) => draft.mode === 'replace').map((draft) => [draft.itemId, draft]),
  ), [piecewiseDrafts]);
  const railEntries = useMemo<GraphRailEntry[]>(() => [
    ...controller.session.document.items.map((item): GraphRailEntry => item.kind === 'note'
      ? { kind: 'note', item }
      : { kind: 'expression', item, itemId: item.itemId }),
    ...piecewiseDrafts.filter((draft) => draft.mode === 'create').map((draft) => ({
      kind: 'piecewise-draft' as const, draft,
    })),
    { kind: 'expression', item: null, itemId: controller.blankItemId },
  ], [controller.blankItemId, controller.session.document.items, piecewiseDrafts]);
  const scene = useMemo(() => {
    const sampled = controller.sampleResult?.scene ?? null;
    if (!sampled || controller.suppressedPiecewiseItems.size === 0) return sampled;
    const visible = (itemId: string | undefined) => !itemId || !controller.suppressedPiecewiseItems.has(itemId);
    return {
      ...sampled,
      paths: sampled.paths.filter((path) => visible(path.itemId)),
      regions: sampled.regions.filter((region) => visible(region.itemId)),
      pointBatches: sampled.pointBatches.filter((batch) => visible(batch.itemId)),
      labels: sampled.labels.filter((label) => visible(label.itemId)),
    };
  }, [controller.sampleResult, controller.suppressedPiecewiseItems]);
  const visibleCount = controller.session.document.items.filter((item) => item.kind !== 'note' && item.visible).length;
  const presentation = useMemo(() => ({
    version: 2 as const,
    contentRevision: controller.session.document.contentRevision,
    theme: controller.session.surface.appearance.theme,
    colorVisionMode: controller.session.surface.appearance.colorVisionMode,
    items: controller.session.document.items.flatMap((item) => (
      'presentation' in item ? [{ itemId: item.itemId, presentation: item.presentation }] : []
    )),
  }), [
    controller.session.document.contentRevision,
    controller.session.document.items,
    controller.session.surface.appearance,
  ]);
  const runtimeWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    for (const evidence of controller.sampleResult?.itemEvidence ?? []) {
      if (evidence.achievedQuality === 'unresolved') {
        warnings.set(evidence.itemId, 'Could not resolve this item in the current view.');
      } else if (evidence.achievedQuality === 'reduced-detail') {
        warnings.set(evidence.itemId, 'Reduced detail at this zoom.');
      }
      if (!warnings.has(evidence.itemId)
        && evidence.piecewiseCondition?.uncoveredGaps.length) {
        const item = controller.session.document.items.find((candidate) => candidate.itemId === evidence.itemId);
        if (item?.kind === 'piecewise' && !item.piecewise.otherwise) {
          warnings.set(evidence.itemId, 'Piecewise branches leave gaps in the current view; gaps are allowed.');
        }
      }
    }
    for (const reason of controller.sampleResult?.stopReasons ?? []) {
      if (!reason.path || warnings.has(reason.path)) continue;
      if (reason.code === 'region-topology-inconclusive') {
        warnings.set(
          reason.path,
          'Uncertain cells were omitted rather than filling this region as complete.',
        );
      } else if (reason.code === 'sampling-budget-exceeded') {
        if (!warnings.has(reason.path)) warnings.set(reason.path, 'Reduced detail at this zoom.');
      } else if (reason.detailCode?.startsWith('piecewise-overlap:')) {
        const scope = reason.detailCode.includes(':global:') ? 'globally' : 'in the current view';
        warnings.set(reason.path, `Piecewise branches overlap ${scope}; all matching branches are drawn.`);
      } else if (reason.detailCode?.startsWith('piecewise-impossible:')) {
        const scope = reason.detailCode.includes('impossible-global') ? 'for every input' : 'in the current view';
        warnings.set(reason.path, `One piecewise branch cannot apply ${scope}.`);
      } else if (reason.detailCode?.startsWith('piecewise-unresolved:')
        || reason.detailCode === 'piecewise-boundary-unresolved') {
        warnings.set(reason.path, 'A piecewise condition boundary could not be resolved in this view.');
      }
    }
    return warnings;
  }, [controller.sampleResult, controller.session.document.items]);
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

  useLayoutEffect(() => {
    const itemId = piecewiseFocusItemIdRef.current;
    if (!itemId) return;
    const field = document.querySelector<HTMLElement>(`[data-graph-item-id="${itemId}"] math-field`);
    if (!field) return;
    field.focus({ preventScroll: true });
    piecewiseFocusItemIdRef.current = null;
  }, [controller.session.authoring?.piecewiseDrafts.length]);

  return (
    <article className="app-page graph-page" data-graph-theme={controller.session.surface.appearance.theme}
      data-testid="graph-page">
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
          <GraphThemeControls colorVisionMode={controller.session.surface.appearance.colorVisionMode}
            onChange={controller.updateAppearance} theme={controller.session.surface.appearance.theme} />
          <span className="graph-toolbar-context">Real · {controller.session.surface.panes.real.dimension === '3d'
            ? 'Three interactive' : 'SVG reference'}</span>
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
            {railEntries.map((entry) => {
              if (entry.kind === 'piecewise-draft') {
                const { draft } = entry;
                return <GraphPiecewiseDraftRow
                  draft={draft}
                  key={draft.draftId}
                  onChange={(branchId, field, value) => controller.updatePiecewiseDraft({
                    itemId: draft.itemId, branchId, field, value,
                  })}
                  onDelete={() => controller.removePiecewiseDraft(draft.itemId)}
                  onCommit={() => controller.commitPiecewiseDraft(draft.itemId)}
                  onMutate={(action, branchId) => controller.mutatePiecewiseDraft({ itemId: draft.itemId, action, branchId })}
                />;
              }
              if (entry.kind === 'note') {
                const index = controller.session.document.items.findIndex((item) => item.itemId === entry.item.itemId);
                return <div className="graph-persisted-row" data-testid="graph-persisted-row"
                  key={entry.item.itemId} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                    const dragged = event.dataTransfer.getData('text/x-graph-item-id');
                    if (dragged) controller.reorderItem(dragged, index);
                  }}>
                  {!controller.session.surface.presentationMode ? <GraphRowOrderControls index={index}
                    itemCount={controller.session.document.items.length} itemId={entry.item.itemId}
                    onMove={controller.reorderItem} /> : <div aria-hidden="true" className="graph-row-order-placeholder" />}
                  <GraphNoteRow item={entry.item}
                    onChange={(text) => controller.updateNote(entry.item.itemId, text)}
                    onDelete={() => controller.removeItem(entry.item.itemId)}
                    readOnly={controller.session.surface.presentationMode} />
                </div>;
              }
              const { item, itemId } = entry;
              return (
                <GraphExpressionRow
                  appearance={controller.session.surface.appearance}
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
                  onBeginPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => { controller.beginPiecewiseDraft(itemId); }
                    : undefined}
                  onCancelPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => controller.removePiecewiseDraft(itemId)
                    : undefined}
                  onChangePiecewiseDraft={item?.kind === 'piecewise'
                    ? (branchId, field, value) => { controller.updatePiecewiseDraft({ itemId, branchId, field, value }); }
                    : undefined}
                  onCommitPiecewiseDraft={item?.kind === 'piecewise'
                    ? () => controller.commitPiecewiseDraft(itemId)
                    : undefined}
                  onMutatePiecewiseDraft={item?.kind === 'piecewise'
                    ? (action, branchId) => controller.mutatePiecewiseDraft({ itemId, action, branchId })
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
                  onUpdatePresentation={item && 'presentation' in item
                    ? (presentation) => { controller.updatePresentation(itemId, presentation); }
                    : undefined}
                  onUpdateParameter={item?.kind === 'parameter'
                    ? (values) => controller.updateParameter(itemId, values)
                    : undefined}
                  runtimeWarning={item ? runtimeWarnings.get(itemId) : undefined}
                  samplingBusy={controller.status.kind === 'sampling' || controller.status.kind === 'editing'}
                  piecewiseDraft={piecewiseDraftsByItem.get(itemId)}
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
            <div className="graph-add-item">
              <button aria-expanded={addItemOpen} className="graph-add-point-button"
                onClick={() => setAddItemOpen((open) => !open)} type="button">+ Add item</button>
              {addItemOpen ? <div className="graph-add-item-menu" role="menu">
                <button onClick={() => {
                  const itemId = controller.addNote();
                  setAddItemOpen(false);
                  requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(
                    `[data-graph-item-id="${itemId}"] textarea`,
                  )?.focus({ preventScroll: true }));
                }} role="menuitem" type="button">Note</button>
                <button onClick={() => {
                  const itemId = controller.createPiecewiseDraft();
                  piecewiseFocusItemIdRef.current = itemId;
                  setAddItemOpen(false);
                  setTimeout(() => document.querySelector<HTMLElement>(
                    `[data-graph-item-id="${itemId}"] math-field`,
                  )?.focus({ preventScroll: true }), 0);
                }} role="menuitem" type="button">Piecewise Function</button>
                <button onClick={() => {
                  const itemId = controller.addPointSet(); setAddItemOpen(false);
                  requestAnimationFrame(() => document.querySelector<HTMLElement>(
                    `[data-graph-item-id="${itemId}"] math-field`,
                  )?.focus({ preventScroll: true }));
                }} role="menuitem" type="button">Point Set</button>
              </div> : null}
            </div>
            <span>Bare x-based expressions plot directly. You do not need to type y =.</span>
          </div>
        </aside>

        <section className="graph-viewport-panel" aria-label="Graph viewport">
          <GraphViewportHost
            grid={controller.session.surface.grid}
            onPaneViewChange={(values) => controller.updatePaneView('real', values)}
            onSelectItem={controller.selectItem}
            onSizeChange={setViewportSize}
            onViewportChange={controller.setViewport}
            itemRoutes={itemRoutes}
            paneView={controller.session.surface.panes.real}
            pending={controller.isScenePending || controller.suppressedPiecewiseItems.size > 0}
            presentation={presentation}
            scene={scene}
            sceneViewport={controller.sampleResult?.viewport ?? null}
            selectedItemId={controller.session.surface.selectedItemId}
            viewport={controller.session.surface.viewport}
          />
          {controller.status.kind === 'sampling' || controller.suppressedPiecewiseItems.size > 0 ? (
            <span className="graph-pending-badge">{controller.suppressedPiecewiseItems.size > 0
              ? 'Complete piecewise branches' : 'Updating'}</span>
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
        <span>{controller.session.surface.panes.real.dimension === '3d'
          ? 'MMB pan · Alt+LMB orbit · wheel zoom · F focus · Home reset'
          : 'Click to trace · move to sweep · scroll to zoom · drag to pan'}</span>
      </footer>
    </article>
  );
}
