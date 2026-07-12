import { Extension, mergeAttributes, Node } from '@tiptap/core';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';

import type { NotebookWorkspaceTarget } from '../../../../lib/notebook';
import { NotebookEvidenceNodeView } from './NotebookEvidenceNodeView';
import {
  createNotebookMathNodeView,
  type NotebookOpenMathHandler,
} from './NotebookMathNodeView';
import { NotebookSemanticNodeView } from './NotebookSemanticNodeView';

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
]);

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
      appendTransaction: (_transactions, _oldState, newState) => {
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
  draggable: true,
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
  draggable: true,
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

const SemanticBlock = Node.create({
  name: 'semanticBlock',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      variant: { default: 'note' },
      label: { default: '' },
      number: { default: '' },
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

export function createNotebookExtensions(
  onOpenMathInTool: NotebookOpenMathHandler,
) {
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    NotebookNodeIds,
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
    SemanticBlock,
  ];
}
