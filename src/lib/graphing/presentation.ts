import type {
  GraphAppearanceThemeV1,
  GraphItemPresentation,
  GraphItemPresentationV2,
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

export function graphThemeLabel(theme: GraphAppearanceThemeV1) {
  return theme[0].toUpperCase() + theme.slice(1);
}
