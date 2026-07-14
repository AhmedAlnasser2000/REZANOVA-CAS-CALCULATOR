import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { NotebookTransientLayerProvider } from '../transient-ui';
import { NotebookFontSize } from './NotebookFontSizeExtension';
import { NotebookSelectionToolbar } from './NotebookSelectionToolbar';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function renderSelectionToolbar() {
  editor = new Editor({
    content: '<p>Alpha beta</p>',
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      NotebookFontSize,
      Color,
    ],
  });
  editor.commands.setTextSelection({ from: 1, to: 6 });
  render(
    <NotebookTransientLayerProvider>
      <NotebookSelectionToolbar
        editor={editor}
        paletteRequest={null}
        selection={{ from: 1, to: 6 }}
      />
    </NotebookTransientLayerProvider>,
  );
  return editor;
}

describe('NotebookSelectionToolbar', () => {
  it('preserves the selected prose range for bold and italic marks', async () => {
    const user = userEvent.setup();
    const currentEditor = renderSelectionToolbar();

    await user.click(await screen.findByRole('button', { name: 'Bold selection' }));
    await user.click(screen.getByRole('button', { name: 'Italicize selection' }));

    expect(currentEditor.getHTML()).toContain('<strong><em>Alpha</em></strong>');
    expect(currentEditor.state.selection.from).toBe(1);
    expect(currentEditor.state.selection.to).toBe(6);
  });

  it('applies strikethrough, underline, and an exact typed font size to the selected prose range', async () => {
    const user = userEvent.setup();
    const currentEditor = renderSelectionToolbar();

    await user.click(await screen.findByRole('button', { name: 'Strikethrough selection' }));
    await user.click(screen.getByRole('button', { name: 'Underline selection' }));
    const size = screen.getByRole('textbox', { name: 'Selected text font size percent' });
    await user.clear(size);
    await user.type(size, '143');
    fireEvent.keyDown(size, { key: 'Enter' });

    expect(currentEditor.getHTML()).toContain('<s');
    expect(currentEditor.getHTML()).toContain('<u');
    expect(currentEditor.getHTML()).toContain('font-size: 143%');
    expect(currentEditor.state.selection.from).toBe(1);
    expect(currentEditor.state.selection.to).toBe(6);
  });

  it('keeps text color and highlight as separate palette modes with reset', async () => {
    const user = userEvent.setup();
    const currentEditor = renderSelectionToolbar();

    await user.click(await screen.findByRole('button', { name: 'Highlight selection' }));
    expect(screen.getByRole('button', { name: 'Highlight Blue' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('difficult to read');
    await user.click(screen.getByRole('button', { name: 'Highlight Blue' }));
    expect(currentEditor.getHTML()).toContain('data-color="#24506a"');

    await user.click(screen.getByRole('button', { name: 'Text Color' }));
    await user.click(screen.getByRole('button', { name: 'Text Sky blue' }));
    expect(currentEditor.getHTML()).toContain('rgb(157, 205, 240)');
    expect(currentEditor.getHTML()).toContain('data-color="#24506a"');

    await user.click(screen.getByRole('button', { name: 'Clear selected color' }));
    expect(currentEditor.getHTML()).not.toContain('rgb(157, 205, 240)');
    expect(currentEditor.getHTML()).toContain('data-color="#24506a"');
  });

  it('dismisses the palette before the toolbar without clearing the selection', async () => {
    const user = userEvent.setup();
    const currentEditor = renderSelectionToolbar();

    await user.click(await screen.findByRole('button', { name: 'Highlight selection' }));
    expect(screen.getByLabelText('Notebook selection colors')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    expect(screen.queryByLabelText('Notebook selection colors')).not.toBeInTheDocument();
    expect(screen.getByTestId('notebook-selection-toolbar')).toBeInTheDocument();
    fireEvent.keyUp(document, { key: 'Escape' });
    fireEvent.keyDown(document, { key: 'Escape', repeat: false });
    await waitFor(() => {
      expect(screen.queryByTestId('notebook-selection-toolbar')).not.toBeInTheDocument();
    });
    expect(currentEditor.state.selection.from).toBe(1);
    expect(currentEditor.state.selection.to).toBe(6);
  });
});
