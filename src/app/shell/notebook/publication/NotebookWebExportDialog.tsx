import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  buildNotebookWebPackage,
  createNotebookPublicationJob,
  notebookWebCompatibilityFindings,
  type NotebookAssetPort,
  type NotebookExportScope,
  type NotebookPublicationLayoutV1,
  type NotebookPublicationProjectionV1,
  type NotebookStoredRecordV1,
} from '../../../../lib/notebook';

function downloadWebPackage(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function NotebookWebExportDialog({
  assetPort,
  layout,
  onClose,
  record,
}: {
  assetPort: NotebookAssetPort;
  layout: NotebookPublicationLayoutV1;
  onClose: () => void;
  record: NotebookStoredRecordV1;
}) {
  const sections = useMemo(
    () => record.document.content.filter((node) => node.type === 'section'),
    [record.document.content],
  );
  const [scopeMode, setScopeMode] = useState<'document' | 'sections'>('document');
  const [sectionIds, setSectionIds] = useState(() => sections.map((section) => section.id));
  const [projection, setProjection] = useState<NotebookPublicationProjectionV1 | null>(null);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'exporting' | 'failed'>('preparing');
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);
  const scope = useMemo<NotebookExportScope>(() => scopeMode === 'sections'
    ? { kind: 'sections', sectionIds }
    : { kind: 'document' }, [scopeMode, sectionIds]);
  const selectionIsValid = scopeMode !== 'sections' || sectionIds.length > 0;

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || status === 'exporting') return;
      event.preventDefault();
      onClose();
    };
    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [onClose, status]);

  useEffect(() => {
    if (!selectionIsValid) return;
    const generation = ++generationRef.current;
    const job = createNotebookPublicationJob({
      assetPort,
      compatibilityFindings: notebookWebCompatibilityFindings(record.document.content),
      layout,
      record,
      request: { format: 'web', scope },
    });
    void job.run().then((next) => {
      if (generation !== generationRef.current) return;
      setProjection(next);
      setStatus('ready');
    }).catch((reason: unknown) => {
      if (generation !== generationRef.current) return;
      setProjection(null);
      setError(reason instanceof Error ? reason.message : 'Web export could not be prepared.');
      setStatus('failed');
    });
    return () => job.cancel();
  }, [assetPort, layout, record, scope, selectionIsValid]);

  async function exportWebPackage() {
    if (!projection) return;
    setStatus('exporting');
    setError(null);
    try {
      const output = await buildNotebookWebPackage(projection);
      downloadWebPackage(output.bytes, output.fileName);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Web export failed.');
      setStatus('failed');
    }
  }

  return createPortal((
    <div className="notebook-publication-dialog-backdrop">
      <div className="notebook-web-dialog" role="dialog" aria-modal="true" aria-label="Export Notebook as Web package">
        <header>
          <div>
            <span>Offline publication</span>
            <h2>Export Web package</h2>
          </div>
          <button type="button" aria-label="Close Web export" disabled={status === 'exporting'} onClick={onClose}>×</button>
        </header>
        <fieldset>
          <legend>Export scope</legend>
          <label>
            <input type="radio" checked={scopeMode === 'document'} onChange={() => {
              setStatus('preparing');
              setError(null);
              setProjection(null);
              setScopeMode('document');
            }} />
            Entire document
          </label>
          <label className={sections.length ? undefined : 'is-disabled'}>
            <input type="radio" disabled={!sections.length} checked={scopeMode === 'sections'} onChange={() => {
              setStatus('preparing');
              setError(null);
              setProjection(null);
              setScopeMode('sections');
            }} />
            Selected Sections
          </label>
          {scopeMode === 'sections' ? (
            <div className="notebook-publication-sections">
              {sections.map((section) => (
                <label key={section.id}>
                  <input
                    type="checkbox"
                    checked={sectionIds.includes(section.id)}
                    onChange={(event) => {
                      setStatus('preparing');
                      setError(null);
                      setProjection(null);
                      setSectionIds((current) => event.target.checked
                        ? [...current, section.id]
                        : current.filter((id) => id !== section.id));
                    }}
                  />
                  {section.title || 'Untitled section'}
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>
        <section className="notebook-publication-compatibility" aria-label="Web compatibility report">
          <h3>Compatibility report</h3>
          {!selectionIsValid ? <p>Select at least one Section to prepare the publication.</p> : null}
          {selectionIsValid && status === 'preparing' ? <p>Preparing a frozen publication snapshot…</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {projection?.compatibility.findings.length ? (
            <ul>{projection.compatibility.findings.map((finding, index) => (
              <li key={`${finding.kind}.${finding.nodeId ?? index}`}>{finding.message}</li>
            ))}</ul>
          ) : status === 'ready' ? <p>No substitutions or layout approximations are required.</p> : null}
        </section>
        <p className="notebook-publication-note">
          The ZIP is a self-contained, read-only publication with local media. It cannot be imported as a Notebook.
        </p>
        <footer>
          <button type="button" disabled={status === 'exporting'} onClick={onClose}>Cancel</button>
          <button
            type="button"
            disabled={status !== 'ready' || !projection || !selectionIsValid}
            onClick={() => void exportWebPackage()}
          >
            {status === 'exporting' ? 'Building Web package…' : 'Download Web package'}
          </button>
        </footer>
      </div>
    </div>
  ), globalThis.document.body);
}
