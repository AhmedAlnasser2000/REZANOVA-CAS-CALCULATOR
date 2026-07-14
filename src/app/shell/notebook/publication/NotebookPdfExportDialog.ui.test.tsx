import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createNotebookLibraryService,
  createNotebookRichDocument,
  createNotebookStoredRecordV1,
  type NotebookRichDocument,
} from '../../../../lib/notebook';
import { NotebookPdfExportDialog } from './NotebookPdfExportDialog';

vi.mock('mathlive', () => ({
  convertLatexToMarkup: vi.fn((latex: string) => `<span class="ML__mathlive">${latex}</span>`),
}));

const NOW = '2026-07-14T08:00:00.000Z';

function fixture() {
  const base = createNotebookRichDocument({ now: () => new Date(NOW), title: 'Limit laws' });
  const document: NotebookRichDocument = {
    ...base,
    headerFooter: {
      headerText: 'Calculus notes',
      footerText: 'Rezanova',
      differentFirstPage: false,
      pageNumbering: { enabled: true, position: 'right', startAt: 3 },
    },
    content: [
      { type: 'paragraph', id: 'intro', content: [{ type: 'text', text: 'A printable introduction.' }] },
      {
        type: 'section',
        id: 'limits',
        title: 'Limits',
        content: [{
          type: 'videoFigure',
          id: 'lesson',
          assetId: `sha256:${'a'.repeat(64)}`,
          title: 'Limit lesson',
          description: 'Approaching a finite limit.',
          caption: 'Worked explanation',
          numbered: true,
        }],
      },
    ],
  };
  return {
    assetPort: createNotebookLibraryService().asset,
    layout: {
      pageCount: 2,
      fragments: [
        { id: 'intro', page: 1, offsetPt: 0, heightPt: 40, scale: 1, fragment: 0 },
        { id: 'limits', page: 2, offsetPt: 0, heightPt: 260, scale: 1, fragment: 0 },
      ],
    },
    record: createNotebookStoredRecordV1(document, {
      libraryId: 'library.pdf',
      revision: 4,
      savedAt: NOW,
    }),
  };
}

describe('Notebook PDF publication dialog', () => {
  beforeEach(() => {
    vi.stubGlobal('print', vi.fn());
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => (
      globalThis.setTimeout(() => callback(performance.now()), 0) as unknown as number
    ));
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => globalThis.clearTimeout(handle));
    if (!URL.createObjectURL) vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    document.body.classList.remove('notebook-pdf-printing');
    vi.unstubAllGlobals();
  });

  it('previews static publication substitutions and invokes the system print flow', async () => {
    const user = userEvent.setup();
    const source = fixture();
    render(<NotebookPdfExportDialog
      {...source}
      sourceViewMode="print"
      onClose={vi.fn()}
    />);

    const dialog = screen.getByRole('dialog', { name: 'Print or save Notebook as PDF' });
    expect(await within(dialog).findByText('Interactive video has no poster and will be represented by descriptive text only.')).toBeInTheDocument();
    expect(screen.getByTestId('notebook-print-projection')).toBeInTheDocument();
    expect(screen.getAllByText('Calculus notes')).toHaveLength(2);
    expect(screen.getByText('Interactive playback is available in the Web package.')).toBeInTheDocument();
    expect(document.querySelectorAll('.notebook-print-page')).toHaveLength(2);

    await user.click(within(dialog).getByRole('button', { name: 'Open system print dialog' }));
    await waitFor(() => expect(globalThis.print).toHaveBeenCalledOnce());
  });

  it('supports exact physical-page and selected-Section scopes', async () => {
    const user = userEvent.setup();
    const source = fixture();
    render(<NotebookPdfExportDialog
      {...source}
      sourceViewMode="print"
      onClose={vi.fn()}
    />);
    const dialog = screen.getByRole('dialog', { name: 'Print or save Notebook as PDF' });
    await within(dialog).findByText('Interactive video has no poster and will be represented by descriptive text only.');

    await user.click(within(dialog).getByLabelText('Physical pages'));
    await user.clear(within(dialog).getByLabelText('PDF from page'));
    await user.type(within(dialog).getByLabelText('PDF from page'), '2');
    await user.clear(within(dialog).getByLabelText('PDF to page'));
    await user.type(within(dialog).getByLabelText('PDF to page'), '2');
    await waitFor(() => expect(document.querySelectorAll('.notebook-print-page')).toHaveLength(1));
    expect(document.querySelector('.notebook-print-page')).toHaveAttribute('data-page', '2');

    await user.click(within(dialog).getByLabelText('Selected Sections'));
    expect(await within(dialog).findByLabelText('Limits')).toBeChecked();
    await waitFor(() => expect(document.querySelectorAll('.notebook-print-page')).toHaveLength(1));
    expect(within(dialog).getByText('Selected Sections are repaginated as a new PDF publication.')).toBeInTheDocument();
  });
});
