import type { Editor } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';

export type NotebookToolbarSelection = ReturnType<Selection['toJSON']>;

export function captureNotebookToolbarSelection(editor: Editor): NotebookToolbarSelection {
  return editor.state.selection.toJSON();
}

export function restoreNotebookToolbarSelection(
  editor: Editor,
  selection: NotebookToolbarSelection | null,
) {
  if (selection) {
    try {
      const restored = Selection.fromJSON(editor.state.doc, selection);
      editor.view.dispatch(editor.state.tr.setSelection(restored));
    } catch {
      // A document replacement may invalidate an old menu bookmark; keep the live selection.
    }
  }
  return editor.chain().focus();
}
