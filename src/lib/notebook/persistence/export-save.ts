import { invoke } from '@tauri-apps/api/core';

const NOTEBOOK_EXPORT_SAVE_CHUNK_BYTES = 1024 * 1024;

const NOTEBOOK_EXPORT_FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.calcwiz.notebook+zip': '.cwiznb',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/zip': '.zip',
};

export const NOTEBOOK_BROWSER_DOWNLOAD_FALLBACK_NOTICE =
  'This browser cannot choose a save location, so the export was downloaded using your browser’s default location.';

export type NotebookExportSaveNotice = {
  kind: 'browser-download-fallback';
  message: typeof NOTEBOOK_BROWSER_DOWNLOAD_FALLBACK_NOTICE;
};

export type NotebookExportSaveRequest = {
  bytes: Uint8Array;
  mimeType?: string;
  onNotice?: (notice: NotebookExportSaveNotice) => void;
  suggestedFileName: string;
};

export type NotebookExportSaveResult = 'saved' | 'cancelled';

export type NotebookExportSavePort = {
  save(request: NotebookExportSaveRequest): Promise<NotebookExportSaveResult>;
};

type NotebookWritableFile = {
  close(): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
};

type NotebookSaveFileHandle = {
  createWritable(): Promise<NotebookWritableFile>;
};

type NotebookSaveFilePicker = (options: {
  suggestedName: string;
  types: Array<{
    accept: Record<string, string[]>;
    description: string;
  }>;
}) => Promise<NotebookSaveFileHandle>;

type NotebookExportSaveWindow = {
  __TAURI_INTERNALS__?: unknown;
  showSaveFilePicker?: NotebookSaveFilePicker;
};

type NotebookExportSaveInvoke = (
  command: string,
  arguments_: Record<string, unknown>,
) => Promise<unknown>;

export type NotebookExportSaveDependencies = {
  document?: Pick<Document, 'createElement'>;
  invoke?: NotebookExportSaveInvoke;
  url?: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>;
  window?: NotebookExportSaveWindow;
};

function defaultWindow() {
  return typeof window === 'undefined'
    ? undefined
    : window as unknown as NotebookExportSaveWindow;
}

function defaultDocument() {
  return typeof document === 'undefined' ? undefined : document;
}

function defaultUrl() {
  return typeof URL === 'undefined' ? undefined : URL;
}

function fileExtensionForMimeType(mimeType?: string) {
  if (!mimeType) return '';
  return NOTEBOOK_EXPORT_FILE_EXTENSIONS[mimeType.split(';', 1)[0].trim().toLowerCase()] ?? '';
}

function fileExtensionForName(fileName: string) {
  const extension = fileName.split('.').at(-1)?.toLowerCase() ?? '';
  return /^[a-z0-9]+$/u.test(extension) ? extension : '';
}

export function normalizeNotebookExportFileName(suggestedFileName: string, mimeType?: string) {
  const withoutControlCharacters = [...suggestedFileName]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('');
  const safeName = withoutControlCharacters
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .replace(/^-+|-+$/g, '') || 'Notebook export';
  const extension = fileExtensionForMimeType(mimeType);
  return extension && !safeName.toLowerCase().endsWith(extension)
    ? `${safeName}${extension}`
    : safeName;
}

function isTauriRuntime(runtimeWindow: NotebookExportSaveWindow | undefined) {
  return Boolean(runtimeWindow && '__TAURI_INTERNALS__' in runtimeWindow);
}

function wasCancelled(reason: unknown) {
  return typeof reason === 'object'
    && reason !== null
    && 'name' in reason
    && reason.name === 'AbortError';
}

async function saveWithTauri(
  request: NotebookExportSaveRequest,
  invokeCommand: NotebookExportSaveInvoke,
  suggestedFileName: string,
): Promise<NotebookExportSaveResult> {
  const extension = fileExtensionForMimeType(request.mimeType).slice(1)
    || fileExtensionForName(suggestedFileName)
    || 'bin';
  const beginArguments: Record<string, unknown> = {
    byteLength: request.bytes.byteLength,
    extension,
    filterName: 'Notebook export',
    suggestedFileName,
  };
  const uploadId = await invokeCommand('notebook_begin_export_save', beginArguments);
  if (uploadId === null) return 'cancelled';
  if (typeof uploadId !== 'string' || !uploadId.trim()) {
    throw new TypeError('Notebook desktop export returned an invalid save operation.');
  }

  try {
    for (let offset = 0; offset < request.bytes.byteLength; offset += NOTEBOOK_EXPORT_SAVE_CHUNK_BYTES) {
      const chunk = request.bytes.subarray(
        offset,
        Math.min(request.bytes.byteLength, offset + NOTEBOOK_EXPORT_SAVE_CHUNK_BYTES),
      );
      await invokeCommand('notebook_append_export_save', { uploadId, chunk: [...chunk] });
    }
    await invokeCommand('notebook_finish_export_save', { uploadId });
    return 'saved';
  } catch (reason) {
    await invokeCommand('notebook_abort_export_save', { uploadId }).catch(() => {});
    throw reason;
  }
}

async function saveWithBrowser(
  request: NotebookExportSaveRequest,
  runtimeWindow: NotebookExportSaveWindow | undefined,
  document_: Pick<Document, 'createElement'> | undefined,
  url: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'> | undefined,
  suggestedFileName: string,
): Promise<NotebookExportSaveResult> {
  if (runtimeWindow?.showSaveFilePicker) {
    try {
      const handle = await runtimeWindow.showSaveFilePicker({
        suggestedName: suggestedFileName,
        types: request.mimeType ? [{
          accept: { [request.mimeType]: [fileExtensionForMimeType(request.mimeType) || '.bin'] },
          description: 'Notebook export',
        }] : [],
      });
      const writable = await handle.createWritable();
      await writable.write(request.bytes);
      await writable.close();
      return 'saved';
    } catch (reason) {
      if (wasCancelled(reason)) return 'cancelled';
      throw reason;
    }
  }

  if (!document_ || !url) {
    throw new Error('Notebook export is unavailable because this browser cannot save files.');
  }
  request.onNotice?.({
    kind: 'browser-download-fallback',
    message: NOTEBOOK_BROWSER_DOWNLOAD_FALLBACK_NOTICE,
  });
  const objectUrl = url.createObjectURL(new Blob([request.bytes as BlobPart], {
    type: request.mimeType,
  }));
  const link = document_.createElement('a');
  link.href = objectUrl;
  link.download = suggestedFileName;
  link.click();
  setTimeout(() => url.revokeObjectURL(objectUrl), 0);
  return 'saved';
}

export function createNotebookExportSavePort(
  dependencies: NotebookExportSaveDependencies = {},
): NotebookExportSavePort {
  const runtimeWindow = dependencies.window ?? defaultWindow();
  const invokeCommand = dependencies.invoke ?? invoke as NotebookExportSaveInvoke;
  const document_ = dependencies.document ?? defaultDocument();
  const url = dependencies.url ?? defaultUrl();

  return {
    async save(request) {
      const suggestedFileName = normalizeNotebookExportFileName(
        request.suggestedFileName,
        request.mimeType,
      );
      return isTauriRuntime(runtimeWindow)
        ? saveWithTauri(request, invokeCommand, suggestedFileName)
        : saveWithBrowser(request, runtimeWindow, document_, url, suggestedFileName);
    },
  };
}
