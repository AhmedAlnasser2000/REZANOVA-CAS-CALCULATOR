import { Extension, mergeAttributes, Node } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';

import {
  type NotebookAssetPort,
  type NotebookWorkspaceTarget,
} from '../../../../lib/notebook';
import { NotebookEvidenceNodeView } from './NotebookEvidenceNodeView';
import { NotebookFloatingAnchorRepair } from './NotebookFloatingAnchorRepairExtension';
import { NotebookFontSize } from './NotebookFontSizeExtension';
import {
  createNotebookImageNodeView,
  type NotebookImageNodeViewOptions,
} from './NotebookImageNodeView';
import { NotebookParagraphFormatting } from './NotebookParagraphFormattingExtension';
import {
  createNotebookMathNodeView,
  type NotebookOpenMathHandler,
} from './NotebookMathNodeView';
import { NotebookSemanticNodeView } from './NotebookSemanticNodeView';
import { NotebookSectionNodeView } from './NotebookSectionNodeView';

const ID_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'horizontalRule',
  'inlineMath',
  'displayMath',
  'evidenceSnapshot',
  'semanticBlock',
  'notebookSection',
  'imageFigure',
  'pageBreak',
]);

function valueContainsUnidentifiedNotebookNode(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(valueContainsUnidentifiedNotebookNode);
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.type === 'string' && ID_NODE_TYPES.has(record.type)) {
    const attrs = record.attrs;
    if (!attrs || typeof attrs !== 'object' || !(attrs as Record<string, unknown>).id) {
      return true;
    }
  }
  return Object.values(record).some(valueContainsUnidentifiedNotebookNode);
}

function nodeIdFactory() {
  let sequence = 0;
  const seed = Date.now();
  return (kind: string) => {
    sequence += 1;
    return `notebook.${kind}.${seed}.${sequence}`;
  };
}

const NotebookNodeIds = Extension.create({
  name: 'notebookNodeIds',

  addGlobalAttributes() {
    return [{
      types: [...ID_NODE_TYPES],
      attributes: {
        id: {
          default: null,
          parseHTML: (element) => element.getAttribute('data-notebook-node-id'),
          renderHTML: (attributes) => attributes.id
            ? { 'data-notebook-node-id': String(attributes.id) }
            : {},
        },
      },
    }];
  },

  addProseMirrorPlugins() {
    const nextId = nodeIdFactory();
    return [new Plugin({
      key: new PluginKey('notebook-node-ids'),
      appendTransaction: (transactions, _oldState, newState) => {
        const mayNeedIds = transactions.some((transaction) =>
          transaction.docChanged
          && transaction.steps.some((step) =>
            valueContainsUnidentifiedNotebookNode(step.toJSON())));
        if (!mayNeedIds) {
          return null;
        }
        const transaction = newState.tr;
        let changed = false;
        newState.doc.descendants((node, position) => {
          if (!ID_NODE_TYPES.has(node.type.name) || node.attrs.id) {
            return;
          }
          transaction.setNodeMarkup(position, undefined, {
            ...node.attrs,
            id: nextId(node.type.name),
          });
          changed = true;
        });
        return changed ? transaction : null;
      },
    })];
  },
});

const NotebookDocumentLayout = Extension.create({
  name: 'notebookDocumentLayout',

  addGlobalAttributes() {
    return [{
      types: ['doc'],
      attributes: {
        notebookPageSetup: { default: null, rendered: false },
        notebookHeaderFooter: { default: null, rendered: false },
      },
    }];
  },
});

const NotebookObjectPlacementAttributes = Extension.create({
  name: 'notebookObjectPlacementAttributes',

  addGlobalAttributes() {
    return [{
      types: [
        'displayMath',
        'evidenceSnapshot',
        'horizontalRule',
        'imageFigure',
        'semanticBlock',
        'notebookSection',
      ],
      attributes: {
        notebookObjectPlacement: { default: null, rendered: false },
      },
    }];
  },
});

const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      sourceText: { default: '' },
      latex: { default: '' },
      workspaceTarget: { default: 'calculate' satisfies NotebookWorkspaceTarget },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-notebook-inline-math]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-notebook-inline-math': '',
    })];
  },
});

const DisplayMath = Node.create({
  name: 'displayMath',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      label: { default: '' },
      sourceText: { default: '' },
      latex: { default: '' },
      workspaceTarget: { default: 'calculate' satisfies NotebookWorkspaceTarget },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-notebook-display-math]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-notebook-display-math': '',
    })];
  },
});

const EvidenceSnapshot = Node.create({
  name: 'evidenceSnapshot',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      source: { default: 'manual-placeholder' },
      title: { default: 'Evidence snapshot' },
      inputLatex: { default: '' },
      resultLatex: { default: '' },
      facts: { default: [] },
      warnings: { default: [] },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-notebook-evidence]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-notebook-evidence': '',
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotebookEvidenceNodeView);
  },
});

const ImageFigure = Node.create({
  name: 'imageFigure',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      id: { default: '' },
      assetId: { default: '' },
      altText: { default: null },
      decorative: { default: null },
      caption: { default: null },
      numbered: { default: null },
      widthPercent: { default: null },
      displayWidthPt: { default: null },
      displayHeightPt: { default: null },
      alignment: { default: null },
      placement: { default: null },
      rotation: { default: null },
      displayAspectRatio: { default: null },
      cropX: { default: null },
      cropY: { default: null },
      cropWidth: { default: null },
      cropHeight: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-notebook-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['figure', mergeAttributes(HTMLAttributes, { 'data-notebook-image': '' })];
  },
});

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-notebook-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-notebook-page-break': '',
      class: 'notebook-page-break',
      contenteditable: 'false',
      role: 'separator',
      'aria-label': 'Page break',
    }), ['span', {}, 'Page break']];
  },
});

const SemanticBlock = Node.create({
  name: 'semanticBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      variant: { default: 'note' },
      label: { default: '' },
      number: { default: '' },
      accentColor: { default: null },
      collapsible: { default: null },
      collapsed: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-notebook-semantic]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = String(node.attrs.variant ?? 'note');
    const number = String(node.attrs.number ?? '');
    const label = String(node.attrs.label ?? '');
    const heading = [variant.charAt(0).toUpperCase() + variant.slice(1), number, label]
      .filter(Boolean)
      .join(' ');
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-notebook-semantic': variant,
        class: `notebook-semantic-block is-${variant}`,
      }),
      ['header', { contenteditable: 'false' }, heading],
      ['div', { class: 'notebook-semantic-content' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotebookSemanticNodeView);
  },
});

const NotebookSection = Node.create({
  name: 'notebookSection',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      title: { default: 'Untitled section' },
      accentColor: { default: null },
      collapsible: { default: null },
      collapsed: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-notebook-section]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-notebook-section': '',
        class: 'notebook-section',
      }),
      ['div', { class: 'notebook-section-content' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NotebookSectionNodeView);
  },
});

export function createNotebookExtensions(
  onOpenMathInTool: NotebookOpenMathHandler,
  assetPort: NotebookAssetPort,
  mediaNodeViewOptions: NotebookImageNodeViewOptions = {},
) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    NotebookFontSize,
    NotebookParagraphFormatting,
    Color,
    NotebookDocumentLayout,
    NotebookNodeIds,
    NotebookObjectPlacementAttributes,
    NotebookFloatingAnchorRepair,
    InlineMath.extend({
      addNodeView() {
        return ReactNodeViewRenderer(
          createNotebookMathNodeView('inline', onOpenMathInTool),
          { as: 'span' },
        );
      },
    }),
    DisplayMath.extend({
      addNodeView() {
        return ReactNodeViewRenderer(
          createNotebookMathNodeView('display', onOpenMathInTool),
        );
      },
    }),
    EvidenceSnapshot,
    ImageFigure.extend({
      addNodeView() {
        return ReactNodeViewRenderer(createNotebookImageNodeView(assetPort, mediaNodeViewOptions));
      },
    }),
    PageBreak,
    SemanticBlock,
    NotebookSection,
  ];
}
