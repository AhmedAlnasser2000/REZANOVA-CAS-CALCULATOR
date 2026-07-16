// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createInMemoryNotebookAssetPort } from '../../../../lib/notebook';
import { isNotebookObjectPlacement } from '../../../../lib/notebook/document/object-placement';
import { createNotebookExtensions } from './extensions';
import { notebookPaginationDocumentMetadata } from './notebook-pagination-dom';

const FLOATING_DIVIDER = {
  type: 'horizontalRule',
  attrs: {
    id: 'divider.float',
    notebookObjectPlacement: {
      mode: 'floating',
      anchor: { kind: 'paragraph', nodeId: 'paragraph.second' },
      horizontalReference: 'margins',
      verticalReference: 'margins',
      xPt: 0,
      yPt: 0,
      widthPt: 120,
      wrap: 'in-front',
      textDistancePt: { top: 0, right: 0, bottom: 0, left: 0 },
      zOrder: 0,
    },
  },
};

function floatingAnchor(editor: Editor) {
  let anchor: unknown;
  editor.state.doc.descendants((node) => {
    if (node.attrs.id === 'divider.float') {
      anchor = node.attrs.notebookObjectPlacement?.anchor;
    }
  });
  return anchor;
}

function paragraphIds(editor: Editor) {
  const ids: string[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'paragraph') ids.push(String(node.attrs.id));
  });
  return ids;
}

describe('Notebook floating paragraph-anchor repair', () => {
  it('reattaches to the nearest preceding paragraph in the same undo event', () => {
    const editor = new Editor({
      extensions: createNotebookExtensions(
        () => undefined,
        createInMemoryNotebookAssetPort(),
      ),
      content: {
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { id: 'paragraph.first' },
          content: [{ type: 'text', text: 'First' }],
        }, {
          type: 'paragraph',
          attrs: { id: 'paragraph.second' },
          content: [{ type: 'text', text: 'Second' }],
        }, FLOATING_DIVIDER],
      },
    });
    try {
      expect(isNotebookObjectPlacement(editor.state.doc.lastChild?.attrs.notebookObjectPlacement))
        .toBe(true);
      expect(notebookPaginationDocumentMetadata(editor.state.doc).nodes
        .get('divider.float')?.objectPlacement).toMatchObject({ mode: 'floating' });
      let secondPosition = -1;
      let secondSize = 0;
      editor.state.doc.descendants((node, position) => {
        if (node.attrs.id === 'paragraph.second') {
          secondPosition = position;
          secondSize = node.nodeSize;
        }
      });
      editor.view.dispatch(
        editor.state.tr.delete(secondPosition, secondPosition + secondSize),
      );
      expect(paragraphIds(editor)).not.toContain('paragraph.second');
      expect(floatingAnchor(editor)).toEqual({
        kind: 'paragraph',
        nodeId: 'paragraph.first',
      });

      expect(editor.commands.undo()).toBe(true);
      expect(floatingAnchor(editor)).toEqual({
        kind: 'paragraph',
        nodeId: 'paragraph.second',
      });
    } finally {
      editor.destroy();
    }
  });
});
