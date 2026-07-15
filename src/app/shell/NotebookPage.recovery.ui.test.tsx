import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../components/MathNotationContext';
import {
  createInMemoryNotebookLibraryPort,
  createNotebookLibraryService,
  createNotebookLibrarySurfaceState,
  createNotebookRichDocument,
  createNotebookStoredRecordV1,
  type NotebookExportSavePort,
  type NotebookLibraryPort,
  type NotebookSurfaceState,
} from '../../lib/notebook';
import { NotebookPage } from './NotebookPage';

function RecoveryHarness({
  exportSavePort,
  initialState,
  library,
}: {
  exportSavePort: NotebookExportSavePort;
  initialState: NotebookSurfaceState;
  library: NotebookLibraryPort;
}) {
  const [surfaceState, setSurfaceState] = useState(initialState);

  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
        exportSavePort={exportSavePort}
        instanceId="notebook.recovery.ui"
        libraryService={createNotebookLibraryService({ library })}
        surfaceState={surfaceState}
        onOpenMathInTool={vi.fn()}
        onUpdateSurfaceState={(_, nextState) => setSurfaceState(nextState)}
      />
    </MathNotationProvider>
  );
}

describe('NotebookPage recovery', () => {
  it('shows specific open recovery actions without rewriting the original record', async () => {
    const user = userEvent.setup();
    const blockedRecord = createNotebookStoredRecordV1(createNotebookRichDocument({
      idPrefix: 'blocked-notebook',
      title: 'Blocked Notebook',
    }), { libraryId: 'library.blocked' });
    const availableRecord = createNotebookStoredRecordV1(createNotebookRichDocument({
      idPrefix: 'available-notebook',
      title: 'Available Notebook',
    }), { libraryId: 'library.available' });
    const base = createInMemoryNotebookLibraryPort([blockedRecord, availableRecord]);
    const library: NotebookLibraryPort = {
      ...base,
      async load(libraryId) {
        if (libraryId === blockedRecord.libraryId) {
          throw 'NOTEBOOK_SCHEMA_NEWER: This Notebook requires a newer Calcwiz version.';
        }
        return base.load(libraryId);
      },
    };
    const save = vi.fn(async () => 'saved' as const);

    render(
      <RecoveryHarness
        exportSavePort={{ save }}
        initialState={createNotebookLibrarySurfaceState({
          libraryId: blockedRecord.libraryId,
          revision: blockedRecord.revision,
          title: blockedRecord.document.title,
        })}
        library={library}
      />,
    );

    expect(await screen.findByText('Update Calcwiz to open this Notebook')).toBeInTheDocument();
    expect(screen.getByText('The original local record has not been rewritten.')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Export raw recovery' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      mimeType: 'application/json',
      suggestedFileName: 'Raw recovery - Blocked Notebook.json',
    }));
    expect(await screen.findByText(/not an importable \.cwiznb file/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open Notebook Library' }));
    expect(await screen.findByRole('button', { name: /Available Notebook/ })).toBeInTheDocument();
  });
});
