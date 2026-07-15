import {
  isNotebookDisplayAspectRatio,
  isNotebookFontSize,
  isNotebookImageRotation,
  isNotebookMediaWidthPercent,
  isNotebookParagraphLeftIndentPt,
  NOTEBOOK_BULLET_STYLES,
  NOTEBOOK_IMAGE_ALIGNMENTS,
  NOTEBOOK_IMAGE_PLACEMENTS,
  NOTEBOOK_LINE_SPACINGS,
  NOTEBOOK_ORDERED_STYLES,
  NOTEBOOK_PAGE_NUMBER_POSITIONS,
  NOTEBOOK_PAGE_ORIENTATIONS,
  NOTEBOOK_PAPER_SIZES,
  NOTEBOOK_PARAGRAPH_SPACES_PT,
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  NOTEBOOK_TEXT_ALIGNMENTS,
  NOTEBOOK_VIDEO_TRACK_KINDS,
  type NotebookDocumentSummary,
  type NotebookInlineNode,
  type NotebookParagraphFormat,
  type NotebookPageSetup,
  type NotebookHeaderFooterSettings,
  type NotebookLegacyHeaderFooterSettings,
  type NotebookRunningMatterContent,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
  type NotebookRichDocumentV2,
  type NotebookRichDocumentV3,
  type NotebookRichDocumentV4,
  type NotebookRichDocumentV5,
  type NotebookRichDocumentV6,
  type NotebookRichDocumentV7,
  type NotebookRichDocumentV8,
  type NotebookRichDocumentV9,
  type NotebookRichDocumentV10,
  type NotebookRichDocumentV11,
  type NotebookRichDocumentV12,
  type NotebookRichMark,
} from './types';
import {
  isNotebookObjectPlacement,
  isNotebookObjectPlacementGraphValid,
} from './object-placement';
import {
  DEFAULT_NOTEBOOK_HEADER_FOOTER,
  DEFAULT_NOTEBOOK_PAGE_SETUP,
  notebookPageGeometry,
} from './page-layout';
import {
  isNotebookAccentColor,
  NOTEBOOK_SEMANTIC_KINDS,
  notebookSectionIsCollapsible,
  notebookSemanticIsCollapsible,
} from './structured-blocks';

export type NotebookRichFactoryOptions = {
  idPrefix?: string;
  now?: () => Date;
};

export function createNotebookNodeIdFactory(
  options: NotebookRichFactoryOptions = {},
) {
  let sequence = 0;
  const timestamp = (options.now ?? (() => new Date()))().getTime();
  return (kind: string) => {
    sequence += 1;
    return `${options.idPrefix ?? 'notebook'}.${kind}.${timestamp}.${sequence}`;
  };
}

export function createNotebookRichDocument(
  options: NotebookRichFactoryOptions & { title?: string } = {},
): NotebookRichDocument {
  const now = options.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const nextId = createNotebookNodeIdFactory(options);
  const paragraphId = nextId('paragraph');

  return {
    version: NOTEBOOK_RICH_DOCUMENT_VERSION,
    id: nextId('document'),
    title: options.title ?? 'Untitled Notebook',
    createdAt,
    updatedAt: createdAt,
    selectedNodeId: paragraphId,
    content: [{ type: 'paragraph', id: paragraphId }],
    pageSetup: {
      ...DEFAULT_NOTEBOOK_PAGE_SETUP,
      marginsPt: { ...DEFAULT_NOTEBOOK_PAGE_SETUP.marginsPt },
    },
    headerFooter: {
      ...structuredClone(DEFAULT_NOTEBOOK_HEADER_FOOTER),
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isRichMark(
  value: unknown,
  validateTypography: boolean,
  allowParagraphTools: boolean,
): value is NotebookRichMark {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  if (value.type === 'bold' || value.type === 'italic' || value.type === 'strike') {
    return true;
  }
  if (value.type === 'underline') {
    return allowParagraphTools;
  }
  if (value.type === 'highlight') {
    return value.color === undefined || typeof value.color === 'string';
  }
  if (value.type === 'textStyle') {
    return (value.color === undefined || typeof value.color === 'string')
      && (!validateTypography || value.fontSize === undefined || isNotebookFontSize(value.fontSize));
  }
  return false;
}

function isInlineNode(
  value: unknown,
  validateTypography: boolean,
  allowParagraphTools: boolean,
): value is NotebookInlineNode {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }
  if (value.type === 'text') {
    return typeof value.text === 'string'
      && (value.marks === undefined
        || (Array.isArray(value.marks)
          && value.marks.every((mark) => isRichMark(mark, validateTypography, allowParagraphTools))));
  }
  return value.type === 'inlineMath'
    && typeof value.id === 'string'
    && typeof value.sourceText === 'string'
    && typeof value.latex === 'string'
    && typeof value.workspaceTarget === 'string';
}

function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
  return options.some((option) => option === value);
}

function isParagraphFormat(
  value: unknown,
  allowV10MediaAndIndent: boolean,
): value is NotebookParagraphFormat {
  if (!isRecord(value)) {
    return false;
  }
  if (!Object.keys(value).every((key) => [
    'alignment',
    'lineSpacing',
    'spaceBeforePt',
    'spaceAfterPt',
    ...(allowV10MediaAndIndent ? ['leftIndentPt'] : []),
  ].includes(key))) {
    return false;
  }
  return (value.alignment === undefined || isOneOf(value.alignment, NOTEBOOK_TEXT_ALIGNMENTS))
    && (value.lineSpacing === undefined || isOneOf(value.lineSpacing, NOTEBOOK_LINE_SPACINGS))
    && (value.spaceBeforePt === undefined
      || isOneOf(value.spaceBeforePt, NOTEBOOK_PARAGRAPH_SPACES_PT))
    && (value.spaceAfterPt === undefined
      || isOneOf(value.spaceAfterPt, NOTEBOOK_PARAGRAPH_SPACES_PT))
    && (value.leftIndentPt === undefined
      || (allowV10MediaAndIndent && isNotebookParagraphLeftIndentPt(value.leftIndentPt)));
}

function isPageSetup(value: unknown): value is NotebookPageSetup {
  const margins = isRecord(value) ? value.marginsPt : null;
  if (!isRecord(value)
    || !Object.keys(value).every((key) => ['paperSize', 'orientation', 'marginsPt'].includes(key))
    || !isOneOf(value.paperSize, NOTEBOOK_PAPER_SIZES)
    || !isOneOf(value.orientation, NOTEBOOK_PAGE_ORIENTATIONS)
    || !isRecord(margins)
    || !Object.keys(margins).every((key) => ['top', 'right', 'bottom', 'left'].includes(key))
    || !['top', 'right', 'bottom', 'left'].every((key) => (
      typeof margins[key] === 'number'
      && Number.isFinite(margins[key])
      && Number(margins[key]) >= 0
      && Number(margins[key]) <= 288
    ))) {
    return false;
  }
  const geometry = notebookPageGeometry(value as NotebookPageSetup);
  return geometry.usableWidth >= 72 && geometry.usableHeight >= 72;
}

function isLegacyHeaderFooter(value: unknown): value is NotebookLegacyHeaderFooterSettings {
  if (!isRecord(value)
    || !Object.keys(value).every((key) => [
      'headerText',
      'footerText',
      'differentFirstPage',
      'pageNumbering',
    ].includes(key))
    || typeof value.headerText !== 'string'
    || typeof value.footerText !== 'string'
    || typeof value.differentFirstPage !== 'boolean'
    || !isRecord(value.pageNumbering)
    || !Object.keys(value.pageNumbering).every((key) => [
      'enabled',
      'position',
      'startAt',
    ].includes(key))) {
    return false;
  }
  return typeof value.pageNumbering.enabled === 'boolean'
    && isOneOf(value.pageNumbering.position, NOTEBOOK_PAGE_NUMBER_POSITIONS)
    && Number.isInteger(value.pageNumbering.startAt)
    && Number(value.pageNumbering.startAt) >= 1
    && Number(value.pageNumbering.startAt) <= 9999;
}

function isRunningMatterMark(value: unknown): value is NotebookRichMark {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  if (value.type === 'bold' || value.type === 'italic' || value.type === 'strike'
    || value.type === 'underline') {
    return Object.keys(value).length === 1;
  }
  if (value.type === 'highlight') {
    return Object.keys(value).every((key) => ['type', 'color'].includes(key))
      && (value.color === undefined || typeof value.color === 'string');
  }
  if (value.type === 'textStyle') {
    return Object.keys(value).every((key) => ['type', 'color', 'fontSize'].includes(key))
      && (value.color === undefined || typeof value.color === 'string')
      && (value.fontSize === undefined || isNotebookFontSize(value.fontSize));
  }
  return false;
}

function isRunningMatterContent(value: unknown): value is NotebookRunningMatterContent {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) return false;
  let characters = 0;
  let inlineCount = 0;
  const valid = value.every((paragraph) => {
    if (!isRecord(paragraph)
      || paragraph.type !== 'paragraph'
      || !Object.keys(paragraph).every((key) => ['type', 'content'].includes(key))
      || (paragraph.content !== undefined && !Array.isArray(paragraph.content))) {
      return false;
    }
    return (paragraph.content ?? []).every((inline) => {
      inlineCount += 1;
      if (!isRecord(inline)
        || !Object.keys(inline).every((key) => ['type', 'text', 'marks'].includes(key))
        || (inline.marks !== undefined && (!Array.isArray(inline.marks)
          || !inline.marks.every(isRunningMatterMark)))) {
        return false;
      }
      if (inline.type === 'pageNumber') {
        return inline.text === undefined;
      }
      if (inline.type !== 'text' || typeof inline.text !== 'string') return false;
      characters += inline.text.length;
      return true;
    });
  });
  return valid && characters <= 4096 && inlineCount <= 256;
}

function isRunningMatterRegions(value: unknown) {
  return isRecord(value)
    && Object.keys(value).length === 3
    && Object.keys(value).every((key) => ['left', 'center', 'right'].includes(key))
    && isRunningMatterContent(value.left)
    && isRunningMatterContent(value.center)
    && isRunningMatterContent(value.right);
}

function isHeaderFooter(value: unknown): value is NotebookHeaderFooterSettings {
  return isRecord(value)
    && Object.keys(value).length === 6
    && Object.keys(value).every((key) => [
      'defaultHeader',
      'defaultFooter',
      'firstPageHeader',
      'firstPageFooter',
      'differentFirstPage',
      'pageNumberStart',
    ].includes(key))
    && isRunningMatterRegions(value.defaultHeader)
    && isRunningMatterRegions(value.defaultFooter)
    && isRunningMatterRegions(value.firstPageHeader)
    && isRunningMatterRegions(value.firstPageFooter)
    && typeof value.differentFirstPage === 'boolean'
    && Number.isInteger(value.pageNumberStart)
    && Number(value.pageNumberStart) >= 1
    && Number(value.pageNumberStart) <= 9999;
}

function isRichBlockNode(
  value: unknown,
  allowSection = true,
  validateTypography = true,
  allowParagraphTools = true,
  allowStructuredAppearance = true,
  allowImages = true,
  allowVideos = true,
  allowPageLayout = true,
  allowV10MediaAndIndent = true,
  allowPreciseMediaWidth = false,
  allowObjectPlacement = false,
): value is NotebookRichBlockNode {
  if (!isRecord(value) || typeof value.type !== 'string' || typeof value.id !== 'string') {
    return false;
  }
  if (value.type !== 'paragraph' && value.type !== 'heading' && value.format !== undefined) {
    return false;
  }
  if (value.type !== 'bulletList' && value.type !== 'orderedList' && value.style !== undefined) {
    return false;
  }
  if (value.type !== 'semanticBlock' && value.type !== 'section'
    && (value.accentColor !== undefined || value.collapsible !== undefined)) {
    return false;
  }
  const supportsObjectPlacement = [
    'displayMath',
    'evidenceSnapshot',
    'horizontalRule',
    'imageFigure',
    'videoFigure',
    'semanticBlock',
    'section',
  ].includes(value.type);
  if (value.objectPlacement !== undefined && (
    !allowObjectPlacement
    || !supportsObjectPlacement
    || !isNotebookObjectPlacement(value.objectPlacement)
  )) {
    return false;
  }
  if (value.type === 'section') {
    const appearanceIsValid = (value.accentColor === undefined
      || (allowStructuredAppearance && isNotebookAccentColor(value.accentColor)))
      && (value.collapsible === undefined
        || (allowStructuredAppearance && typeof value.collapsible === 'boolean'));
    const effectiveCollapsible = notebookSectionIsCollapsible(
      typeof value.collapsible === 'boolean' ? value.collapsible : undefined,
    );
    return allowSection
      && typeof value.title === 'string'
      && (value.collapsed === undefined || typeof value.collapsed === 'boolean')
      && appearanceIsValid
      && (!allowStructuredAppearance || value.collapsed !== true || effectiveCollapsible)
      && Array.isArray(value.content)
      && value.content.every((child) => isRichBlockNode(
        child,
        allowSection,
        validateTypography,
        allowParagraphTools,
        allowStructuredAppearance,
        allowImages,
        allowVideos,
        false,
        allowV10MediaAndIndent,
        allowPreciseMediaWidth,
        allowObjectPlacement,
      ));
  }
  if (value.type === 'semanticBlock') {
    const variant = isOneOf(value.variant, NOTEBOOK_SEMANTIC_KINDS)
      ? value.variant
      : null;
    const appearanceIsValid = (value.accentColor === undefined
      || (allowStructuredAppearance && isNotebookAccentColor(value.accentColor)))
      && (value.collapsible === undefined
        || (allowStructuredAppearance && typeof value.collapsible === 'boolean'));
    const effectiveCollapsible = variant != null && notebookSemanticIsCollapsible(
      variant,
      typeof value.collapsible === 'boolean' ? value.collapsible : undefined,
    );
    return variant != null
      && (value.label === undefined || typeof value.label === 'string')
      && (value.number === undefined || typeof value.number === 'string')
      && (value.collapsed === undefined || typeof value.collapsed === 'boolean')
      && appearanceIsValid
      && (!allowStructuredAppearance || value.collapsed !== true || effectiveCollapsible)
      && Array.isArray(value.content)
      && value.content.every((child) => isRichBlockNode(
        child,
        allowSection,
        validateTypography,
        allowParagraphTools,
        allowStructuredAppearance,
        allowImages,
        allowVideos,
        false,
        allowV10MediaAndIndent,
        allowPreciseMediaWidth,
        allowObjectPlacement,
      ));
  }
  if (value.type === 'bulletList' || value.type === 'orderedList') {
    const validStyle = value.style === undefined || (allowParagraphTools && (
      value.type === 'bulletList'
        ? isOneOf(value.style, NOTEBOOK_BULLET_STYLES)
        : isOneOf(value.style, NOTEBOOK_ORDERED_STYLES)
    ));
    return validStyle && Array.isArray(value.content) && value.content.every((item) =>
      isRecord(item)
        && item.type === 'listItem'
        && typeof item.id === 'string'
        && Array.isArray(item.content)
        && item.content.every((child) => isRichBlockNode(
          child,
          allowSection,
          validateTypography,
          allowParagraphTools,
          allowStructuredAppearance,
          allowImages,
          allowVideos,
          false,
          allowV10MediaAndIndent,
          allowPreciseMediaWidth,
          allowObjectPlacement,
        )));
  }
  if (value.type === 'paragraph') {
    return (value.format === undefined || (allowParagraphTools && isParagraphFormat(
      value.format,
      allowV10MediaAndIndent,
    )))
      && (value.content === undefined
        || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(
          node,
          validateTypography,
          allowParagraphTools,
        ))));
  }
  if (value.type === 'heading') {
    return (value.level === 1 || value.level === 2 || value.level === 3)
      && (value.format === undefined || (allowParagraphTools && isParagraphFormat(
        value.format,
        allowV10MediaAndIndent,
      )))
      && (value.content === undefined
        || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(
          node,
          validateTypography,
          allowParagraphTools,
        ))));
  }
  if (value.type === 'imageFigure') {
    if (!allowImages
      || !/^sha256:[0-9a-f]{64}$/.test(String(value.assetId ?? ''))
      || !Object.keys(value).every((key) => [
        'type',
        'id',
        'assetId',
        'altText',
        'decorative',
        'caption',
        'numbered',
        'widthPercent',
        'alignment',
        'placement',
        'rotation',
        'crop',
        ...(allowV10MediaAndIndent ? ['displayAspectRatio'] : []),
        ...(allowObjectPlacement ? ['objectPlacement'] : []),
      ].includes(key))) {
      return false;
    }
    const crop = value.crop;
    const cropIsValid = crop === undefined || (
      isRecord(crop)
      && Object.keys(crop).every((key) => ['x', 'y', 'width', 'height'].includes(key))
      && ['x', 'y', 'width', 'height'].every((key) => (
        typeof crop[key] === 'number' && Number.isFinite(crop[key])
      ))
      && Number(crop.x) >= 0
      && Number(crop.y) >= 0
      && Number(crop.width) > 0
      && Number(crop.height) > 0
      && Number(crop.x) + Number(crop.width) <= 1
      && Number(crop.y) + Number(crop.height) <= 1
    );
    const alignment = value.alignment === undefined
      ? undefined
      : isOneOf(value.alignment, NOTEBOOK_IMAGE_ALIGNMENTS) ? value.alignment : null;
    const placement = value.placement === undefined
      ? undefined
      : isOneOf(value.placement, NOTEBOOK_IMAGE_PLACEMENTS) ? value.placement : null;
    const placementAlignmentIsValid = !(
      (placement === 'square-left' && alignment !== undefined && alignment !== 'left')
      || (placement === 'square-right' && alignment !== undefined && alignment !== 'right')
    );
    return (value.altText === undefined || typeof value.altText === 'string')
      && (value.decorative === undefined || typeof value.decorative === 'boolean')
      && !(value.decorative === true && Boolean(String(value.altText ?? '').trim()))
      && (value.caption === undefined || typeof value.caption === 'string')
      && (value.numbered === undefined || typeof value.numbered === 'boolean')
      && (value.widthPercent === undefined || (allowPreciseMediaWidth
        ? isNotebookMediaWidthPercent(value.widthPercent)
        : Number.isInteger(value.widthPercent)
          && Number(value.widthPercent) >= 10
          && Number(value.widthPercent) <= 100))
      && alignment !== null
      && placement !== null
      && placementAlignmentIsValid
      && (value.displayAspectRatio === undefined
        || (allowV10MediaAndIndent && isNotebookDisplayAspectRatio(value.displayAspectRatio)))
      && (value.rotation === undefined || (allowV10MediaAndIndent
        ? isNotebookImageRotation(value.rotation)
        : value.rotation === 0 || value.rotation === 90
          || value.rotation === 180 || value.rotation === 270))
      && cropIsValid;
  }
  if (value.type === 'videoFigure') {
    if (!allowVideos || !/^sha256:[0-9a-f]{64}$/.test(String(value.assetId ?? ''))
      || typeof value.title !== 'string' || !value.title.trim()
      || typeof value.description !== 'string'
      || !Object.keys(value).every((key) => [
        'type',
        'id',
        'assetId',
        'title',
        'description',
        'caption',
        'numbered',
        'posterAssetId',
        'tracks',
        'widthPercent',
        'alignment',
        ...(allowV10MediaAndIndent ? ['placement', 'displayAspectRatio'] : []),
        'loop',
        ...(allowObjectPlacement ? ['objectPlacement'] : []),
      ].includes(key))) {
      return false;
    }
    const tracks = value.tracks;
    const alignment = value.alignment === undefined
      ? undefined
      : isOneOf(value.alignment, NOTEBOOK_IMAGE_ALIGNMENTS) ? value.alignment : null;
    const placement = value.placement === undefined
      ? undefined
      : isOneOf(value.placement, NOTEBOOK_IMAGE_PLACEMENTS) ? value.placement : null;
    const placementAlignmentIsValid = !(
      (placement === 'square-left' && alignment !== undefined && alignment !== 'left')
      || (placement === 'square-right' && alignment !== undefined && alignment !== 'right')
    );
    const trackIds = new Set<string>();
    const trackAssets = new Set<string>();
    let defaultTracks = 0;
    const tracksAreValid = tracks === undefined || (
      Array.isArray(tracks)
      && tracks.length <= 32
      && tracks.every((track) => {
        if (!isRecord(track)
          || !Object.keys(track).every((key) => [
            'id', 'assetId', 'kind', 'label', 'language', 'default',
          ].includes(key))
          || typeof track.id !== 'string' || !track.id
          || trackIds.has(track.id)
          || !/^sha256:[0-9a-f]{64}$/.test(String(track.assetId ?? ''))
          || trackAssets.has(String(track.assetId))
          || !isOneOf(track.kind, NOTEBOOK_VIDEO_TRACK_KINDS)
          || typeof track.label !== 'string' || !track.label.trim()
          || typeof track.language !== 'string'
          || !/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i.test(track.language)
          || (track.default !== undefined && typeof track.default !== 'boolean')) {
          return false;
        }
        trackIds.add(track.id);
        trackAssets.add(String(track.assetId));
        if (track.default === true) defaultTracks += 1;
        return defaultTracks <= 1;
      })
    );
    return (value.caption === undefined || typeof value.caption === 'string')
      && (value.numbered === undefined || typeof value.numbered === 'boolean')
      && (value.posterAssetId === undefined
        || /^sha256:[0-9a-f]{64}$/.test(String(value.posterAssetId)))
      && (value.widthPercent === undefined || (allowPreciseMediaWidth
        ? isNotebookMediaWidthPercent(value.widthPercent)
        : Number.isInteger(value.widthPercent)
          && Number(value.widthPercent) >= 10
          && Number(value.widthPercent) <= 100))
      && alignment !== null
      && placement !== null
      && placementAlignmentIsValid
      && (value.displayAspectRatio === undefined
        || (allowV10MediaAndIndent && isNotebookDisplayAspectRatio(value.displayAspectRatio)))
      && (value.loop === undefined || typeof value.loop === 'boolean')
      && tracksAreValid;
  }
  if (value.type === 'pageBreak') {
    return allowPageLayout && Object.keys(value).every((key) => ['type', 'id'].includes(key));
  }
  return [
    'displayMath',
    'evidenceSnapshot',
    'horizontalRule',
  ].includes(value.type);
}

export function isNotebookRichDocument(value: unknown): value is NotebookRichDocument {
  return isRecord(value)
    && value.version === NOTEBOOK_RICH_DOCUMENT_VERSION
    && Object.keys(value).every((key) => [
      'version',
      'id',
      'title',
      'createdAt',
      'updatedAt',
      'selectedNodeId',
      'content',
      'pageSetup',
      'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, true, true, true, true, true,
    ))
    && isPageSetup(value.pageSetup)
    && isHeaderFooter(value.headerFooter)
    && isNotebookObjectPlacementGraphValid(value.content);
}

export function isNotebookRichDocumentV2(value: unknown): value is NotebookRichDocumentV2 {
  return isRecord(value)
    && value.version === 2
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, false, false, false, false, false, false, false, false,
    ));
}

export function isNotebookRichDocumentV3(value: unknown): value is NotebookRichDocumentV3 {
  return isRecord(value)
    && value.version === 3
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, false, false, false, false, false, false, false,
    ));
}

export function isNotebookRichDocumentV4(value: unknown): value is NotebookRichDocumentV4 {
  return isRecord(value)
    && value.version === 4
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, false, false, false, false, false, false,
    ));
}

export function isNotebookRichDocumentV5(value: unknown): value is NotebookRichDocumentV5 {
  return isRecord(value)
    && value.version === 5
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, false, false, false, false, false,
    ));
}

export function isNotebookRichDocumentV6(value: unknown): value is NotebookRichDocumentV6 {
  return isRecord(value)
    && value.version === 6
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, false, false, false, false,
    ));
}

export function isNotebookRichDocumentV7(value: unknown): value is NotebookRichDocumentV7 {
  return isRecord(value)
    && value.version === 7
    && Object.keys(value).every((key) => [
      'version',
      'id',
      'title',
      'createdAt',
      'updatedAt',
      'selectedNodeId',
      'content',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, false, false, false,
    ));
}

export function isNotebookRichDocumentV8(value: unknown): value is NotebookRichDocumentV8 {
  return isRecord(value)
    && value.version === 8
    && Object.keys(value).every((key) => [
      'version',
      'id',
      'title',
      'createdAt',
      'updatedAt',
      'selectedNodeId',
      'content',
      'pageSetup',
      'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, false, true, false,
    ))
    && isPageSetup(value.pageSetup)
    && isLegacyHeaderFooter(value.headerFooter);
}

export function isNotebookRichDocumentV9(value: unknown): value is NotebookRichDocumentV9 {
  return isRecord(value)
    && value.version === 9
    && Object.keys(value).every((key) => [
      'version',
      'id',
      'title',
      'createdAt',
      'updatedAt',
      'selectedNodeId',
      'content',
      'pageSetup',
      'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, true, true, false,
    ))
    && isPageSetup(value.pageSetup)
    && isLegacyHeaderFooter(value.headerFooter);
}

export function isNotebookRichDocumentV10(value: unknown): value is NotebookRichDocumentV10 {
  return isRecord(value)
    && value.version === 10
    && Object.keys(value).every((key) => [
      'version', 'id', 'title', 'createdAt', 'updatedAt', 'selectedNodeId',
      'content', 'pageSetup', 'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, true, true, true, false,
    ))
    && isPageSetup(value.pageSetup)
    && isLegacyHeaderFooter(value.headerFooter);
}

export function isNotebookRichDocumentV11(value: unknown): value is NotebookRichDocumentV11 {
  return isRecord(value)
    && value.version === 11
    && Object.keys(value).every((key) => [
      'version', 'id', 'title', 'createdAt', 'updatedAt', 'selectedNodeId',
      'content', 'pageSetup', 'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, true, true, true, false,
    ))
    && isPageSetup(value.pageSetup)
    && isHeaderFooter(value.headerFooter);
}

export function isNotebookRichDocumentV12(value: unknown): value is NotebookRichDocumentV12 {
  return isRecord(value)
    && value.version === 12
    && Object.keys(value).every((key) => [
      'version', 'id', 'title', 'createdAt', 'updatedAt', 'selectedNodeId',
      'content', 'pageSetup', 'headerFooter',
    ].includes(key))
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(
      node, true, true, true, true, true, true, true, true, true, false,
    ))
    && isPageSetup(value.pageSetup)
    && isHeaderFooter(value.headerFooter);
}

export function countNotebookBlocks(nodes: readonly NotebookRichBlockNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === 'semanticBlock' || node.type === 'section') {
      return count + 1 + countNotebookBlocks(node.content);
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      return count + 1 + node.content.reduce(
        (itemCount, item) => itemCount + countNotebookBlocks(item.content),
        0,
      );
    }
    return count + 1;
  }, 0);
}

export function collectNotebookAssetIds(nodes: readonly NotebookRichBlockNode[]): string[] {
  const assetIds = new Set<string>();
  const pending = [...nodes];
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node) continue;
    if (node.type === 'imageFigure') {
      assetIds.add(node.assetId);
    } else if (node.type === 'videoFigure') {
      assetIds.add(node.assetId);
      if (node.posterAssetId) assetIds.add(node.posterAssetId);
      node.tracks?.forEach((track) => assetIds.add(track.assetId));
    } else if (node.type === 'semanticBlock' || node.type === 'section') {
      pending.push(...node.content);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content.forEach((item) => pending.push(...item.content));
    }
  }
  return [...assetIds].sort();
}

const NOTEBOOK_WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function countWordsInText(value: string | undefined) {
  return value?.match(NOTEBOOK_WORD_PATTERN)?.length ?? 0;
}

export type NotebookDocumentMetrics = {
  blockCount: number;
  inlineMathCount: number;
  wordCount: number;
};

export function measureNotebookDocument(
  nodes: readonly NotebookRichBlockNode[],
): NotebookDocumentMetrics {
  const metrics: NotebookDocumentMetrics = {
    blockCount: 0,
    inlineMathCount: 0,
    wordCount: 0,
  };
  const pending = [...nodes];

  while (pending.length > 0) {
    const node = pending.pop();
    if (!node) {
      continue;
    }
    metrics.blockCount += 1;
    if (node.type === 'paragraph' || node.type === 'heading') {
      for (const inline of node.content ?? []) {
        if (inline.type === 'inlineMath') {
          metrics.inlineMathCount += 1;
        } else {
          metrics.wordCount += countWordsInText(inline.text);
        }
      }
      continue;
    }
    if (node.type === 'semanticBlock') {
      metrics.wordCount += countWordsInText(node.label);
      pending.push(...node.content);
      continue;
    }
    if (node.type === 'section') {
      metrics.wordCount += countWordsInText(node.title);
      pending.push(...node.content);
      continue;
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      for (const item of node.content) {
        pending.push(...item.content);
      }
      continue;
    }
    if (node.type === 'evidenceSnapshot') {
      metrics.wordCount += countWordsInText(node.title);
      for (const fact of node.facts) {
        metrics.wordCount += countWordsInText(fact);
      }
      for (const warning of node.warnings) {
        metrics.wordCount += countWordsInText(warning);
      }
      continue;
    }
    if (node.type === 'imageFigure') {
      metrics.wordCount += countWordsInText(node.caption);
      continue;
    }
    if (node.type === 'videoFigure') {
      metrics.wordCount += countWordsInText(node.title);
      metrics.wordCount += countWordsInText(node.description);
      metrics.wordCount += countWordsInText(node.caption);
    }
  }

  return metrics;
}

export function summarizeNotebookDocument(
  document: NotebookRichDocument,
): NotebookDocumentSummary {
  const metrics = measureNotebookDocument(document.content);
  return {
    id: document.id,
    title: document.title,
    updatedAt: document.updatedAt,
    blockCount: metrics.blockCount,
    wordCount: metrics.wordCount,
  };
}
