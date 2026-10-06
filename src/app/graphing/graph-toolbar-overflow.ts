// Which Graph toolbar controls fit (GRAPHING-UI1). Every control's natural
// width is measured once, in a hidden row that always shows everything, so
// what the bar shows never changes what is measured: the level below depends
// only on those widths and the bar's width, and cannot flip back and forth.
//
// Levels hide, in order: the view chip, Theme, Accessible colors, 1:1 and
// Grid & Axes (the last four into the "…" menu), then Auto-Fit and Analyze
// lose their labels, and last (compact windows) Undo and Redo move into "…".

export const GRAPH_TOOLBAR_LEVELS = 7;

export type GraphToolbarWidths = {
  /** Controls that always stay: the list toggle, a separator, the view switch, an auto-switch notice. */
  fixed: number[];
  /** Undo, Redo and the separator after them. */
  history: number[];
  /** The view chip, 0 while an auto-switch notice takes its place. */
  context: number;
  theme: number;
  colors: number;
  equal: number;
  grid: number;
  autofit: number;
  autofitIcon: number;
  analyze: number;
  analyzeIcon: number;
  more: number;
  gap: number;
  padding: number;
};

/** The width the bar needs at a level. */
export function graphToolbarRequiredWidth(widths: GraphToolbarWidths, level: number) {
  const items = [...widths.fixed, ...(level >= 7 ? [] : widths.history),
    level >= 6 ? widths.autofitIcon : widths.autofit,
    level >= 6 ? widths.analyzeIcon : widths.analyze];
  if (level < 1 && widths.context > 0) items.push(widths.context);
  if (level < 2) items.push(widths.theme);
  if (level < 3) items.push(widths.colors);
  if (level < 4) items.push(widths.equal);
  if (level < 5) items.push(widths.grid);
  if (level >= 2) items.push(widths.more);
  return items.reduce((sum, width) => sum + width, 0) + widths.gap * Math.max(0, items.length - 1) + widths.padding;
}

/** The fewest controls hidden so that the bar fits (the last level when nothing fits). */
export function graphToolbarLevel(widths: GraphToolbarWidths, available: number) {
  for (let level = 0; level < GRAPH_TOOLBAR_LEVELS; level += 1) {
    if (graphToolbarRequiredWidth(widths, level) <= available) return level;
  }
  return GRAPH_TOOLBAR_LEVELS;
}
