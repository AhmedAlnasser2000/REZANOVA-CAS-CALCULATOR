import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  createNotebookLibraryService,
  createNotebookRichDocument,
  createNotebookStoredRecordV1,
  type NotebookExportSavePort,
  type NotebookRichDocument,
} from '../../../../lib/notebook';
import { NotebookWebExportDialog } from './NotebookWebExportDialog';

const NOW = '2026-07-14T15:00:00.000Z';

async function fixture() {
  const service = createNotebookLibraryService();
  const image = await service.asset.put(new Uint8Array([1, 2, 3]), 'image/png', NOW);
  const base = createNotebookRichDocument({ now: () => new Date(NOW), title: 'Web export' });
  const document: NotebookRichDocument = {
    ...base,
    content: [
      {
        type: 'section', id: 'limits', title: 'Limits',
        content: [{ type: 'displayMath', id: 'fallback', sourceText: '\\unknowncommand{x}', latex: '\\unknowncommand{x}', workspaceTarget: 'calculate' }],
      },
      {
        type: 'imageFigure', id: 'crop', assetId: image.id,
        altText: 'Limit graph', crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      },
    ],
  };
  return {
    assetPort: service.asset,
    layout: { pageCount: 1, fragments: [] },
    record: createNotebookStoredRecordV1(document, { libraryId: 'library.web-ui', revision: 2, savedAt: NOW }),
  };
}

describe('Notebook Web publication dialog', () => {
  it('shows compatibility before export and supports selected Section scope', async () => {
    const user = userEvent.setup();
    render(<NotebookWebExportDialog {...await fixture()} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Export Notebook as Web package' });

    expect(await within(dialog).findByText(/safe static MathML conversion failed/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/approximates the Notebook image crop/u)).toBeInTheDocument();
    expect(within(dialog).getByText(/self-contained, read-only publication/u)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Save Web package' })).toBeEnabled();

    await user.click(within(dialog).getByLabelText('Selected Sections'));
    expect(await within(dialog).findByLabelText('Limits')).toBeChecked();
    await waitFor(() => expect(
      within(dialog).queryByText(/approximates the Notebook image crop/u),
    ).not.toBeInTheDocument());

    await user.click(within(dialog).getByLabelText('Limits'));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Save Web package' })).toBeDisabled());
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/safe static MathML conversion failed/u)).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Select at least one Section/u)).toBeInTheDocument();
  });

  it('closes with Escape without starting an export', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<NotebookWebExportDialog {...await fixture()} onClose={onClose} />);
    await screen.findByRole('button', { name: 'Save Web package' });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the dialog open when the destination chooser is cancelled', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const savePort = {
      save: vi.fn(async () => 'cancelled' as const),
    } satisfies NotebookExportSavePort;
    render(<NotebookWebExportDialog {...await fixture()} onClose={onClose} savePort={savePort} />);
    const dialog = screen.getByRole('dialog', { name: 'Export Notebook as Web package' });
    await user.click(await within(dialog).findByRole('button', { name: 'Save Web package' }));
    await waitFor(() => expect(savePort.save).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Export Notebook as Web package' })).toBeInTheDocument();
  });
});
