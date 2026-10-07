import type {
  GraphAppearanceThemeV1,
  GraphItemPresentation,
  GraphItemPresentationV2,
  GraphItemSpecV1,
  GraphPiecewiseSpecV1,
} from './contracts/types';

export const GRAPH_COLOR_TOKENS = [
  'graph-blue',
  'graph-green',
  'graph-violet',
  'graph-orange',
  'graph-cyan',
] as const;

const STANDARD_COLORS: Record<string, string> = {
  'graph-blue': '#5598ff',
  'graph-green': '#59dd88',
  'graph-violet': '#ae68f5',
  'graph-orange': '#ff9b4c',
  'graph-cyan': '#52d4d8',
};

const COLOR_VISION_FRIENDLY_COLORS: Record<string, string> = {
  'graph-blue': '#0072b2',
  'graph-green': '#009e73',
  'graph-violet': '#cc79a7',
  'graph-orange': '#e69f00',
  'graph-cyan': '#56b4e9',
};

export function defaultGraphItemPresentation(index: number): GraphItemPresentationV2 {
  return {
    version: 2,
    color: { kind: 'token', token: GRAPH_COLOR_TOKENS[index % GRAPH_COLOR_TOKENS.length] },
    stroke: 'solid',
    strokeWidth: 'normal',
    strokeOpacity: 1,
    regionOpacity: 0.18,
    halo: 'soft',
    markers: 'semantic',
    label: 'auto',
  };
}

export function normalizeGraphItemPresentation(value: GraphItemPresentation): GraphItemPresentationV2 {
  if (value.version === 2) return value;
  return {
    version: 2,
    color: { kind: 'token', token: value.colorToken },
    stroke: value.stroke,
    strokeWidth: value.strokeWidth,
    strokeOpacity: 1,
    regionOpacity: value.fillOpacity,
    halo: 'soft',
    markers: 'semantic',
    label: value.label,
  };
}

export function resolveGraphPresentationColor(
  presentation: GraphItemPresentation,
  mode: 'standard' | 'color-vision-friendly' = 'standard',
) {
  const normalized = normalizeGraphItemPresentation(presentation);
  if (normalized.color.kind === 'custom') return normalized.color.value;
  const palette = mode === 'color-vision-friendly'
    ? COLOR_VISION_FRIENDLY_COLORS
    : STANDARD_COLORS;
  return palette[normalized.color.token] ?? STANDARD_COLORS['graph-blue'];
}

/** The otherwise branch's key in `branchPresentation` and in scene path IDs. */
export const GRAPH_PIECEWISE_OTHERWISE_KEY = 'otherwise';

/** Branch keys in drawing order: the branches, then otherwise. */
export function graphPiecewiseBranchKeys(piecewise: GraphPiecewiseSpecV1) {
  return [
    ...piecewise.branches.map((branch) => branch.branchId),
    ...(piecewise.otherwise ? [GRAPH_PIECEWISE_OTHERWISE_KEY] : []),
  ];
}

/**
 * The piecewise branch a scene path or endpoint batch belongs to, from its ID
 * (`<item>:branch:<branch>` or `<item>:endpoint:<branch>:open|filled`).
 */
export function graphSceneBranchKey(itemId: string, sceneId: string) {
  const branch = `${itemId}:branch:`;
  if (sceneId.startsWith(branch)) return sceneId.slice(branch.length);
  const endpoint = sceneId.match(/^(.*):endpoint:(.+):(?:open|filled)$/u);
  return endpoint && endpoint[1] === itemId ? endpoint[2] : undefined;
}

/** A branch's name for people: "Branch 2", or "Otherwise". */
export function graphPiecewiseBranchLabel(piecewise: GraphPiecewiseSpecV1, branchKey: string) {
  if (branchKey === GRAPH_PIECEWISE_OTHERWISE_KEY) return 'Otherwise';
  const index = piecewise.branches.findIndex((branch) => branch.branchId === branchKey);
  return index < 0 ? null : `Branch ${index + 1}`;
}

/**
 * A piecewise branch's style: its saved override, or the item's style in the
 * palette colour `position` steps on from the item's own (the first branch
 * keeps the item colour), so branches are told apart by default.
 */
export function graphPiecewiseBranchPresentation(
  item: Extract<GraphItemSpecV1, { kind: 'piecewise' }>,
  branchKey: string,
): GraphItemPresentationV2 {
  return graphBranchPresentationAt(item.presentation, item.branchPresentation?.[branchKey],
    Math.max(0, graphPiecewiseBranchKeys(item.piecewise).indexOf(branchKey)));
}

/** The same rule by position, for branches the editor shows before they are applied. */
export function graphBranchPresentationAt(
  itemPresentation: GraphItemPresentation,
  override: GraphItemPresentationV2 | undefined,
  position: number,
): GraphItemPresentationV2 {
  if (override) return override;
  const base = normalizeGraphItemPresentation(itemPresentation);
  if (position === 0) return base;
  const start = base.color.kind === 'token'
    ? Math.max(0, (GRAPH_COLOR_TOKENS as readonly string[]).indexOf(base.color.token))
    : 0;
  return { ...base, color: { kind: 'token', token: GRAPH_COLOR_TOKENS[(start + position) % GRAPH_COLOR_TOKENS.length] } };
}

/** Renderer frame entries: every styled item, with each piecewise branch's resolved style. */
export function graphPresentationFrameItems(items: readonly { kind: string; itemId: string }[]) {
  return (items as GraphItemSpecV1[]).flatMap((item) => {
    if (!('presentation' in item)) return [];
    if (item.kind !== 'piecewise') return [{ itemId: item.itemId, presentation: item.presentation }];
    const branches = Object.fromEntries(graphPiecewiseBranchKeys(item.piecewise)
      .map((key) => [key, graphPiecewiseBranchPresentation(item, key)]));
    return [{ itemId: item.itemId, presentation: item.presentation, branches }];
  });
}

export function graphThemeLabel(theme: GraphAppearanceThemeV1) {
  return theme[0].toUpperCase() + theme.slice(1);
}
