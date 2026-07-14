import type {
  NotebookHeaderFooterSettings,
  NotebookImagePlacement,
  NotebookPageMarginsPt,
  NotebookPageOrientation,
  NotebookPageSetup,
  NotebookPaperSize,
} from './types';

export const NOTEBOOK_MIN_WRAPPED_TEXT_COLUMN_PT = 180;
export const NOTEBOOK_IMAGE_WRAP_GAP_PT = 12;
export const NOTEBOOK_MIN_RENDERED_TEXT_COLUMN_PX = 240;
export const NOTEBOOK_IMAGE_WRAP_GAP_PX = 18;

export const NOTEBOOK_PAPER_DIMENSIONS_PT: Record<NotebookPaperSize, {
  width: number;
  height: number;
}> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
};

export const NOTEBOOK_MARGIN_PRESETS_PT = {
  normal: { top: 72, right: 72, bottom: 72, left: 72 },
  narrow: { top: 36, right: 36, bottom: 36, left: 36 },
  moderate: { top: 72, right: 54, bottom: 72, left: 54 },
  wide: { top: 72, right: 144, bottom: 72, left: 144 },
} as const satisfies Record<string, NotebookPageMarginsPt>;

export type NotebookMarginPreset = keyof typeof NOTEBOOK_MARGIN_PRESETS_PT;

export const DEFAULT_NOTEBOOK_PAGE_SETUP: NotebookPageSetup = {
  paperSize: 'a4',
  orientation: 'portrait',
  marginsPt: { ...NOTEBOOK_MARGIN_PRESETS_PT.normal },
};

export const DEFAULT_NOTEBOOK_HEADER_FOOTER: NotebookHeaderFooterSettings = {
  headerText: '',
  footerText: '',
  differentFirstPage: false,
  pageNumbering: {
    enabled: false,
    position: 'center',
    startAt: 1,
  },
};

export function notebookPageDimensionsPt(
  paperSize: NotebookPaperSize,
  orientation: NotebookPageOrientation,
) {
  const dimensions = NOTEBOOK_PAPER_DIMENSIONS_PT[paperSize];
  return orientation === 'portrait'
    ? dimensions
    : { width: dimensions.height, height: dimensions.width };
}

export function notebookPageGeometry(setup: NotebookPageSetup) {
  const dimensions = notebookPageDimensionsPt(setup.paperSize, setup.orientation);
  return {
    ...dimensions,
    usableWidth: dimensions.width - setup.marginsPt.left - setup.marginsPt.right,
    usableHeight: dimensions.height - setup.marginsPt.top - setup.marginsPt.bottom,
  };
}

export function notebookMarginPreset(
  margins: NotebookPageMarginsPt,
): NotebookMarginPreset | 'custom' {
  const preset = Object.entries(NOTEBOOK_MARGIN_PRESETS_PT).find(([, value]) =>
    value.top === margins.top
    && value.right === margins.right
    && value.bottom === margins.bottom
    && value.left === margins.left);
  return preset?.[0] as NotebookMarginPreset | undefined ?? 'custom';
}

export function notebookEffectiveImagePlacement(
  setup: NotebookPageSetup,
  placement: NotebookImagePlacement = 'normal',
  widthPercent = 100,
  renderedContentWidthPx?: number,
): NotebookImagePlacement {
  if (placement !== 'square-left' && placement !== 'square-right') {
    return placement;
  }
  const { usableWidth } = notebookPageGeometry(setup);
  const clampedWidth = Math.max(10, Math.min(100, widthPercent));
  const remainingTextWidth = usableWidth * (1 - clampedWidth / 100)
    - NOTEBOOK_IMAGE_WRAP_GAP_PT;
  if (remainingTextWidth < NOTEBOOK_MIN_WRAPPED_TEXT_COLUMN_PT) return 'normal';
  if (renderedContentWidthPx !== undefined) {
    const renderedTextWidth = renderedContentWidthPx * (1 - clampedWidth / 100)
      - NOTEBOOK_IMAGE_WRAP_GAP_PX;
    if (renderedTextWidth < NOTEBOOK_MIN_RENDERED_TEXT_COLUMN_PX) return 'normal';
  }
  return placement;
}
