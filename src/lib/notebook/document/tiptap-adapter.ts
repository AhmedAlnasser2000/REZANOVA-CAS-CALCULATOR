import type { JSONContent } from '@tiptap/core';

import type { NotebookWorkspaceTarget } from '../types';
import { createNotebookNodeIdFactory } from './model';
import type {
  NotebookBulletStyle,
  NotebookEvidenceNode,
  NotebookInlineNode,
  NotebookListItemNode,
  NotebookLineSpacing,
  NotebookOrderedStyle,
  NotebookParagraphFormat,
  NotebookParagraphSpacePt,
  NotebookRichBlockNode,
  NotebookRichDocument,
  NotebookRichMark,
  NotebookSemanticKind,
  NotebookTextAlignment,
} from './types';
import {
  isNotebookFontSize,
  NOTEBOOK_BULLET_STYLES,
  NOTEBOOK_LINE_SPACINGS,
  NOTEBOOK_ORDERED_STYLES,
  NOTEBOOK_PARAGRAPH_SPACES_PT,
  NOTEBOOK_TEXT_ALIGNMENTS,
} from './types';

const WORKSPACE_TARGETS = new Set<NotebookWorkspaceTarget>([
  'calculate',
  'equation',
  'calculus',
  'trigonometry',
  'statistics',
  'geometry',
  'matrix',
  'vector',
  'table',
]);

const SEMANTIC_KINDS = new Set<NotebookSemanticKind>([
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
]);

function stringAttr(node: JSONContent, name: string, fallback = '') {
  const value = node.attrs?.[name];
  return typeof value === 'string' ? value : fallback;
}

function booleanAttr(node: JSONContent, name: string) {
  return node.attrs?.[name] === true;
}

function stringArrayAttr(node: JSONContent, name: string) {
  const value = node.attrs?.[name];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function workspaceTargetAttr(node: JSONContent): NotebookWorkspaceTarget {
  const value = stringAttr(node, 'workspaceTarget', 'calculate') as NotebookWorkspaceTarget;
  return WORKSPACE_TARGETS.has(value) ? value : 'calculate';
}

function oneOf<T>(value: unknown, options: readonly T[]): T | undefined {
  return options.find((option) => option === value);
}

function paragraphFormatAttrs(format: NotebookParagraphFormat | undefined) {
  return {
    notebookAlignment: format?.alignment ?? null,
    notebookLineSpacing: format?.lineSpacing ?? null,
    notebookSpaceBeforePt: format?.spaceBeforePt ?? null,
    notebookSpaceAfterPt: format?.spaceAfterPt ?? null,
  };
}

function paragraphFormatFromTiptap(node: JSONContent): NotebookParagraphFormat | undefined {
  const alignment = oneOf<NotebookTextAlignment>(
    node.attrs?.notebookAlignment,
    NOTEBOOK_TEXT_ALIGNMENTS,
  );
  const lineSpacing = oneOf<NotebookLineSpacing>(
    node.attrs?.notebookLineSpacing,
    NOTEBOOK_LINE_SPACINGS,
  );
  const spaceBeforePt = oneOf<NotebookParagraphSpacePt>(
    node.attrs?.notebookSpaceBeforePt,
    NOTEBOOK_PARAGRAPH_SPACES_PT,
  );
  const spaceAfterPt = oneOf<NotebookParagraphSpacePt>(
    node.attrs?.notebookSpaceAfterPt,
    NOTEBOOK_PARAGRAPH_SPACES_PT,
  );
  const format = {
    ...(alignment ? { alignment } : {}),
    ...(lineSpacing ? { lineSpacing } : {}),
    ...(spaceBeforePt !== undefined ? { spaceBeforePt } : {}),
    ...(spaceAfterPt !== undefined ? { spaceAfterPt } : {}),
  };
  return Object.keys(format).length ? format : undefined;
}

function markToTiptap(mark: NotebookRichMark): {
  type: string;
  attrs?: Record<string, unknown>;
} {
  if (mark.type === 'highlight') {
    return {
      type: mark.type,
      ...(mark.color ? { attrs: { color: mark.color } } : {}),
    };
  }
  if (mark.type === 'textStyle') {
    const attrs = {
      ...(mark.color ? { color: mark.color } : {}),
      ...(isNotebookFontSize(mark.fontSize) ? { fontSize: mark.fontSize } : {}),
    };
    return {
      type: mark.type,
      ...(Object.keys(attrs).length ? { attrs } : {}),
    };
  }
  return { type: mark.type };
}

function markFromTiptap(mark: JSONContent): NotebookRichMark | null {
  if (mark.type === 'bold' || mark.type === 'italic' || mark.type === 'strike' || mark.type === 'underline') {
    return { type: mark.type };
  }
  if (mark.type === 'highlight') {
    const color = stringAttr(mark, 'color');
    return { type: 'highlight', ...(color ? { color } : {}) };
  }
  if (mark.type === 'textStyle') {
    const color = stringAttr(mark, 'color');
    const rawFontSize = mark.attrs?.fontSize;
    const fontSize = isNotebookFontSize(rawFontSize) ? rawFontSize : undefined;
    return {
      type: 'textStyle',
      ...(color ? { color } : {}),
      ...(fontSize ? { fontSize } : {}),
    };
  }
  return null;
}

function inlineToTiptap(node: NotebookInlineNode): JSONContent {
  if (node.type === 'text') {
    return {
      type: 'text',
      text: node.text,
      ...(node.marks?.length
        ? { marks: node.marks.map(markToTiptap) }
        : {}),
    };
  }
  return {
    type: 'inlineMath',
    attrs: {
      id: node.id,
      sourceText: node.sourceText,
      latex: node.latex,
      workspaceTarget: node.workspaceTarget,
    },
  };
}

function blockToTiptap(node: NotebookRichBlockNode): JSONContent {
  if (node.type === 'paragraph') {
    return {
      type: 'paragraph',
      attrs: { id: node.id, ...paragraphFormatAttrs(node.format) },
      ...(node.content?.length ? { content: node.content.map(inlineToTiptap) } : {}),
    };
  }
  if (node.type === 'heading') {
    return {
      type: 'heading',
      attrs: { id: node.id, level: node.level, ...paragraphFormatAttrs(node.format) },
      ...(node.content?.length ? { content: node.content.map(inlineToTiptap) } : {}),
    };
  }
  if (node.type === 'displayMath') {
    return {
      type: 'displayMath',
      attrs: {
        id: node.id,
        label: node.label ?? '',
        sourceText: node.sourceText,
        latex: node.latex,
        workspaceTarget: node.workspaceTarget,
      },
    };
  }
  if (node.type === 'evidenceSnapshot') {
    return {
      type: 'evidenceSnapshot',
      attrs: {
        id: node.id,
        source: node.source,
        title: node.title,
        inputLatex: node.inputLatex ?? '',
        resultLatex: node.resultLatex ?? '',
        facts: node.facts,
        warnings: node.warnings,
      },
    };
  }
  if (node.type === 'horizontalRule') {
    return { type: 'horizontalRule', attrs: { id: node.id } };
  }
  if (node.type === 'section') {
    return {
      type: 'notebookSection',
      attrs: {
        id: node.id,
        title: node.title,
        collapsed: node.collapsed ?? false,
      },
      content: node.content.map(blockToTiptap),
    };
  }
  if ('variant' in node) {
    return {
      type: 'semanticBlock',
      attrs: {
        id: node.id,
        variant: node.variant,
        label: node.label ?? '',
        number: node.number ?? '',
        collapsed: node.collapsed ?? false,
      },
      content: node.content.map(blockToTiptap),
    };
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return {
      type: node.type,
      attrs: {
        id: node.id,
        notebookListStyle: node.style ?? null,
      },
      content: node.content.map((item) => ({
        type: 'listItem',
        attrs: { id: item.id },
        content: item.content.map(blockToTiptap),
      })),
    };
  }
  return node;
}

function inlineFromTiptap(node: JSONContent): NotebookInlineNode | null {
  if (node.type === 'text' && typeof node.text === 'string') {
    const marks = node.marks
      ?.map(markFromTiptap)
      .filter((mark): mark is NotebookRichMark => Boolean(mark));
    return {
      type: 'text',
      text: node.text,
      ...(marks?.length ? { marks } : {}),
    };
  }
  if (node.type === 'inlineMath') {
    return {
      type: 'inlineMath',
      id: stringAttr(node, 'id'),
      sourceText: stringAttr(node, 'sourceText'),
      latex: stringAttr(node, 'latex'),
      workspaceTarget: workspaceTargetAttr(node),
    };
  }
  return null;
}

function textFallback(node: JSONContent): string {
  if (typeof node.text === 'string') {
    return node.text;
  }
  return node.content?.map(textFallback).join('') ?? '';
}

function containsNotebookNodeId(value: unknown, id: string): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if ('id' in value && value.id === id) {
    return true;
  }
  return Object.values(value).some((child) => containsNotebookNodeId(child, id));
}

function blockFromTiptap(
  node: JSONContent,
  nextId: (kind: string) => string,
): NotebookRichBlockNode | null {
  const id = stringAttr(node, 'id') || nextId(node.type ?? 'block');
  if (node.type === 'paragraph' || node.type === 'heading') {
    const content = node.content
      ?.map(inlineFromTiptap)
      .filter((item): item is NotebookInlineNode => Boolean(item));
    const format = paragraphFormatFromTiptap(node);
    if (node.type === 'heading') {
      const rawLevel = node.attrs?.level;
      const level = rawLevel === 2 || rawLevel === 3 ? rawLevel : 1;
      return {
        type: 'heading',
        id,
        level,
        ...(format ? { format } : {}),
        ...(content?.length ? { content } : {}),
      };
    }
    return {
      type: 'paragraph',
      id,
      ...(format ? { format } : {}),
      ...(content?.length ? { content } : {}),
    };
  }
  if (node.type === 'displayMath') {
    const label = stringAttr(node, 'label');
    return {
      type: 'displayMath',
      id,
      ...(label ? { label } : {}),
      sourceText: stringAttr(node, 'sourceText'),
      latex: stringAttr(node, 'latex'),
      workspaceTarget: workspaceTargetAttr(node),
    };
  }
  if (node.type === 'evidenceSnapshot') {
    const source = stringAttr(node, 'source');
    const evidence: NotebookEvidenceNode = {
      type: 'evidenceSnapshot',
      id,
      source: source === 'future-current-result' || source === 'future-history-entry'
        ? source
        : 'manual-placeholder',
      title: stringAttr(node, 'title', 'Evidence snapshot'),
      facts: stringArrayAttr(node, 'facts'),
      warnings: stringArrayAttr(node, 'warnings'),
    };
    const inputLatex = stringAttr(node, 'inputLatex');
    const resultLatex = stringAttr(node, 'resultLatex');
    return {
      ...evidence,
      ...(inputLatex ? { inputLatex } : {}),
      ...(resultLatex ? { resultLatex } : {}),
    };
  }
  if (node.type === 'horizontalRule') {
    return { type: 'horizontalRule', id };
  }
  if (node.type === 'notebookSection') {
    const content = node.content
      ?.map((child) => blockFromTiptap(child, nextId))
      .filter((child): child is NotebookRichBlockNode => Boolean(child));
    return {
      type: 'section',
      id,
      title: stringAttr(node, 'title', 'Untitled section'),
      ...(booleanAttr(node, 'collapsed') ? { collapsed: true } : {}),
      content: content?.length
        ? content
        : [{ type: 'paragraph', id: nextId('paragraph') }],
    };
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const items = node.content
      ?.filter((item) => item.type === 'listItem')
      .map((item): NotebookListItemNode => ({
        type: 'listItem',
        id: stringAttr(item, 'id') || nextId('listItem'),
        content: item.content
          ?.map((child) => blockFromTiptap(child, nextId))
          .filter((child): child is NotebookRichBlockNode => Boolean(child))
          ?? [{ type: 'paragraph', id: nextId('paragraph') }],
      })) ?? [];
    const rawStyle = node.attrs?.notebookListStyle;
    const content = items.length > 0
      ? items
      : [{
          type: 'listItem' as const,
          id: nextId('listItem'),
          content: [{ type: 'paragraph' as const, id: nextId('paragraph') }],
        }];
    if (node.type === 'bulletList') {
      const style = oneOf<NotebookBulletStyle>(rawStyle, NOTEBOOK_BULLET_STYLES);
      return {
        type: 'bulletList',
        id,
        ...(style ? { style } : {}),
        content,
      };
    }
    const style = oneOf<NotebookOrderedStyle>(rawStyle, NOTEBOOK_ORDERED_STYLES);
    return {
      type: 'orderedList',
      id,
      ...(style ? { style } : {}),
      content,
    };
  }
  if (node.type === 'semanticBlock') {
    const rawVariant = stringAttr(node, 'variant') as NotebookSemanticKind;
    const variant = SEMANTIC_KINDS.has(rawVariant) ? rawVariant : 'note';
    const content = node.content
      ?.map((child) => blockFromTiptap(child, nextId))
      .filter((child): child is NotebookRichBlockNode => Boolean(child));
    const label = stringAttr(node, 'label');
    const number = stringAttr(node, 'number');
    return {
      type: 'semanticBlock',
      id,
      variant,
      ...(label ? { label } : {}),
      ...(number ? { number } : {}),
      ...(booleanAttr(node, 'collapsed') ? { collapsed: true } : {}),
      content: content?.length
        ? content
        : [{ type: 'paragraph', id: nextId('paragraph') }],
    };
  }

  const fallback = textFallback(node).trim();
  return fallback
    ? {
        type: 'paragraph',
        id,
        content: [{ type: 'text', text: fallback }],
      }
    : null;
}

export function notebookDocumentToTiptap(
  document: NotebookRichDocument,
): JSONContent {
  return {
    type: 'doc',
    content: document.content.map(blockToTiptap),
  };
}

export function notebookDocumentFromTiptap(
  content: JSONContent,
  previous: NotebookRichDocument,
  options: { selectedNodeId?: string | null; now?: () => Date } = {},
): NotebookRichDocument {
  const nextId = createNotebookNodeIdFactory({
    idPrefix: previous.id,
    now: options.now,
  });
  const blocks = content.content
    ?.map((node) => blockFromTiptap(node, nextId))
    .filter((node): node is NotebookRichBlockNode => Boolean(node));
  const nextContent = blocks?.length
    ? blocks
    : [{ type: 'paragraph' as const, id: nextId('paragraph') }];
  const selectedNodeId = options.selectedNodeId === undefined
    ? previous.selectedNodeId
    : options.selectedNodeId;

  return {
    ...previous,
    updatedAt: (options.now ?? (() => new Date()))().toISOString(),
    selectedNodeId: selectedNodeId
      && containsNotebookNodeId(nextContent, selectedNodeId)
      ? selectedNodeId
      : nextContent[0]?.id ?? null,
    content: nextContent,
  };
}
