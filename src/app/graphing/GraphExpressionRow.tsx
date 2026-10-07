import { type CSSProperties, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Eye, EyeOff, Info, Trash2 } from 'lucide-react';
import { MathEditor } from '../../components/MathEditor';
import {
  graphPiecewiseBranchKeys,
  graphPiecewiseBranchPresentation,
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphAppearanceThemeV1,
  type GraphItemPresentationV2,
  type GraphItemSpecV1,
  type GraphPiecewiseConditionEvidenceV1,
  type GraphViewportV1,
} from '../../lib/graphing';
import type { GraphPiecewiseAuthoringDraftV1 } from './graph-workspace-session';
import { graphDraftMessage, graphItemSourceLatex, graphPiecewiseUsesBranchEditor } from './graph-document';
import { GraphStylePopover } from './GraphAppearanceControls';
import { GraphSurfaceBoundsEditor } from './GraphSurfaceBoundsEditor';
import { GraphItemDetails } from './GraphItemDetails';
import { GraphParameterControls } from './GraphParameterControls';
import { GraphPiecewiseEditor } from './GraphPiecewiseEditor';
import { graphItemDisplayOptions } from './graph-item-routes';
import { graphPiecewiseGapText } from './graph-piecewise-coverage';
import type { GraphPiecewiseDraftAction } from './useGraphPiecewiseDrafts';

// One row of the expression list: the colour swatch (and style popover), the
// formula, its actions, and per kind its sliders, surface bounds or piecewise
// branch editor.

/** Back to the start of a long formula: the row's scroller, and MathLive's own content, which follows the caret. */
function scrollFormulaToStart(container: HTMLElement | null) {
  if (!container) return;
  container.scrollLeft = 0;
  const content = container.querySelector('math-field')?.shadowRoot?.querySelector<HTMLElement>('.ML__content');
  if (content) content.scrollLeft = 0;
}

export type GraphExpressionRowProps = {
  item: GraphItemSpecV1 | null;
  itemId: string;
  errorVisible: boolean;
  onBlur: () => void;
  onChange: (latex: string) => void;
  onDelete?: () => void;
  runtimeWarning?: string;
  onSubmit: () => void;
  onToggle?: () => void;
  onToggleComplexValues?: () => void;
  onUpdatePresentation?: (presentation: GraphItemPresentationV2) => void;
  viewport: GraphViewportV1;
  onUpdateSurfaceBounds?: (bounds?: { xMin: number; xMax: number; yMin: number; yMax: number }) => boolean;
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
  onMutatePiecewiseDraft?: (edit: GraphPiecewiseDraftAction) => void;
  onUpdateBranchPresentation?: (branchKey: string, presentation: GraphItemPresentationV2 | null) => void;
  /** The piecewise item's condition evidence from the latest sample (coverage strip and gap note). */
  piecewiseEvidence?: GraphPiecewiseConditionEvidenceV1 | null;
};



export function GraphExpressionRow({
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
  onToggleComplexValues,
  onUpdatePresentation,
  onUpdateBranchPresentation,
  onUpdateParameter,
  runtimeWarning,
  piecewiseDraft,
  piecewiseEvidence = null,
  samplingBusy = false,
  appearance,
  viewport,
  onUpdateSurfaceBounds,
}: GraphExpressionRowProps) {
  const [piecewiseCollapsed, setPiecewiseCollapsed] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const styleButtonRef = useRef<HTMLButtonElement | null>(null);
  const [surfaceExpanded, setSurfaceExpanded] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  const branchEditable = graphPiecewiseUsesBranchEditor(item);
  const displayOptions = graphItemDisplayOptions(item);
  const details = item && 'presentation' in item && (displayOptions.asymptotes || displayOptions.complexValues) ? <GraphItemDetails
    complexValues={item.kind === 'relation' && item.relation.kind === 'explicit-y' && item.relation.complexValues === true}
    onToggleComplexValues={onToggleComplexValues} onUpdatePresentation={onUpdatePresentation} options={displayOptions}
    presentation={normalizeGraphItemPresentation(item.presentation)} /> : null;
  const piecewiseEditorOpen = branchEditable
    && Boolean(piecewiseDraft)
    && !piecewiseCollapsed;
  // The read-only summary above an open editor starts at its beginning.
  useLayoutEffect(() => {
    if (piecewiseEditorOpen) scrollFormulaToStart(editorScrollRef.current);
  }, [piecewiseEditorOpen]);
  // A piecewise swatch shows every branch's colour; gaps get a note (not a warning) with a way to fill them.
  const branchSwatch = item?.kind === 'piecewise' ? graphPiecewiseBranchKeys(item.piecewise)
    .map((key) => resolveGraphPresentationColor(graphPiecewiseBranchPresentation(item, key), appearance.colorVisionMode)) : null;
  // A restriction such as x^2{x>0} has gaps by design: only several branches get the note.
  const gapText = item?.kind === 'piecewise' && !item.piecewise.otherwise && item.piecewise.branches.length > 1 && piecewiseEvidence
    ? graphPiecewiseGapText(piecewiseEvidence) : null;
  const addOtherwise = () => {
    if (!piecewiseDraft) onBeginPiecewiseDraft?.();
    setPiecewiseCollapsed(false);
    requestAnimationFrame(() => requestAnimationFrame(() => document
      .querySelector<HTMLElement>(`[data-graph-item-id="${itemId}"] [data-testid="graph-piecewise-otherwise"] math-field`)?.focus()));
  };

  return (
    <div
      className={`graph-expression-row${item ? '' : ' is-blank'}${hidden ? ' is-hidden' : ''}${branchEditable ? ' is-piecewise' : ''}`}
      style={{ '--graph-item-color': color, ...(branchSwatch && branchSwatch.length > 1 ? {
        '--graph-item-swatch': `conic-gradient(${branchSwatch.map((branchColor, index) => (
          `${branchColor} ${(index / branchSwatch.length) * 360}deg ${((index + 1) / branchSwatch.length) * 360}deg`)).join(', ')})`,
      } : {}) } as CSSProperties}
      data-color-token={colorToken}
      data-graph-item-id={itemId}
      data-piecewise-state={branchEditable ? (piecewiseEditorOpen ? 'expanded' : 'summary') : undefined}
      data-testid={item ? 'graph-expression-row' : 'graph-expression-blank-row'}
    >
      {item && 'presentation' in item ? <button aria-expanded={styleOpen}
        aria-label="Style graph item" className="graph-expression-color" onClick={() => setStyleOpen((open) => !open)}
        ref={styleButtonRef} type="button" /> : <span className="graph-expression-color" aria-hidden="true" />}
      {styleOpen && item && 'presentation' in item && onUpdatePresentation ? <GraphStylePopover
        colorVisionMode={appearance.colorVisionMode} onClose={() => setStyleOpen(false)}
        onUpdate={onUpdatePresentation} presentation={normalizeGraphItemPresentation(item.presentation)}
        theme={appearance.theme} triggerRef={styleButtonRef} /> : null}
      {item?.kind === 'parameter' && item.parameter.origin === 'slider-created' ? (
        <strong className="graph-parameter-symbol" aria-label={`Parameter ${item.parameter.symbol}`}>
          {item.parameter.symbol}
        </strong>
      ) : (
        <div
          className={`graph-expression-editor-scroll${branchEditable ? ' graph-piecewise-summary' : ''}${editorOverflowing ? ' is-overflowing' : ''}`}
          data-overflowing={editorOverflowing ? 'true' : 'false'}
          data-testid={branchEditable ? 'graph-piecewise-summary' : undefined}
          ref={editorScrollRef}
        >
          <MathEditor
            className={`graph-expression-editor${branchEditable ? ' graph-piecewise-summary-editor' : ''}`}
            dataTestId={`graph-expression-editor-${itemId}`}
            // Show the start of a long formula once editing ends.
            onBlur={() => { scrollFormulaToStart(editorScrollRef.current); onBlur(); }}
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
          {branchEditable ? (
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
          {item.kind === 'relation' && item.relation.kind === 'real-surface' ? <button
            aria-expanded={surfaceExpanded} aria-label={surfaceExpanded ? 'Collapse surface bounds' : 'Expand surface bounds'}
            className="graph-icon-button" onClick={() => setSurfaceExpanded((open) => !open)} type="button">
            {surfaceExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button> : null}
          {/* Display choices (asymptotes, ℂ) live behind this expander; piecewise and surface rows use theirs. */}
          {details ? <button aria-expanded={detailsOpen}
            aria-label={detailsOpen ? 'Hide item options' : 'Show item options'} className="graph-icon-button"
            onClick={() => setDetailsOpen((open) => !open)} type="button">
            {detailsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button> : null}
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
      {gapText && !runtimeWarning ? (
        <p className="graph-expression-note" data-testid="graph-piecewise-gap-note" role="status">
          <Info aria-hidden="true" size={14} />
          <span>{gapText}</span>
          {branchEditable && onBeginPiecewiseDraft ? <button onClick={addOtherwise} type="button">Add otherwise</button> : null}
        </p>
      ) : null}
      {branchEditable && item?.kind === 'piecewise' && piecewiseDraft && !piecewiseCollapsed && onChangePiecewiseDraft
        && onCommitPiecewiseDraft && onMutatePiecewiseDraft ? (
          <div className="graph-piecewise-expanded-editor" id={`graph-piecewise-editor-${itemId}`}>
            <GraphPiecewiseEditor appearance={appearance} draft={piecewiseDraft} embedded evidence={piecewiseEvidence} item={item}
              onBranchStyle={onUpdateBranchPresentation} onChange={onChangePiecewiseDraft}
              onCommit={onCommitPiecewiseDraft} onDelete={() => {
                onCancelPiecewiseDraft?.();
                setPiecewiseCollapsed(true);
              }} onMutate={onMutatePiecewiseDraft} />
          </div>
        ) : null}
      {detailsOpen ? details : null}
      {item?.kind === 'parameter' && onUpdateParameter && onSettleParameter ? (
        <GraphParameterControls
          item={item}
          onSettle={onSettleParameter}
          onUpdate={onUpdateParameter}
          samplingBusy={samplingBusy}
        />
      ) : null}
      {item?.kind === 'relation' && item.relation.kind === 'real-surface' && surfaceExpanded && onUpdateSurfaceBounds
        ? <GraphSurfaceBoundsEditor bounds={item.relation.bounds} onChange={onUpdateSurfaceBounds} viewport={viewport} /> : null}
    </div>
  );
}

