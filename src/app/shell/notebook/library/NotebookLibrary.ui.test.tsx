import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { MathNotationProvider } from '../../../../components/MathNotationContext';
import {
  NOTEBOOK_WORKSPACE_CLOSE_EVENT,
  NOTEBOOK_WORKSPACE_FOCUS_EVENT,
  createInMemoryNotebookLibraryPort,
  createNotebookLibraryService,
  createNotebookRichDocument,
  createNotebookRichSurfaceState,
  createNotebookStoredRecordV1,
  type NotebookWorkspaceFocusDetail,
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

function LibraryHarness({ service }: { service: NotebookLibraryService }) {
  const [surfaceState, setSurfaceState] = useState<NotebookSurfaceState>(() =>
    createNotebookRichSurfaceState({
      idPrefix: 'library-ui',
      now: () => new Date('2026-07-14T08:00:00.000Z'),
      title: 'Library UI',
    }));
  return (
    <MathNotationProvider notationMode="latex">
      <NotebookPage
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
    expect(within(file).getByRole('button', { name: /Export .cwiznb/ })).toBeEnabled();
    expect(within(file).getByRole('button', { name: /Import .cwiznb/ })).toBeEnabled();

    await user.click(within(file).getByRole('button', { name: /^Open$/ }));
    expect(within(file).getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    expect(within(file).getByRole('heading', { name: 'All Notebooks' })).toBeInTheDocument();
    expect(within(file).getAllByText('Library UI').length).toBeGreaterThan(0);

    await user.click(within(file).getByRole('button', { name: 'Version History' }));
    expect(await within(file).findByText('Revision 1')).toBeInTheDocument();
    await user.click(within(file).getByRole('button', { name: /^File$/ }));
    await user.click(within(file).getByRole('button', { name: 'Move current notebook to Trash' }));
    await waitFor(() => expect(service.library.listTrash()).resolves.toHaveLength(1));

    await user.click(screen.getByRole('button', { name: 'File' }));
    const reopened = screen.getByRole('dialog', { name: 'Notebook File' });
    await user.click(within(reopened).getByRole('button', { name: 'Trash' }));
    expect(within(reopened).getByText('Library UI')).toBeInTheDocument();
    await user.click(within(reopened).getByRole('button', { name: 'Restore' }));
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
    await user.click(existingButtons[0]!);
    expect(focused).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Notebook title')).toHaveValue('Library UI');
    window.removeEventListener(NOTEBOOK_WORKSPACE_FOCUS_EVENT, handleFocus);
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
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:notebook-recovery');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const close = vi.fn();
    window.addEventListener(NOTEBOOK_WORKSPACE_CLOSE_EVENT, close, { once: true });
    render(<LibraryHarness service={service} />);

    const title = await screen.findByLabelText('Notebook title');
    failWrites = true;
    fireEvent.change(title, { target: { value: 'Library UI unsaved' } });
    await user.keyboard('{Control>}s{/Control}');
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Simulated local quota failure.');
    expect(title).toHaveValue('Library UI unsaved');
    expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Export recovery copy' }));
    await waitFor(() => expect(portable.exportPortable).toHaveBeenCalled());
    expect(click).toHaveBeenCalled();
    await user.click(within(alert).getByRole('button', { name: 'Close without saving' }));
    expect(close).toHaveBeenCalled();

    failWrites = false;
    await user.click(within(alert).getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getAllByText('Saved locally').length).toBeGreaterThan(0));
  });
});
