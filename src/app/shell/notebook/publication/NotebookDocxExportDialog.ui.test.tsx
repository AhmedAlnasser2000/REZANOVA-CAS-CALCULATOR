import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  createNotebookLibraryService,
  createNotebookRichDocument,
  createNotebookStoredRecordV1,
  type NotebookRichDocument,
} from '../../../../lib/notebook';
import { NotebookDocxExportDialog } from './NotebookDocxExportDialog';

const NOW = '2026-07-14T12:00:00.000Z';

function fixture() {
  const base = createNotebookRichDocument({ now: () => new Date(NOW), title: 'Word export' });
  const document: NotebookRichDocument = {
    ...base,
    content: [
      {
        type: 'section', id: 'limits', title: 'Limits',
        content: [{ type: 'displayMath', id: 'fallback', sourceText: '\\begin{matrix}', latex: '\\begin{matrix}', workspaceTarget: 'calculate' }],
      },
      {
        type: 'videoFigure', id: 'lesson', assetId: `sha256:${'a'.repeat(64)}`,
        title: 'Lesson', description: 'Recorded explanation.',
      },
    ],
  };
  return {
    assetPort: createNotebookLibraryService().asset,
    layout: { pageCount: 1, fragments: [] },
    record: createNotebookStoredRecordV1(document, { libraryId: 'library.docx-ui', revision: 2, savedAt: NOW }),
  };
}

describe('Notebook Word publication dialog', () => {
  it('shows compatibility before export and supports selected Section scope', async () => {
    const user = userEvent.setup();
    render(<NotebookDocxExportDialog {...fixture()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Export Notebook as Word document' });

    expect(await within(dialog).findByText(/static SVG\/PNG visual/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/Interactive video has no poster/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/reflows and does not preserve Notebook physical page numbers/u)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Download .docx' })).toBeEnabled();

    await user.click(within(dialog).getByLabelText('Selected Sections'));
    expect(await within(dialog).findByLabelText('Limits')).toBeChecked();
    expect(within(dialog).queryByText(/Interactive video has no poster/u)).not.toBeInTheDocument();

    await user.click(within(dialog).getByLabelText('Limits'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Download .docx' })).toBeDisabled());
  });

  it('closes with Escape without starting an export', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<NotebookDocxExportDialog {...fixture()} onClose={onClose} />);
    await screen.findByRole('button', { name: 'Download .docx' });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
