import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../../../components/MathNotationContext';
import {
  NOTEBOOK_WORKSPACE_CLOSE_EVENT,
  NOTEBOOK_WORKSPACE_FOCUS_EVENT,
  NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT,
  createInMemoryNotebookLibraryPort,
  createNotebookLibraryService,
  createNotebookRichDocument,
  createNotebookRichSurfaceState,
  createNotebookStoredRecordV1,
  type NotebookWorkspaceFocusDetail,
  type NotebookWorkspaceOpenQueryDetail,
  type NotebookExportSavePort,
  type NotebookLibraryPort,
  type NotebookLibraryService,
  type NotebookPackagePort,
  type NotebookSurfaceState,
} from '../../../../lib/notebook';
import { NotebookPage } from '../../NotebookPage';

beforeAll(() => {
  if (!Range.prototype.getClientRects) {
    Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  }
  if (!Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = () => new DOMRect();
  }
  if (!document.elementFromPoint) {
    document.elementFromPoint = () =>
      document.querySelector('.notebook-rich-editor') ?? document.body;
  }
  if (!ShadowRoot.prototype.elementFromPoint) {
    ShadowRoot.prototype.elementFromPoint = () => null;
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});

function LibraryHarness({
  savePort,
  service,
}: {
  savePort?: NotebookExportSavePort;
  service: NotebookLibraryService;
}) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookRichSurfaceState({
      idPrefix: 'library-ui',
      now: () => new Date('2026-07-14T08:00:00.000Z'),
      title: 'Library UI',
    }));
  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
        exportSavePort={savePort}
        instanceId="notebook.library.ui"
        libraryService={service}
        onOpenMathInTool={vi.fn()}
        onUpdateSurfaceState={(_, nextState) => setSurfaceState(nextState)}
        surfaceState={surfaceState}
      />
    </MathNotationProvider>
  );
}

function spyLibraryPort(base: NotebookLibraryPort) {
  return {
    ...base,
    save: vi.fn(base.save.bind(base)),
  } satisfies NotebookLibraryPort;
}

function packagePort(): NotebookPackagePort {
  return {
    exportPortable: vi.fn(async () => new Uint8Array([80, 75])),
    importPortable: vi.fn(async () => {
      throw new Error('Import is not exercised by this UI test.');
    }),
    inspectPortable: vi.fn(async () => {
      throw new Error('Inspection is not exercised by this UI test.');
    }),
  };
}

function libraryRecord(libraryId: string, title: string) {
  return createNotebookStoredRecordV1(createNotebookRichDocument({
    idPrefix: libraryId,
    now: () => new Date('2026-07-15T10:00:00.000Z'),
    title,
  }), {
    libraryId,
    savedAt: '2026-07-15T10:00:00.000Z',
  });
}

describe('Notebook local document library', () => {
  it('creates a durable identity immediately, autosaves after settling, and saves now on Ctrl+S', async () => {
    const user = userEvent.setup();
    const library = spyLibraryPort(createInMemoryNotebookLibraryPort());
    const service = createNotebookLibraryService({ library });
    render(<LibraryHarness service={service} />);

    const title = await screen.findByLabelText('Notebook title');
    expect(library.save).toHaveBeenCalledTimes(1);
    expect((await library.list())[0]).toMatchObject({ title: 'Library UI', revision: 1 });

    await user.clear(title);
    await user.type(title, 'Autosaved Notebook');
    expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0);
    await waitFor(() => expect(library.save).toHaveBeenCalledTimes(2), { timeout: 2_000 });
    expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0);
    expect((await library.list())[0]).toMatchObject({
      title: 'Autosaved Notebook',
      revision: 2,
    });

    await user.type(title, ' now');
    await user.keyboard('{Control>}s{/Control}');
    await waitFor(() => expect(library.save).toHaveBeenCalledTimes(3));
    expect((await library.list())[0]).toMatchObject({
      title: 'Autosaved Notebook now',
      revision: 3,
    });
  });

  it('provides New, Templates, Open, Recent, All Notebooks, history, package, and Trash flows', async () => {
    const user = userEvent.setup();
    const service = createNotebookLibraryService({
      library: createInMemoryNotebookLibraryPort(),
      package: packagePort(),
    });
    render(<LibraryHarness service={service} />);
    await screen.findByLabelText('Notebook title');

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    expect(within(file).getByRole('button', { name: /New/ })).toBeInTheDocument();
    expect(within(file).getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
    expect(within(file).getByRole('button', { name: /Save portable Notebook/ })).toBeEnabled();
    expect(within(file).getByRole('button', { name: /Import .cwiznb/ })).toBeEnabled();

    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    expect(within(file).getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    expect(within(file).getByRole('heading', { name: 'All Notebooks' })).toBeInTheDocument();
    expect(within(file).getAllByText('Library UI').length).toBeGreaterThan(0);

    await user.click(within(file).getByRole('button', { name: 'Version History' }));
    expect(await within(file).findByText('Revision 1')).toBeInTheDocument();
    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    const allNotebooks = within(file).getByLabelText('All Notebooks');
    const currentNotebook = within(allNotebooks).getByRole('button', { name: /Library UI/ });
    fireEvent.contextMenu(currentNotebook);
    const actions = await screen.findByRole('menu', { name: 'Notebook actions' });
    await user.click(within(actions).getByRole('menuitem', { name: 'Move to Trash' }));
    await waitFor(() => expect(service.library.listTrash()).resolves.toHaveLength(1));

    await user.click(within(file).getByRole('button', { name: 'Trash' }));
    expect(within(file).getByText('Library UI')).toBeInTheDocument();
    await user.click(within(file).getByRole('button', { name: /Library UI/ }));
    await user.click(within(file).getByRole('button', { name: 'Restore 1 notebook' }));
    await waitFor(() => expect(service.library.listTrash()).resolves.toEqual([]));
    expect((await service.library.list()).map((entry) => entry.title)).toContain('Library UI');
  });

  it('focuses an already-open Notebook workspace instead of opening a divergent editor', async () => {
    const user = userEvent.setup();
    const library = createInMemoryNotebookLibraryPort();
    const service = createNotebookLibraryService({ library });
    render(<LibraryHarness service={service} />);
    await screen.findByLabelText('Notebook title');
    const openDocument = createNotebookRichDocument({
      idPrefix: 'already-open',
      now: () => new Date('2026-07-14T09:00:00.000Z'),
      title: 'Already Open',
    });
    const openRecord = createNotebookStoredRecordV1(openDocument, {
      libraryId: 'library.already-open',
      savedAt: '2026-07-14T09:00:00.000Z',
    });
    await library.save(openRecord, { expectedRevision: null });
    const focused = vi.fn();
    const handleFocus = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceFocusDetail>).detail;
      if (detail.libraryId === openRecord.libraryId) {
        detail.handled = true;
        focused();
      }
    };
    window.addEventListener(NOTEBOOK_WORKSPACE_FOCUS_EVENT, handleFocus);

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    const existingButtons = await within(file).findAllByRole('button', { name: /Already Open/ });
    await user.dblClick(existingButtons[0]!);
    expect(focused).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Notebook title')).toHaveValue('Library UI');
    window.removeEventListener(NOTEBOOK_WORKSPACE_FOCUS_EVENT, handleFocus);
  });

  it('routes portable copies through the destination save port', async () => {
    const user = userEvent.setup();
    const service = createNotebookLibraryService({
      library: createInMemoryNotebookLibraryPort(),
      package: packagePort(),
    });
    const savePort = {
      save: vi.fn(async () => 'cancelled' as const),
    } satisfies NotebookExportSavePort;
    render(<LibraryHarness savePort={savePort} service={service} />);
    await screen.findByLabelText('Notebook title');

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: /Save portable Notebook/ }));
    await waitFor(() => expect(savePort.save).toHaveBeenCalledOnce());
    expect(savePort.save).toHaveBeenCalledWith(expect.objectContaining({
      mimeType: 'application/vnd.calcwiz.notebook+zip',
      suggestedFileName: 'Library UI.cwiznb',
    }));
    expect(screen.getByRole('dialog', { name: 'Notebook File' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Save cancelled.');
  });

  it('selects Notebooks deliberately and exposes the right context actions', async () => {
    const user = userEvent.setup();
    const library = createInMemoryNotebookLibraryPort();
    const portable = packagePort();
    const service = createNotebookLibraryService({ library, package: portable });
    const savePort = {
      save: vi.fn(async () => 'saved' as const),
    } satisfies NotebookExportSavePort;
    const alpha = libraryRecord('library.alpha', 'Alpha Notebook');
    const beta = libraryRecord('library.beta', 'Beta Notebook');
    const locked = libraryRecord('library.locked', 'Locked Notebook');
    await library.save(alpha, { expectedRevision: null });
    await library.save(beta, { expectedRevision: null });
    await library.save(locked, { expectedRevision: null });
    const answerOpenQuery = (event: Event) => {
      const detail = (event as CustomEvent<NotebookWorkspaceOpenQueryDetail>).detail;
      if (detail.libraryId === locked.libraryId) {
        detail.open = true;
      }
    };
    window.addEventListener(NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT, answerOpenQuery);
    render(<LibraryHarness savePort={savePort} service={service} />);
    await screen.findByLabelText('Notebook title');

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    const allNotebooks = await within(file).findByLabelText('All Notebooks');
    const alphaRow = within(allNotebooks).getByRole('button', { name: /Alpha Notebook/ });
    const betaRow = within(allNotebooks).getByRole('button', { name: /Beta Notebook/ });
    const lockedRow = within(allNotebooks).getByRole('button', { name: /Locked Notebook/ });

    await user.click(alphaRow);
    fireEvent.click(betaRow, { ctrlKey: true });
    expect(alphaRow).toHaveAttribute('aria-pressed', 'true');
    expect(betaRow).toHaveAttribute('aria-pressed', 'true');
    fireEvent.contextMenu(alphaRow);
    const bulkMenu = await screen.findByRole('menu', { name: 'Notebook actions' });
    expect(within(bulkMenu).getByRole('menuitem', { name: 'Move 2 notebooks to Trash' })).toBeEnabled();
    expect(within(bulkMenu).queryByRole('menuitem', { name: 'Rename' })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu', { name: 'Notebook actions' })).not.toBeInTheDocument());

    await user.click(within(file).getByRole('button', { name: 'Clear selection' }));
    await user.click(alphaRow);
    fireEvent.click(betaRow, { shiftKey: true });
    expect(alphaRow).toHaveAttribute('aria-pressed', 'true');
    expect(betaRow).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(file).getByRole('button', { name: 'Clear selection' }));
    fireEvent.contextMenu(alphaRow);
    const menu = await screen.findByRole('menu', { name: 'Notebook actions' });
    await waitFor(() => expect(within(menu).getByRole('menuitem', { name: 'Open' })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(within(menu).getByRole('menuitem', { name: 'Rename' })).toHaveFocus();
    expect(within(menu).getByRole('menuitem', { name: 'Open' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Rename' })).toBeEnabled();
    expect(within(menu).getByRole('menuitem', { name: 'Duplicate' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Export portable copy' })).toBeEnabled();
    await user.click(within(menu).getByRole('menuitem', { name: 'Rename' }));
    const renameForm = within(file).getByRole('form', { name: 'Rename Notebook' });
    const renameInput = within(renameForm).getByLabelText('Notebook name');
    await user.clear(renameInput);
    await user.type(renameInput, 'Renamed Alpha');
    await user.click(within(renameForm).getByRole('button', { name: 'Rename' }));
    await waitFor(async () => expect((await library.load(alpha.libraryId))?.document.title).toBe('Renamed Alpha'));

    const renamedRow = within(allNotebooks).getByRole('button', { name: /Renamed Alpha/ });
    fireEvent.contextMenu(renamedRow);
    await user.click(within(await screen.findByRole('menu', { name: 'Notebook actions' })).getByRole('menuitem', { name: 'Duplicate' }));
    await waitFor(async () => expect((await library.list()).map((record) => record.title)).toContain('Renamed Alpha copy'));

    fireEvent.contextMenu(renamedRow);
    await user.click(within(await screen.findByRole('menu', { name: 'Notebook actions' })).getByRole('menuitem', { name: 'Export portable copy' }));
    await waitFor(() => expect(portable.exportPortable).toHaveBeenCalled());
    expect(savePort.save).toHaveBeenCalledWith(expect.objectContaining({
      mimeType: 'application/vnd.calcwiz.notebook+zip',
      suggestedFileName: 'Renamed Alpha.cwiznb',
    }));

    fireEvent.contextMenu(lockedRow);
    const lockedMenu = await screen.findByRole('menu', { name: 'Notebook actions' });
    expect(within(lockedMenu).getByRole('menuitem', { name: 'Rename' })).toBeDisabled();
    expect(within(lockedMenu).getByRole('menuitem', { name: 'Move to Trash' })).toBeDisabled();
    window.removeEventListener(NOTEBOOK_WORKSPACE_OPEN_QUERY_EVENT, answerOpenQuery);
  });

  it('supports multi-select Trash restore and confirmed permanent deletion', async () => {
    const user = userEvent.setup();
    const library = createInMemoryNotebookLibraryPort();
    const first = libraryRecord('library.trash.first', 'First trash Notebook');
    const second = libraryRecord('library.trash.second', 'Second trash Notebook');
    await library.save(first, { expectedRevision: null });
    await library.save(second, { expectedRevision: null });
    await library.moveToTrash(first.libraryId);
    await library.moveToTrash(second.libraryId);
    const service = createNotebookLibraryService({ library });
    render(<LibraryHarness service={service} />);
    await screen.findByLabelText('Notebook title');

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: 'Trash' }));
    const trash = await within(file).findByLabelText('Notebook Trash');
    const firstRow = within(trash).getByRole('button', { name: /First trash Notebook/ });
    const secondRow = within(trash).getByRole('button', { name: /Second trash Notebook/ });
    await user.click(firstRow);
    fireEvent.click(secondRow, { ctrlKey: true });
    expect(within(file).getByRole('button', { name: 'Restore 2 notebooks' })).toBeEnabled();
    await user.click(within(file).getByRole('button', { name: 'Delete 2 notebooks forever' }));
    const confirmation = within(file).getByRole('group', { name: 'Delete notebooks forever confirmation' });
    expect(confirmation).toHaveTextContent('This cannot be undone.');
    await user.click(within(confirmation).getByRole('button', { name: 'Cancel' }));
    expect(await library.listTrash()).toHaveLength(2);

    await user.click(within(file).getByRole('button', { name: 'Delete 2 notebooks forever' }));
    const finalConfirmation = within(file).getByRole('group', { name: 'Delete notebooks forever confirmation' });
    await user.click(within(finalConfirmation).getByRole('button', { name: 'Delete forever' }));
    await waitFor(() => expect(library.listTrash()).resolves.toEqual([]));
  });

  it('keeps a failed document resident and offers retry, recovery export, and close-without-saving', async () => {
    const user = userEvent.setup();
    const base = createInMemoryNotebookLibraryPort();
    let failWrites = false;
    const library: NotebookLibraryPort = {
      ...base,
      async save(record, options) {
        if (failWrites) {
          throw new Error('Simulated local quota failure.');
        }
        return base.save(record, options);
      },
    };
    const portable = packagePort();
    const service = createNotebookLibraryService({ library, package: portable });
    const savePort = {
      save: vi.fn(async () => 'saved' as const),
    } satisfies NotebookExportSavePort;
    const close = vi.fn();
    window.addEventListener(NOTEBOOK_WORKSPACE_CLOSE_EVENT, close, { once: true });
    render(<LibraryHarness savePort={savePort} service={service} />);

    const title = await screen.findByLabelText('Notebook title');
    failWrites = true;
    fireEvent.change(title, { target: { value: 'Library UI unsaved' } });
    await user.keyboard('{Control>}s{/Control}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Simulated local quota failure.');
    expect(title).toHaveValue('Library UI unsaved');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: /^New/ }));
    expect(file).toBeInTheDocument();
    await user.click(within(file).getByRole('button', { name: 'Close Notebook File' }));

    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Export recovery copy' }));
    await waitFor(() => expect(portable.exportPortable).toHaveBeenCalled());
    expect(savePort.save).toHaveBeenCalledWith(expect.objectContaining({
      mimeType: 'application/vnd.calcwiz.notebook+zip',
      suggestedFileName: 'Recovery - Library UI unsaved.cwiznb',
    }));
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Close without saving' }));
    expect(close).toHaveBeenCalled();

    failWrites = false;
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
  });

  it('keeps failed bulk Trash targets selected and names the local failure', async () => {
    const user = userEvent.setup();
    const base = createInMemoryNotebookLibraryPort();
    const alpha = libraryRecord('library.bulk.alpha', 'Alpha bulk Notebook');
    const beta = libraryRecord('library.bulk.beta', 'Beta bulk Notebook');
    await base.save(alpha, { expectedRevision: null });
    await base.save(beta, { expectedRevision: null });
    const library: NotebookLibraryPort = {
      ...base,
      async moveToTrash(libraryId) {
        if (libraryId === beta.libraryId) {
          throw new Error('Local storage rejected Beta.');
        }
        return base.moveToTrash(libraryId);
      },
    };
    const service = createNotebookLibraryService({ library });
    render(<LibraryHarness service={service} />);
    await screen.findByLabelText('Notebook title');

    await user.click(screen.getByRole('button', { name: 'File' }));
    const file = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    const allNotebooks = await within(file).findByLabelText('All Notebooks');
    const alphaRow = within(allNotebooks).getByRole('button', { name: /Alpha bulk Notebook/ });
    const betaRow = within(allNotebooks).getByRole('button', { name: /Beta bulk Notebook/ });
    await user.click(alphaRow);
    fireEvent.click(betaRow, { ctrlKey: true });
    fireEvent.contextMenu(alphaRow);
    await user.click(within(await screen.findByRole('menu', { name: 'Notebook actions' })).getByRole('menuitem', { name: 'Move 2 notebooks to Trash' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Beta bulk Notebook: Local storage rejected Beta.'));
    expect(within(allNotebooks).getByRole('button', { name: /Beta bulk Notebook/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
