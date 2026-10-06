import { useRef, useState, type CSSProperties } from 'react';
import { GRAPH_RAIL_MAX_WIDTH, GRAPH_RAIL_MIN_WIDTH } from '../../lib/graphing';
import { GraphPaneResizer } from './GraphPaneResizer';
import { useWindowSizeClass } from './graph-size-class';
import type { useGraphWorkspaceController } from './useGraphWorkspaceController';

// The Graph workbench layout (GRAPHING-UI1), by window size class: from
// expanded (840 CSS px) up the expression list is docked beside the graph and
// can be dragged wider; below that it is a drawer over the graph that starts
// closed. The Both view is side by side from medium (600 px) up and stacked,
// Real above Complex, when compact. The list width and both splits are
// remembered in the graph session.

export const GRAPH_RAIL_DEFAULT_WIDTH = 332;
const WORKBENCH_PADDING = 12;
const PANEL_PADDING = 8;
const DIVIDER_SIZE = 10;

type Controller = ReturnType<typeof useGraphWorkspaceController>;

const splitVariables = (prefix: 'both' | 'stack', split: number) => ({
  [`--graph-${prefix}-real`]: `${split}fr`,
  [`--graph-${prefix}-complex`]: `${1 - split}fr`,
}) as Record<string, string>;

/** The Real pane's share for a pointer offset along the panel, kept between a quarter and three quarters. */
const splitAt = (offset: number, size: number) => Math.round(1000 * Math.min(0.75, Math.max(0.25,
  (offset - PANEL_PADDING - DIVIDER_SIZE / 2) / Math.max(1, size - 2 * PANEL_PADDING - DIVIDER_SIZE)))) / 1000;

export function useGraphWorkbenchLayout(controller: Controller) {
  const { surface } = controller.session;
  const sizeClass = useWindowSizeClass();
  const narrow = sizeClass === 'compact' || sizeClass === 'medium';
  const stacked = sizeClass === 'compact';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const workbenchRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const railWidth = surface.layout?.railWidth ?? GRAPH_RAIL_DEFAULT_WIDTH;
  const bothSplit = surface.layout?.bothSplit ?? 0.5;
  const stackSplit = surface.layout?.bothStackSplit ?? 0.5;
  const railCollapsed = narrow ? !drawerOpen : surface.expressionRailCollapsed;
  const previewSplit = (prefix: 'both' | 'stack') => (split: number) => {
    for (const [name, value] of Object.entries(splitVariables(prefix, split))) panelRef.current?.style.setProperty(name, value);
  };

  const railResizer = railCollapsed || narrow ? null : <GraphPaneResizer
    commit={(width) => controller.updateLayout({ railWidth: width })}
    containerRef={workbenchRef}
    defaultValue={GRAPH_RAIL_DEFAULT_WIDTH}
    label="Resize expression list"
    preview={(width) => workbenchRef.current?.style.setProperty('--graph-rail-width', `${width}px`)}
    toValue={(offset, width) => Math.round(Math.min(GRAPH_RAIL_MAX_WIDTH, (width - 2 * WORKBENCH_PADDING) / 2,
      Math.max(GRAPH_RAIL_MIN_WIDTH, offset - WORKBENCH_PADDING - WORKBENCH_PADDING / 2)))}
    value={railWidth}
    valueText={`${railWidth} pixels`}
  />;

  const bothDivider = surface.viewPolicy.mode !== 'both' ? null : stacked ? <GraphPaneResizer
    commit={(split) => controller.updateLayout({ bothStackSplit: split })}
    containerRef={panelRef}
    defaultValue={0.5}
    label="Resize Real and Complex panes"
    orientation="horizontal"
    preview={previewSplit('stack')}
    toValue={splitAt}
    value={stackSplit}
    valueText={`Real ${Math.round(stackSplit * 100)} percent`}
  /> : <GraphPaneResizer
    commit={(split) => controller.updateLayout({ bothSplit: split })}
    containerRef={panelRef}
    defaultValue={0.5}
    label="Resize Real and Complex panes"
    preview={previewSplit('both')}
    toValue={splitAt}
    value={bothSplit}
    valueText={`Real ${Math.round(bothSplit * 100)} percent`}
  />;

  return {
    bothDivider,
    panelRef,
    panelClassName: stacked ? ' is-stacked' : '',
    panelStyle: { ...splitVariables('both', bothSplit), ...splitVariables('stack', stackSplit) } as CSSProperties,
    railCollapsed,
    railResizer,
    sizeClass,
    toggleRail: narrow ? () => setDrawerOpen((open) => !open) : controller.toggleRail,
    workbenchClassName: `graph-workbench${railCollapsed ? ' is-rail-collapsed' : ''}${narrow ? ' is-rail-drawer' : ''}${
      !narrow && railWidth < 300 ? ' is-rail-narrow' : ''}`,
    workbenchRef,
    workbenchStyle: { '--graph-rail-width': `${railWidth}px` } as CSSProperties,
  };
}
