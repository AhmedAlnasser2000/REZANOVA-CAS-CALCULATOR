import {
  isNotebookFontSize,
  NOTEBOOK_BULLET_STYLES,
  NOTEBOOK_LINE_SPACINGS,
  NOTEBOOK_ORDERED_STYLES,
  NOTEBOOK_PARAGRAPH_SPACES_PT,
  NOTEBOOK_RICH_DOCUMENT_VERSION,
  NOTEBOOK_TEXT_ALIGNMENTS,
  type NotebookDocumentSummary,
  type NotebookInlineNode,
  type NotebookParagraphFormat,
  type NotebookRichBlockNode,
  type NotebookRichDocument,
  type NotebookRichDocumentV2,
  type NotebookRichDocumentV3,
  type NotebookRichDocumentV4,
  type NotebookRichDocumentV5,
  type NotebookRichMark,
} from './types';
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

function isParagraphFormat(value: unknown): value is NotebookParagraphFormat {
  if (!isRecord(value)) {
    return false;
  }
  if (!Object.keys(value).every((key) => [
    'alignment',
    'lineSpacing',
    'spaceBeforePt',
    'spaceAfterPt',
  ].includes(key))) {
    return false;
  }
  return (value.alignment === undefined || isOneOf(value.alignment, NOTEBOOK_TEXT_ALIGNMENTS))
    && (value.lineSpacing === undefined || isOneOf(value.lineSpacing, NOTEBOOK_LINE_SPACINGS))
    && (value.spaceBeforePt === undefined
      || isOneOf(value.spaceBeforePt, NOTEBOOK_PARAGRAPH_SPACES_PT))
    && (value.spaceAfterPt === undefined
      || isOneOf(value.spaceAfterPt, NOTEBOOK_PARAGRAPH_SPACES_PT));
}

function isRichBlockNode(
  value: unknown,
  allowSection = true,
  validateTypography = true,
  allowParagraphTools = true,
  allowStructuredAppearance = true,
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
        )));
  }
  if (value.type === 'paragraph') {
    return (value.format === undefined || (allowParagraphTools && isParagraphFormat(value.format)))
      && (value.content === undefined
        || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(
          node,
          validateTypography,
          allowParagraphTools,
        ))));
  }
  if (value.type === 'heading') {
    return (value.level === 1 || value.level === 2 || value.level === 3)
      && (value.format === undefined || (allowParagraphTools && isParagraphFormat(value.format)))
      && (value.content === undefined
        || (Array.isArray(value.content) && value.content.every((node) => isInlineNode(
          node,
          validateTypography,
          allowParagraphTools,
        ))));
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
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
    && (typeof value.selectedNodeId === 'string' || value.selectedNodeId === null)
    && Array.isArray(value.content)
    && value.content.every((node) => isRichBlockNode(node));
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
    && value.content.every((node) => isRichBlockNode(node, false, false, false, false));
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
    && value.content.every((node) => isRichBlockNode(node, true, false, false, false));
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
    && value.content.every((node) => isRichBlockNode(node, true, true, false, false));
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
    && value.content.every((node) => isRichBlockNode(node, true, true, true, false));
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
