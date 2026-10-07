import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { GripVertical, MoreVertical, Trash2 } from 'lucide-react';
import { MathEditor } from '../../components/MathEditor';
import { useLightDismiss } from '../../components/useLightDismiss';
import {
  defaultGraphItemPresentation,
  GRAPH_PIECEWISE_OTHERWISE_KEY,
  graphBranchPresentationAt,
  resolveGraphPresentationColor,
  type GraphAppearanceThemeV1,
  type GraphItemPresentationV2,
  type GraphItemSpecV1,
  type GraphPiecewiseConditionEvidenceV1,
} from '../../lib/graphing';
import { GraphStylePopover } from './GraphAppearanceControls';
import { GraphPiecewiseCoverageStrip } from './GraphPiecewiseCoverageStrip';
import {
  buildGraphPiecewiseItemFromAuthoringDraft,
  graphPiecewiseDraftBranchFeedback,
  graphPiecewiseDraftFromItem,
} from './graph-document';
import { graphMenuKeyDown } from './graph-menu-keys';
import type { GraphPiecewiseAuthoringDraftV1 } from './graph-workspace-session';
import { GRAPH_PIECEWISE_DRAFT_OTHERWISE, type GraphPiecewiseDraftAction } from './useGraphPiecewiseDrafts';

// The piecewise branch editor (GRAPHING-PIECEWISE2), laid out as the function
// is written by hand: one brace over every branch, the value, then "if" and
// its condition, an otherwise row last. Each branch has its own colour, a drag
// handle (Alt + ↑/↓ from the keyboard) and a menu. The first matching branch
// is drawn, so order matters.

type PiecewiseItem = Extract<GraphItemSpecV1, { kind: 'piecewise' }>;

export type GraphPiecewiseEditorProps = {
  appearance: { theme: GraphAppearanceThemeV1; colorVisionMode: 'standard' | 'color-vision-friendly' };
  draft: GraphPiecewiseAuthoringDraftV1;
  embedded?: boolean;
  evidence?: GraphPiecewiseConditionEvidenceV1 | null;
  item?: PiecewiseItem | null;
  onBranchStyle?: (branchKey: string, presentation: GraphItemPresentationV2 | null) => void;
  onChange: (branchId: string, field: 'valueLatex' | 'conditionLatex', value: string) => void;
  onCommit: () => boolean;
  onDelete: () => void;
  onMutate: (edit: GraphPiecewiseDraftAction) => void;
};

function GraphEditorMenu({ children, label, trigger }: {
  children: (close: () => void) => ReactNode;
  label: string;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const layerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const triggerRefs = useMemo(() => [triggerRef], []);
  useLightDismiss({ open, onClose: () => setOpen(false), layerRef, triggerRefs });
  const close = () => setOpen(false);
  return <div className="graph-piecewise-menu-host">
    <button aria-expanded={open} aria-haspopup="menu" aria-label={label} className="graph-piecewise-menu-button"
      onClick={() => setOpen((value) => !value)} ref={triggerRef} type="button">{trigger}</button>
    {open ? <div className="graph-piecewise-menu" onKeyDown={graphMenuKeyDown(close)} ref={layerRef} role="menu">
      {children(close)}
    </div> : null}
  </div>;
}

export function GraphPiecewiseEditor({
  appearance, draft, embedded = false, evidence = null, item = null, onBranchStyle, onChange, onCommit, onDelete, onMutate,
}: GraphPiecewiseEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const styleTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [styleKey, setStyleKey] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ branchId: string; pointerId: number; toIndex: number } | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { value?: string; condition?: string }>>({});
  const otherwiseLatex = draft.otherwiseLatex ?? '';
  const symbol = draft.target === 'y' ? 'x' : 'y';

  useEffect(() => {
    const timer = setTimeout(() => setFeedback(Object.fromEntries([
      ...draft.branches.map((branch) => [branch.branchId, graphPiecewiseDraftBranchFeedback({
        target: draft.target, valueLatex: branch.valueLatex, conditionLatex: branch.conditionLatex,
      })]),
      [GRAPH_PIECEWISE_DRAFT_OTHERWISE, graphPiecewiseDraftBranchFeedback({ target: draft.target, valueLatex: otherwiseLatex, conditionLatex: '' })],
    ])), 200);
    return () => clearTimeout(timer);
  }, [draft.branches, draft.target, otherwiseLatex]);

  // Apply is offered only when the draft is complete and differs from what is drawn.
  const { valid, dirty } = useMemo(() => {
    const built = buildGraphPiecewiseItemFromAuthoringDraft({
      itemId: draft.itemId, sourceRevision: 1, index: 0, target: draft.target, branches: draft.branches, otherwiseLatex,
    });
    const applied = item ? graphPiecewiseDraftFromItem(item) : null;
    const same = applied !== null && JSON.stringify(applied.branches) === JSON.stringify(draft.branches)
      && (applied.otherwiseLatex ?? '') === otherwiseLatex.trim();
    return { valid: built !== null, dirty: !same };
  }, [draft.branches, draft.itemId, draft.target, item, otherwiseLatex]);

  const basePresentation = item?.presentation ?? defaultGraphItemPresentation(0);
  const styleAt = (key: string, position: number) => graphBranchPresentationAt(basePresentation, item?.branchPresentation?.[key], position);
  const appliedKeys = new Set(item ? [...item.piecewise.branches.map((branch) => branch.branchId),
    ...(item.piecewise.otherwise ? [GRAPH_PIECEWISE_OTHERWISE_KEY] : [])] : []);
  const branchColors = Object.fromEntries([
    ...draft.branches.map((branch, index) => [branch.branchId, resolveGraphPresentationColor(styleAt(branch.branchId, index), appearance.colorVisionMode)]),
    [GRAPH_PIECEWISE_OTHERWISE_KEY, resolveGraphPresentationColor(styleAt(GRAPH_PIECEWISE_OTHERWISE_KEY, draft.branches.length), appearance.colorVisionMode)],
  ]);

  const focusField = (testId: string) => requestAnimationFrame(() => {
    rootRef.current?.querySelector<HTMLElement>(`[data-testid="${testId}"] math-field, math-field[data-testid="${testId}"]`)?.focus();
  });
  const focusBranch = (branchKey: string) => focusField(branchKey === GRAPH_PIECEWISE_OTHERWISE_KEY
    ? 'graph-piecewise-draft-otherwise' : `graph-piecewise-draft-value-${branchKey}`);

  const rowIndexAt = (clientY: number) => {
    const rows = [...(rootRef.current?.querySelectorAll<HTMLElement>('[data-piecewise-branch-row]') ?? [])];
    const index = rows.findIndex((row) => { const box = row.getBoundingClientRect(); return clientY < box.top + box.height / 2; });
    return index < 0 ? rows.length - 1 : index;
  };
  const startDrag = (branchId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ branchId, pointerId: event.pointerId, toIndex: draft.branches.findIndex((branch) => branch.branchId === branchId) });
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const toIndex = rowIndexAt(event.clientY);
    if (toIndex !== drag.toIndex) setDrag({ ...drag, toIndex });
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const from = draft.branches.findIndex((branch) => branch.branchId === drag.branchId);
    if (from >= 0 && drag.toIndex !== from) onMutate({ action: 'move', branchId: drag.branchId, toIndex: drag.toIndex });
    setDrag(null);
  };
  const rowKeyDown = (branchId: string) => (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    onMutate({ action: event.key === 'ArrowUp' ? 'up' : 'down', branchId });
  };

  const swatch = (key: string, name: string) => {
    const color = branchColors[key];
    if (!onBranchStyle || !appliedKeys.has(key)) {
      return <span aria-hidden="true" className="graph-piecewise-swatch is-pending" style={{ '--graph-branch-color': color } as CSSProperties}
        title="Apply the branches to choose this branch's style" />;
    }
    return <button aria-expanded={styleKey === key} aria-label={`Style ${name.toLowerCase()}`} className="graph-piecewise-swatch"
      onClick={(event) => { styleTriggerRef.current = event.currentTarget; setStyleKey((open) => open === key ? null : key); }}
      style={{ '--graph-branch-color': color } as CSSProperties} type="button" />;
  };

  const styleIndex = styleKey === GRAPH_PIECEWISE_OTHERWISE_KEY ? draft.branches.length
    : draft.branches.findIndex((branch) => branch.branchId === styleKey);
  const branchFeedback = (key: string) => feedback[key]?.value ?? feedback[key]?.condition;

  const editor = <div className={`graph-piecewise-editor${drag ? ' is-dragging' : ''}`} data-mode={draft.mode} ref={rootRef}
    role="group" aria-label="Piecewise branches">
    <div className="graph-piecewise-cases">
      <span className="graph-piecewise-lhs">{draft.target} =</span>
      <div className="graph-piecewise-rows">
        {draft.branches.map((branch, index) => {
          const name = `Branch ${index + 1}`;
          const dropBefore = drag && drag.toIndex === index && drag.branchId !== branch.branchId;
          return <div className={`graph-piecewise-branch${drag?.branchId === branch.branchId ? ' is-dragged' : ''}${dropBefore ? ' is-drop-target' : ''}`}
            data-piecewise-branch-row="" data-testid={`graph-piecewise-branch-${index + 1}`} key={branch.branchId}
            onKeyDown={rowKeyDown(branch.branchId)} style={{ '--graph-branch-color': branchColors[branch.branchId] } as CSSProperties}>
            <button aria-label={`Move ${name.toLowerCase()} (drag, or Alt + arrow keys)`} className="graph-piecewise-handle"
              onKeyDown={(event) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                event.preventDefault();
                onMutate({ action: event.key === 'ArrowUp' ? 'up' : 'down', branchId: branch.branchId });
              }}
              onPointerCancel={() => setDrag(null)} onPointerDown={(event) => startDrag(branch.branchId, event)}
              onPointerMove={moveDrag} onPointerUp={endDrag} type="button"><GripVertical aria-hidden="true" size={14} /></button>
            {swatch(branch.branchId, name)}
            <MathEditor className="graph-piecewise-field" dataTestId={`graph-piecewise-draft-value-${branch.branchId}`}
              onChange={(value) => onChange(branch.branchId, 'valueLatex', value)} onSubmit={onCommit} placeholder="value"
              shortcutProfile="graphing" value={branch.valueLatex} />
            <span className="graph-piecewise-if">if</span>
            <MathEditor className="graph-piecewise-field is-condition" dataTestId={`graph-piecewise-draft-condition-${branch.branchId}`}
              onChange={(value) => onChange(branch.branchId, 'conditionLatex', value)} onSubmit={onCommit}
              placeholderLatex={index === 0 ? `${symbol} < 0` : String.raw`${symbol}\geq 0`}
              shortcutProfile="graphing" value={branch.conditionLatex} />
            <GraphEditorMenu label={`${name} options`} trigger={<MoreVertical aria-hidden="true" size={14} />}>
              {(close) => <>
                <button disabled={index === 0} onClick={() => { close(); onMutate({ action: 'up', branchId: branch.branchId }); }} role="menuitem" type="button">Move up</button>
                <button disabled={index === draft.branches.length - 1} onClick={() => { close(); onMutate({ action: 'down', branchId: branch.branchId }); }} role="menuitem" type="button">Move down</button>
                <button onClick={() => { close(); onMutate({ action: 'duplicate', branchId: branch.branchId }); }} role="menuitem" type="button">Duplicate</button>
                {onBranchStyle && item?.branchPresentation?.[branch.branchId]
                  ? <button onClick={() => { close(); onBranchStyle(branch.branchId, null); }} role="menuitem" type="button">Default colour</button> : null}
                <button disabled={draft.branches.length <= 1} onClick={() => { close(); onMutate({ action: 'remove', branchId: branch.branchId }); }} role="menuitem" type="button">Remove {name.toLowerCase()}</button>
              </>}
            </GraphEditorMenu>
            {branchFeedback(branch.branchId) ? <p className="graph-piecewise-branch-feedback" role="status">{branchFeedback(branch.branchId)}</p> : null}
          </div>;
        })}
        <div className={`graph-piecewise-branch is-otherwise${otherwiseLatex.trim() ? '' : ' is-empty'}`} data-testid="graph-piecewise-otherwise"
          style={{ '--graph-branch-color': branchColors[GRAPH_PIECEWISE_OTHERWISE_KEY] } as CSSProperties}>
          <span aria-hidden="true" className="graph-piecewise-handle-space" />
          {swatch(GRAPH_PIECEWISE_OTHERWISE_KEY, 'Otherwise')}
          <MathEditor className="graph-piecewise-field" dataTestId="graph-piecewise-draft-otherwise"
            onChange={(value) => onChange(GRAPH_PIECEWISE_DRAFT_OTHERWISE, 'valueLatex', value)} onSubmit={onCommit}
            placeholder="otherwise… (optional)" shortcutProfile="graphing" value={otherwiseLatex} />
          <span className="graph-piecewise-if">otherwise</span>
          {otherwiseLatex.trim() ? <button aria-label="Remove otherwise" className="graph-piecewise-menu-button"
            onClick={() => onMutate({ action: 'otherwise-off' })} type="button"><Trash2 aria-hidden="true" size={13} /></button>
            : <span aria-hidden="true" className="graph-piecewise-handle-space" />}
          {branchFeedback(GRAPH_PIECEWISE_DRAFT_OTHERWISE) ? <p className="graph-piecewise-branch-feedback" role="status">
            {branchFeedback(GRAPH_PIECEWISE_DRAFT_OTHERWISE)}</p> : null}
        </div>
      </div>
    </div>
    <div className="graph-piecewise-toolbar">
      <button className="graph-piecewise-add" onClick={() => onMutate({ action: 'add' })} type="button">+ Branch</button>
      <span className="graph-piecewise-toolbar-space" />
      <button className="graph-piecewise-cancel" onClick={onDelete} type="button">
        {draft.mode === 'replace' ? 'Cancel' : 'Discard'}
      </button>
      {draft.mode === 'replace' ? <button className="graph-piecewise-apply" disabled={!valid || !dirty} onClick={onCommit} type="button">
        Apply
      </button> : null}
    </div>
    {evidence ? <GraphPiecewiseCoverageStrip branchColors={branchColors} evidence={evidence}
      hasOtherwise={Boolean(item?.piecewise.otherwise)} onSelectBranch={focusBranch} /> : null}
    <p className="graph-piecewise-draft-note">{draft.mode === 'replace'
      ? 'The first branch whose condition holds is drawn. Apply (or Enter) draws your changes.'
      : 'Fill in the values and conditions; the graph appears once they are complete.'}</p>
    {styleKey && styleIndex >= 0 && onBranchStyle ? <GraphStylePopover colorVisionMode={appearance.colorVisionMode}
      onClose={() => setStyleKey(null)} onReset={() => onBranchStyle(styleKey, null)}
      onUpdate={(presentation) => onBranchStyle(styleKey, presentation)} presentation={styleAt(styleKey, styleIndex)}
      theme={appearance.theme} title={styleKey === GRAPH_PIECEWISE_OTHERWISE_KEY ? 'Otherwise style' : `Branch ${styleIndex + 1} style`}
      triggerRef={styleTriggerRef} /> : null}
  </div>;
  if (embedded) return editor;
  return <div className="graph-expression-row graph-piecewise-draft" data-graph-item-id={draft.itemId}
    data-testid="graph-piecewise-authoring-draft"><span className="graph-expression-color" aria-hidden="true" />{editor}</div>;
}
