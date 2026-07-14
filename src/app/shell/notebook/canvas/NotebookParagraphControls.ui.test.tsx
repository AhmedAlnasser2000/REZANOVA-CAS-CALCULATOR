import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { NotebookTransientLayerProvider } from '../transient-ui';
import { NotebookParagraphControls } from './NotebookParagraphControls';
import { NotebookParagraphFormatting } from './NotebookParagraphFormattingExtension';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function renderControls(content: string | Record<string, unknown> = '<p>Alpha</p><p>Beta</p>') {
  editor = new Editor({
    content,
    extensions: [StarterKit, NotebookParagraphFormatting],
  });
  editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
  render(
    <NotebookTransientLayerProvider>
      <div className="notebook-rich-toolbar">
        <NotebookParagraphControls editor={editor} />
      </div>
    </NotebookTransientLayerProvider>,
  );
  return editor;
}

function paragraphAttrs(currentEditor: Editor) {
  const attrs: Array<Record<string, unknown>> = [];
  currentEditor.state.doc.descendants((node) => {
    if (node.type.name === 'paragraph' || node.type.name === 'heading') {
      attrs.push(node.attrs);
    }
  });
  return attrs;
}

describe('NotebookParagraphControls', () => {
  it('normalizes alignment and line/paragraph spacing across the preserved selection', async () => {
    const user = userEvent.setup();
    const currentEditor = renderControls();
    const originalSelection = {
      from: currentEditor.state.selection.from,
      to: currentEditor.state.selection.to,
    };

    await user.click(screen.getByRole('button', { name: 'Align center' }));
    expect(paragraphAttrs(currentEditor).map((attrs) => attrs.notebookAlignment))
      .toEqual(['center', 'center']);
    expect(currentEditor.state.selection).toMatchObject(originalSelection);

    await user.click(screen.getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Line spacing 1.5' }));
    await user.click(screen.getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Before 12 pt' }));
    await user.click(screen.getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'After 18 pt' }));

    expect(paragraphAttrs(currentEditor)).toEqual([
      expect.objectContaining({
        notebookAlignment: 'center',
        notebookLineSpacing: 1.5,
        notebookSpaceBeforePt: 12,
        notebookSpaceAfterPt: 18,
      }),
      expect.objectContaining({
        notebookAlignment: 'center',
        notebookLineSpacing: 1.5,
        notebookSpaceBeforePt: 12,
        notebookSpaceAfterPt: 18,
      }),
    ]);

    await user.click(screen.getByRole('button', { name: /Line and paragraph spacing/ }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Default spacing' }));
    expect(paragraphAttrs(currentEditor)).toEqual([
      expect.objectContaining({
        notebookAlignment: 'center',
        notebookLineSpacing: null,
        notebookSpaceBeforePt: null,
        notebookSpaceAfterPt: null,
      }),
      expect.objectContaining({
        notebookAlignment: 'center',
        notebookLineSpacing: null,
        notebookSpaceBeforePt: null,
        notebookSpaceAfterPt: null,
      }),
    ]);
  });

  it('creates, restyles, converts, nests, and unnests persisted list kinds', async () => {
    const user = userEvent.setup();
    const currentEditor = renderControls();

    await user.click(screen.getByRole('button', { name: 'Bullet styles' }));
    const squareChoice = screen.getByRole('menuitemradio', { name: 'Square bullets' });
    expect(squareChoice.querySelectorAll('.notebook-list-style-preview b')).toHaveLength(3);
    expect(squareChoice).toHaveTextContent('▪');
    await user.click(squareChoice);
    expect(currentEditor.getJSON().content?.[0]).toMatchObject({
      type: 'bulletList',
      attrs: { notebookListStyle: 'square' },
      content: [expect.any(Object), expect.any(Object)],
    });

    await user.click(screen.getByRole('button', { name: 'Numbering styles' }));
    const romanChoice = screen.getByRole('menuitemradio', { name: 'Lower-roman numbering' });
    expect(romanChoice).toHaveTextContent('i.ii.iii.');
    await user.click(romanChoice);
    expect(currentEditor.getJSON().content?.[0]).toMatchObject({
      type: 'orderedList',
      attrs: { notebookListStyle: 'lower-roman' },
      content: [expect.any(Object), expect.any(Object)],
    });

    let betaPosition = 0;
    currentEditor.state.doc.descendants((node, position) => {
      if (node.type.name === 'paragraph' && node.textContent === 'Beta') {
        betaPosition = position + 1;
      }
    });
    currentEditor.commands.setTextSelection(betaPosition);
    expect(currentEditor.commands.keyboardShortcut('Tab')).toBe(true);
    expect(currentEditor.getJSON().content?.[0]).toMatchObject({
      type: 'orderedList',
      content: [{
        content: expect.arrayContaining([
          expect.objectContaining({ type: 'orderedList' }),
        ]),
      }],
    });
    expect(currentEditor.commands.keyboardShortcut('Shift-Tab')).toBe(true);
    expect(currentEditor.getJSON().content?.[0]?.content).toHaveLength(2);

    currentEditor.commands.setContent('<p>Solo</p>');
    currentEditor.commands.setTextSelection(1);
    await user.click(screen.getByRole('button', { name: 'Bullet list' }));
    expect(currentEditor.getJSON().content?.[0]).toMatchObject({
      type: 'bulletList',
      attrs: { notebookListStyle: 'disc' },
    });
    await user.click(screen.getByRole('button', { name: 'Bullet list' }));
    expect(currentEditor.getJSON().content?.[0]?.type).toBe('paragraph');
  });

  it('shows neutral mixed states and normalizes them with one choice', async () => {
    const user = userEvent.setup();
    const currentEditor = renderControls({
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { notebookAlignment: 'left', notebookLineSpacing: 1 },
        content: [{ type: 'text', text: 'Alpha' }],
      }, {
        type: 'heading',
        attrs: { level: 2, notebookAlignment: 'right', notebookLineSpacing: 2 },
        content: [{ type: 'text', text: 'Beta' }],
      }],
    });

    expect(screen.getByRole('button', { name: 'Align left' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Align right' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Line and paragraph spacing: Mixed' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Justify' }));
    expect(paragraphAttrs(currentEditor).slice(0, 2).map((attrs) => attrs.notebookAlignment))
      .toEqual(['justify', 'justify']);
  });

  it('dismisses transient menus without losing the editor range and preserves undo/redo', async () => {
    const user = userEvent.setup();
    const currentEditor = renderControls();
    const original = currentEditor.state.selection.toJSON();

    await user.click(screen.getByRole('button', { name: /Line and paragraph spacing/ }));
    expect(screen.getByRole('menu', { name: 'Line and paragraph spacing' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Line and paragraph spacing' })).not.toBeInTheDocument();
    });
    expect(currentEditor.state.selection.toJSON()).toEqual(original);

    fireEvent.keyUp(document, { key: 'Escape' });
    await user.click(screen.getByRole('button', { name: 'Align right' }));
    expect(paragraphAttrs(currentEditor)[0]?.notebookAlignment).toBe('right');
    expect(currentEditor.commands.undo()).toBe(true);
    expect(paragraphAttrs(currentEditor)[0]?.notebookAlignment).toBeNull();
    expect(currentEditor.commands.redo()).toBe(true);
    expect(paragraphAttrs(currentEditor)[0]?.notebookAlignment).toBe('right');
  });
});
