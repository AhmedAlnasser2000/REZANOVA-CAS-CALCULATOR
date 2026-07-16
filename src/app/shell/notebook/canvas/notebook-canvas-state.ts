import type { Editor } from '@tiptap/core';
import { AllSelection, TextSelection } from '@tiptap/pm/state';

import { detectNotebookMathCandidates } from '../../../../lib/notebook';
import type { NotebookProseSelection } from './NotebookSelectionToolbar';

export function selectedParagraphSuggestion(editor: Editor | null) {
  if (!editor) return null;
  const { selection } = editor.state;
  if (selection.empty) return null;
  const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
  const candidate = detectNotebookMathCandidates(selectedText)[0];
  return candidate ? {
    ...candidate,
    from: selection.from + candidate.start,
    to: selection.from + candidate.end,
  } : null;
}

export function selectedProseRange(editor: Editor): NotebookProseSelection | null {
  const { selection } = editor.state;
  if (!(selection instanceof TextSelection || selection instanceof AllSelection) || selection.empty) {
    return null;
  }
  let containsText = false;
  editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (node.isText && node.textContent.trim()) containsText = true;
  });
  return containsText ? { from: selection.from, to: selection.to } : null;
}

export function isPristineNotebook(editor: Editor) {
  const paragraph = editor.state.doc.firstChild;
  if (editor.state.doc.childCount !== 1 || paragraph?.type.name !== 'paragraph') return false;
  return paragraph.content.size === 0
    && paragraph.attrs.notebookAlignment == null
    && paragraph.attrs.notebookLineSpacing == null
    && paragraph.attrs.notebookSpaceBeforePt == null
    && paragraph.attrs.notebookSpaceAfterPt == null
    && paragraph.attrs.notebookLeftIndentPt == null;
}
