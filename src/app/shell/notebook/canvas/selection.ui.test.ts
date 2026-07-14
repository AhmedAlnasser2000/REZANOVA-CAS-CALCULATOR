import { Editor, Extension, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NodeSelection } from '@tiptap/pm/state';
import { afterEach, describe, expect, it } from 'vitest';

import { notebookInspectorSelection } from './selection';

const NotebookTestIds = Extension.create({
  name: 'notebookTestIds',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'notebookSection', 'semanticBlock', 'inlineMath'],
      attributes: { id: { default: null } },
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
