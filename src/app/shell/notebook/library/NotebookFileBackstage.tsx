import { useRef, useState } from 'react';

import {
  NOTEBOOK_STARTER_TEMPLATES,
  requestNotebookWorkspaceFocus,
} from '../../../../lib/notebook';
import { useNotebookTransientLayer } from '../transient-ui';
import { downloadNotebookPackage } from './downloadNotebookPackage';
import type { useNotebookLibrarySession } from './useNotebookLibrarySession';

type NotebookFileBackstageProps = {
  onExportPdf: () => void;
  session: ReturnType<typeof useNotebookLibrarySession>;
};

type BackstageView = 'home' | 'open' | 'history' | 'trash';

export function NotebookFileBackstage({ onExportPdf, session }: NotebookFileBackstageProps) {
  const backstage = useNotebookTransientLayer({ id: 'notebook-file-backstage' });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [view, setView] = useState<BackstageView>('home');
  const [operationError, setOperationError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, closeAfter = false) {
    setOperationError(null);
    try {
      await action();
      if (closeAfter) {
        backstage.close(true);
      }
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Notebook file action failed.');
    }
  }

  async function openLibraryRecord(libraryId: string) {
    if (requestNotebookWorkspaceFocus(libraryId)) {
      backstage.close(true);
      return;
    }
    await run(() => session.openRecord(libraryId), true);
  }

  return (
    <div className="notebook-file-control">
      <button
        data-notebook-transient-trigger={backstage.id}
        type="button"
        aria-expanded={backstage.isOpen}
        onClick={() => {
          if (!backstage.isOpen) {
            void session.refreshCatalog();
          }
          backstage.toggle();
        }}
      >
        File
      </button>
      {backstage.isOpen ? (
        <div
          data-notebook-transient-layer={backstage.id}
          className="notebook-file-backstage"
          role="dialog"
          aria-label="Notebook File"
        >
          <nav aria-label="Notebook File sections">
            {([
              ['home', 'File'],
              ['open', 'Open'],
              ['history', 'Version History'],
              ['trash', 'Trash'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-current={view === id ? 'page' : undefined}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <section className="notebook-file-backstage-content">
            <header>
              <div>
                <span>Notebook library</span>
                <h2>{view === 'home' ? 'File' : view === 'open' ? 'Open' : view === 'history' ? 'Version History' : 'Trash'}</h2>
              </div>
              <button type="button" aria-label="Close Notebook File" onClick={() => backstage.close(true)}>
                ×
              </button>
            </header>

            {view === 'home' ? (
              <div className="notebook-file-home">
                <div className="notebook-file-actions">
                  <button type="button" onClick={() => void run(() => session.newRecord(), true)}>
                    <strong>New</strong>
                    <span>Create a blank local notebook.</span>
                  </button>
                  <button type="button" onClick={() => setView('open')}>
                    <strong>Open</strong>
                    <span>Browse recent and all local notebooks.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      backstage.close(false);
                      onExportPdf();
                    }}
                  >
                    <strong>Print / Save as PDF</strong>
                    <span>Preview compatibility, then use the system print dialog.</span>
                  </button>
                  <button
                    type="button"
                    disabled={!session.packageAvailable}
                    title={session.packageAvailable ? 'Export portable Notebook' : 'Available in the desktop app'}
                    onClick={() => void run(async () => {
                      const output = await session.exportPortable();
                      downloadNotebookPackage(output.bytes, output.fileName);
                    })}
                  >
                    <strong>Export .cwiznb</strong>
                    <span>Capture the current in-memory revision.</span>
                  </button>
                  <button
                    type="button"
                    disabled={!session.packageAvailable}
                    title={session.packageAvailable ? 'Import portable Notebook' : 'Available in the desktop app'}
                    onClick={() => inputRef.current?.click()}
                  >
                    <strong>Import .cwiznb</strong>
                    <span>Validate and add an independent local copy.</span>
                  </button>
                </div>
                <div>
                  <h3>Templates</h3>
                  <div className="notebook-file-templates">
                    {NOTEBOOK_STARTER_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => void run(() => session.newRecord(template.id), true)}
                      >
                        <strong>{template.label}</strong>
                        <span>{template.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  className="notebook-file-trash-current"
                  type="button"
                  onClick={() => void run(() => session.moveCurrentToTrash(), true)}
                >
                  Move current notebook to Trash
                </button>
              </div>
            ) : null}

            {view === 'open' ? (
              <div className="notebook-file-library">
                <h3>Recent</h3>
                <div className="notebook-file-record-list">
                  {session.library.slice(0, 5).map((summary) => (
                    <button
                      key={`recent-${summary.libraryId}`}
                      type="button"
                      disabled={summary.libraryId === session.record?.libraryId}
                      onClick={() => void openLibraryRecord(summary.libraryId)}
                    >
                      <strong>{summary.title || 'Untitled Notebook'}</strong>
                      <span>{summary.wordCount.toLocaleString()} words · {new Date(summary.savedAt).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
                <h3>All Notebooks</h3>
                <div className="notebook-file-record-list">
                  {session.library.map((summary) => (
                    <button
                      key={summary.libraryId}
                      type="button"
                      disabled={summary.libraryId === session.record?.libraryId}
                      onClick={() => void openLibraryRecord(summary.libraryId)}
                    >
                      <strong>{summary.title || 'Untitled Notebook'}</strong>
                      <span>Revision {summary.revision} · {summary.assetCount} assets</span>
                    </button>
                  ))}
                  {session.library.length === 0 ? <p>No local notebooks yet.</p> : null}
                </div>
              </div>
            ) : null}

            {view === 'history' ? (
              <div className="notebook-file-library">
                <p>Up to 50 snapshots from the last 30 days are retained locally.</p>
                <div className="notebook-file-record-list">
                  {session.versions.map((snapshot) => (
                    <button
                      key={snapshot.snapshotId}
                      type="button"
                      onClick={() => void run(() => session.restoreVersion(snapshot), true)}
                    >
                      <strong>Revision {snapshot.revision}</strong>
                      <span>{snapshot.reason.replaceAll('-', ' ')} · {new Date(snapshot.createdAt).toLocaleString()}</span>
                    </button>
                  ))}
                  {session.versions.length === 0 ? <p>No version snapshots yet.</p> : null}
                </div>
              </div>
            ) : null}

            {view === 'trash' ? (
              <div className="notebook-file-library">
                <div className="notebook-file-record-list">
                  {session.trash.map((summary) => (
                    <article key={summary.libraryId}>
                      <div>
                        <strong>{summary.title || 'Untitled Notebook'}</strong>
                        <span>{summary.wordCount.toLocaleString()} words</span>
                      </div>
                      <button type="button" onClick={() => void run(() => session.restoreTrashRecord(summary.libraryId))}>
                        Restore
                      </button>
                      <button type="button" onClick={() => void run(() => session.deleteTrashRecord(summary.libraryId))}>
                        Delete forever
                      </button>
                    </article>
                  ))}
                  {session.trash.length === 0 ? <p>Trash is empty.</p> : null}
                </div>
              </div>
            ) : null}

            {operationError ? <p className="notebook-file-error" role="alert">{operationError}</p> : null}
          </section>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept=".cwiznb,application/zip"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                void run(async () => {
                  await session.importPortable(new Uint8Array(await file.arrayBuffer()));
                }, true);
              }
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
