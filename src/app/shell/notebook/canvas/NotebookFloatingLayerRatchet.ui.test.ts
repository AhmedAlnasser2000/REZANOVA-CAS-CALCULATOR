import { Editor, Extension, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import { moveNotebookFloatingLayer } from './selection';

const NotebookTestIds = Extension.create({
  name: 'notebookFloatingLayerRatchetIds',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'semanticBlock', 'horizontalRule'],
      attributes: {
        id: { default: null },
        notebookObjectPlacement: { default: null },
      },
    }];
  },
});

const SemanticBlock = Node.create({
  name: 'semanticBlock',
  group: 'block',
  content: 'block+',
  renderHTML() {
    return ['aside', 0];
  },
});

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('Notebook floating layer ratchet', () => {
  it('normalizes layer order while preserving the selected floating object', () => {
    const placement = (zOrder: number) => ({
      mode: 'floating',
      anchor: { kind: 'paragraph', nodeId: 'paragraph.anchor' },
      horizontalReference: 'margins',
      verticalReference: 'margins',
      xPt: 0,
      yPt: 0,
      widthPt: 120,
      wrap: 'in-front',
      textDistancePt: { top: 0, right: 0, bottom: 0, left: 0 },
      zOrder,
    });
    editor = new Editor({
      extensions: [StarterKit, NotebookTestIds, SemanticBlock],
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { id: 'paragraph.anchor' },
          content: [{ type: 'text', text: 'Anchor' }],
        }, {
          type: 'horizontalRule',
          attrs: {
            id: 'divider.back',
            notebookObjectPlacement: placement(0),
          },
        }, {
          type: 'horizontalRule',
          attrs: {
            id: 'divider.middle',
            notebookObjectPlacement: placement(1),
          },
        }, {
          type: 'semanticBlock',
          attrs: {
            id: 'semantic.front',
            notebookObjectPlacement: placement(2),
          },
          content: [{ type: 'paragraph', attrs: { id: 'paragraph.semantic' } }],
        }],
      },
    });

    expect(moveNotebookFloatingLayer(editor, 'divider.back', 'bring-to-front')).toBe(true);
    const zOrders = new Map<string, number>();
    editor.state.doc.descendants((node) => {
      if (typeof node.attrs.id === 'string' && node.attrs.notebookObjectPlacement?.mode === 'floating') {
        zOrders.set(node.attrs.id, node.attrs.notebookObjectPlacement.zOrder);
      }
    });
    expect(Object.fromEntries(zOrders)).toEqual({
      'divider.back': 2,
      'divider.middle': 0,
      'semantic.front': 1,
    });
    expect(editor.state.selection).toBeInstanceOf(NodeSelection);
    expect((editor.state.selection as NodeSelection).node.attrs.id).toBe('divider.back');
  });
});
