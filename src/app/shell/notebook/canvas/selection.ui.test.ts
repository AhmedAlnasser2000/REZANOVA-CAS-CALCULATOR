import { Editor, Extension, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import {
  indentNotebookNode,
  moveNotebookFloatingLayer,
  moveNotebookNodeInParent,
  notebookInspectorSelection,
  notebookNodeArrangementState,
  outdentNotebookNode,
} from './selection';

const NotebookTestIds = Extension.create({
  name: 'notebookTestIds',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'notebookSection', 'semanticBlock', 'inlineMath', 'horizontalRule'],
      attributes: {
        id: { default: null },
        notebookObjectPlacement: { default: null },
      },
    }];
  },
});

const NotebookSection = Node.create({
  name: 'notebookSection',
  group: 'block',
  content: 'block+',
  renderHTML() {
    return ['section', 0];
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

const InlineMath = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  renderHTML() {
    return ['span'];
  },
});

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('notebookInspectorSelection', () => {
  it('targets the closest shell while preserving prose selection and lets direct math win', () => {
    editor = new Editor({
      extensions: [StarterKit, NotebookTestIds, NotebookSection, SemanticBlock, InlineMath],
      content: {
        type: 'doc',
        content: [{
          type: 'notebookSection',
          attrs: { id: 'section.1' },
          content: [{
            type: 'paragraph',
            attrs: { id: 'paragraph.section' },
            content: [{ type: 'text', text: 'Section prose' }],
          }, {
            type: 'semanticBlock',
            attrs: { id: 'semantic.1' },
            content: [{
              type: 'paragraph',
              attrs: { id: 'paragraph.semantic' },
              content: [
                { type: 'text', text: 'Container prose ' },
                { type: 'inlineMath', attrs: { id: 'math.1' } },
              ],
            }],
          }],
        }],
      },
    });

    const positions = new Map<string, number>();
    editor.state.doc.descendants((node, position) => {
      if (typeof node.attrs.id === 'string') {
        positions.set(node.attrs.id, position);
      }
    });

    editor.commands.setTextSelection(positions.get('paragraph.section')! + 2);
    expect(notebookInspectorSelection(editor)).toMatchObject({
      id: 'section.1',
      type: 'notebookSection',
    });

    editor.commands.setTextSelection(positions.get('paragraph.semantic')! + 2);
    expect(notebookInspectorSelection(editor)).toMatchObject({
      id: 'semantic.1',
      type: 'semanticBlock',
    });

    editor.view.dispatch(editor.state.tr.setSelection(
      NodeSelection.create(editor.state.doc, positions.get('math.1')!),
    ));
    expect(notebookInspectorSelection(editor)).toMatchObject({
      id: 'math.1',
      type: 'inlineMath',
    });
  });
});

describe('Notebook block arrangement', () => {
  it('reports truthful sibling and Section alternatives and keeps moves transactional', () => {
    editor = new Editor({
      extensions: [StarterKit, NotebookTestIds, NotebookSection, SemanticBlock, InlineMath],
      content: {
        type: 'doc',
        content: [{
          type: 'notebookSection',
          attrs: { id: 'section.1' },
          content: [{ type: 'paragraph', attrs: { id: 'paragraph.inside' } }],
        }, {
          type: 'paragraph',
          attrs: { id: 'paragraph.moving' },
          content: [{ type: 'text', text: 'Move me' }],
        }, {
          type: 'semanticBlock',
          attrs: { id: 'semantic.1' },
          content: [{ type: 'paragraph', attrs: { id: 'paragraph.semantic' } }],
        }],
      },
    });

    expect(notebookNodeArrangementState(editor, 'paragraph.moving')).toEqual({
      canMoveDown: true,
      canMoveIntoSection: true,
      canMoveOutOfSection: false,
      canMoveUp: true,
    });
    expect(indentNotebookNode(editor, 'paragraph.moving')).toBe(true);
    expect(editor.state.doc.child(0).lastChild?.attrs.id).toBe('paragraph.moving');
    expect(notebookNodeArrangementState(editor, 'paragraph.moving').canMoveOutOfSection).toBe(true);

    expect(outdentNotebookNode(editor, 'paragraph.moving')).toBe(true);
    expect(editor.state.doc.child(1).attrs.id).toBe('paragraph.moving');
    expect(moveNotebookNodeInParent(editor, 'paragraph.moving', 'down')).toBe(true);
    expect(editor.state.doc.lastChild?.attrs.id).toBe('paragraph.moving');
  });

  it('normalizes floating object layer order while preserving one selected object', () => {
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
      extensions: [StarterKit, NotebookTestIds, NotebookSection, SemanticBlock, InlineMath],
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
