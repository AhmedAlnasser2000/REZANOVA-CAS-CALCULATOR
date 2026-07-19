import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Focus,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import { MathEditor } from '../../components/MathEditor';
import type { GraphItemSpecV1 } from '../../lib/graphing';
import type { GraphWorkspaceSessionStateV1 } from './graph-workspace-session';
import graphBrandIcon from '../../../src-tauri/icons/32x32.png';
import {
  graphItemSourceLatex,
  graphDraftMessage,
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
};

function GraphExpressionRow({
  errorVisible,
  item,
  itemId,
  onBlur,
  onChange,
  onDelete,
  onSubmit,
  onToggle,
  runtimeWarning,
}: GraphExpressionRowProps) {
  const draftMessage = item?.kind === 'invalid-relation-draft'
    ? graphDraftMessage(item.parseStop)
    : '';
  const colorToken = item && 'presentation' in item
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
      {item ? (
        <div className="graph-expression-actions">
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
    </div>
  );
}

export default function GraphWorkspacePage({
  onUpdateSession,
  session: initialSession,
  workspaceContext,
}: GraphWorkspacePageProps) {
  const [viewportSize, setViewportSize] = useState({ width: 960, height: 600 });
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
        && (item.relation.kind === 'explicit-y' || item.relation.kind === 'explicit-x')) {
        routes[item.itemId] = item.relation.kind;
      }
    }
    return routes;
  }, [controller.session.document.items]);

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
          <span className="graph-toolbar-context">Real · SVG reference</span>
        </div>

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
                  onSubmit={() => {
                    controller.endTypingTransaction();
                    controller.flushSampling();
                    focusNextRow(itemId);
                  }}
                  onToggle={item ? () => controller.toggleItem(itemId) : undefined}
                  runtimeWarning={item ? runtimeWarnings.get(itemId) : undefined}
                />
              );
            })}
          </div>
          <div className="graph-rail-note">
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
