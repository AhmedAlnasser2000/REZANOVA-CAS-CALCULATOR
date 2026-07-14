import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  NOTEBOOK_BROWSER_DOWNLOAD_FALLBACK_NOTICE,
  createNotebookExportSavePort,
  normalizeNotebookExportFileName,
} from './export-save';

afterEach(() => {
  vi.useRealTimers();
});

describe('Notebook export save port', () => {
  it('sanitizes suggested names and adds the format extension when absent', () => {
    expect(normalizeNotebookExportFileName('  Lesson: limits  ', 'application/pdf'))
      .toBe('Lesson- limits.pdf');
    expect(normalizeNotebookExportFileName('Lesson.DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
      .toBe('Lesson.DOCX');
    expect(normalizeNotebookExportFileName('...', 'application/zip')).toBe('Notebook export.zip');
  });

  it('uses the native chunked save commands when running in Tauri', async () => {
    const invoke = vi.fn(async (command: string) => {
      if (command === 'notebook_begin_export_save') return 'notebook.export.1';
      return undefined;
    });
    const bytes = new Uint8Array(1024 * 1024 + 2).fill(7);
    const port = createNotebookExportSavePort({
      invoke,
      window: { __TAURI_INTERNALS__: {} },
    });

    await expect(port.save({
      bytes,
      mimeType: 'application/vnd.calcwiz.notebook+zip',
      suggestedFileName: 'Lesson 1',
    })).resolves.toBe('saved');

    expect(invoke).toHaveBeenNthCalledWith(1, 'notebook_begin_export_save', {
      byteLength: bytes.byteLength,
      extension: 'cwiznb',
      filterName: 'Notebook export',
      suggestedFileName: 'Lesson 1.cwiznb',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'notebook_append_export_save', {
      uploadId: 'notebook.export.1',
      chunk: Array.from(bytes.subarray(0, 1024 * 1024)),
    });
    expect(invoke).toHaveBeenNthCalledWith(3, 'notebook_append_export_save', {
      uploadId: 'notebook.export.1',
      chunk: [7, 7],
    });
    expect(invoke).toHaveBeenNthCalledWith(4, 'notebook_finish_export_save', {
      uploadId: 'notebook.export.1',
    });
  });

  it('reports a cancelled native save without uploading bytes', async () => {
    const invoke = vi.fn(async () => null);
    const port = createNotebookExportSavePort({
      invoke,
      window: { __TAURI_INTERNALS__: {} },
    });

    await expect(port.save({
      bytes: new Uint8Array([1]),
      suggestedFileName: 'Cancelled',
    })).resolves.toBe('cancelled');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('aborts a native upload after a chunk failure', async () => {
    const failure = new Error('disk full');
    const invoke = vi.fn(async (command: string) => {
      if (command === 'notebook_begin_export_save') return 'notebook.export.2';
      if (command === 'notebook_append_export_save') throw failure;
      return undefined;
    });
    const port = createNotebookExportSavePort({
      invoke,
      window: { __TAURI_INTERNALS__: {} },
    });

    await expect(port.save({
      bytes: new Uint8Array([1]),
      suggestedFileName: 'Broken',
    })).rejects.toBe(failure);
    expect(invoke).toHaveBeenLastCalledWith('notebook_abort_export_save', {
      uploadId: 'notebook.export.2',
    });
  });

  it('uses the browser save picker when it is available', async () => {
    const writable = {
      close: vi.fn(async () => {}),
      write: vi.fn(async () => {}),
    };
    const picker = vi.fn(async () => ({
      createWritable: async () => writable,
    }));
    const bytes = new Uint8Array([3, 4, 5]);
    const port = createNotebookExportSavePort({
      window: { showSaveFilePicker: picker },
    });

    await expect(port.save({
      bytes,
      mimeType: 'application/pdf',
      suggestedFileName: 'Proof',
    })).resolves.toBe('saved');

    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'Proof.pdf',
      types: [{
        accept: { 'application/pdf': ['.pdf'] },
        description: 'Notebook export',
      }],
    });
    expect(writable.write).toHaveBeenCalledWith(bytes);
    expect(writable.close).toHaveBeenCalledTimes(1);
  });

  it('returns cancelled when the browser save picker is dismissed', async () => {
    const cancellation = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    const port = createNotebookExportSavePort({
      window: { showSaveFilePicker: vi.fn(async () => { throw cancellation; }) },
    });

    await expect(port.save({
      bytes: new Uint8Array([1]),
      suggestedFileName: 'Cancelled',
    })).resolves.toBe('cancelled');
  });

  it('falls back to a browser download and emits its limitation notice', async () => {
    vi.useFakeTimers();
    const link = { click: vi.fn(), download: '', href: '' } as unknown as HTMLAnchorElement;
    const document = {
      createElement: vi.fn(() => link),
    } as unknown as Pick<Document, 'createElement'>;
    const url = {
      createObjectURL: vi.fn(() => 'blob:notebook-export'),
      revokeObjectURL: vi.fn(),
    } as unknown as Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
    const onNotice = vi.fn();
    const port = createNotebookExportSavePort({ document, url, window: {} });

    await expect(port.save({
      bytes: new Uint8Array([9]),
      mimeType: 'application/zip',
      onNotice,
      suggestedFileName: 'Portable copy',
    })).resolves.toBe('saved');
    await vi.runAllTimersAsync();

    expect(link.download).toBe('Portable copy.zip');
    expect(link.click).toHaveBeenCalledTimes(1);
    expect(onNotice).toHaveBeenCalledWith({
      kind: 'browser-download-fallback',
      message: NOTEBOOK_BROWSER_DOWNLOAD_FALLBACK_NOTICE,
    });
    expect(url.revokeObjectURL).toHaveBeenCalledWith('blob:notebook-export');
  });
});
