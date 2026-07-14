import type { NotebookSemanticKind } from './types';

export const NOTEBOOK_SEMANTIC_KINDS: readonly NotebookSemanticKind[] = [
  'theorem',
  'definition',
  'lemma',
  'corollary',
  'proof',
  'example',
  'solution',
  'exercise',
  'hint',
  'answer',
  'note',
  'warning',
];

export const NOTEBOOK_ACCENT_PRESETS = [
  { id: 'olive', label: 'Olive', color: '#b8d49c' },
  { id: 'blue', label: 'Blue', color: '#84bfe8' },
  { id: 'violet', label: 'Violet', color: '#b8a0e6' },
  { id: 'amber', label: 'Amber', color: '#d3ad63' },
  { id: 'coral', label: 'Coral', color: '#e8997c' },
  { id: 'teal', label: 'Teal', color: '#75c7bc' },
] as const;

export const NOTEBOOK_STRUCTURED_SURFACE_COLOR = '#101b1b';

export function isNotebookAccentColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeNotebookAccentColor(value: string) {
  const normalized = value.trim().toLowerCase();
  return isNotebookAccentColor(normalized) ? normalized : null;
}

export function notebookSemanticIsCollapsible(
  kind: NotebookSemanticKind,
  override?: boolean | null,
) {
  return typeof override === 'boolean'
    ? override
    : kind === 'hint' || kind === 'answer';
}

export function notebookSectionIsCollapsible(override?: boolean | null) {
  return typeof override === 'boolean' ? override : true;
}

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string) {
  const normalized = normalizeNotebookAccentColor(color);
  if (!normalized) {
    return null;
  }
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  return 0.2126 * channelLuminance(red)
    + 0.7152 * channelLuminance(green)
    + 0.0722 * channelLuminance(blue);
}

export function notebookAccentContrastRatio(
  accentColor: string,
  surfaceColor = NOTEBOOK_STRUCTURED_SURFACE_COLOR,
) {
  const accent = relativeLuminance(accentColor);
  const surface = relativeLuminance(surfaceColor);
  if (accent == null || surface == null) {
    return 0;
  }
  const lighter = Math.max(accent, surface);
  const darker = Math.min(accent, surface);
  return (lighter + 0.05) / (darker + 0.05);
}
