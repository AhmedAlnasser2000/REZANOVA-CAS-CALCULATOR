import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  createNotebookPublicationJob,
  notebookPageGeometry,
  notebookPdfCompatibilityFindings,
  type NotebookAssetPort,
  type NotebookExportScope,
  type NotebookPublicationLayoutV1,
  type NotebookPublicationProjectionV1,
  type NotebookStoredRecordV1,
} from '../../../../lib/notebook';
import { NotebookPrintProjection } from './NotebookPrintProjection';

type ScopeMode = NotebookExportScope['kind'];

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export function NotebookPdfExportDialog({
  assetPort,
  layout,
  onClose,
  record,
  sourceViewMode,
}: {
  assetPort: NotebookAssetPort;
  layout: NotebookPublicationLayoutV1;
  onClose: () => void;
  record: NotebookStoredRecordV1;
  sourceViewMode: 'draft' | 'print';
}) {
  const sections = useMemo(
    () => record.document.content.filter((node) => node.type === 'section'),
    [record.document.content],
  );
  const [scopeMode, setScopeMode] = useState<ScopeMode>('document');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(layout.pageCount);
  const [sectionIds, setSectionIds] = useState(() => sections.map((section) => section.id));
  const [projection, setProjection] = useState<NotebookPublicationProjectionV1 | null>(null);
  const [status, setStatus] = useState<'preparing' | 'ready' | 'failed'>('preparing');
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    globalThis.addEventListener('keydown', handleEscape);
    return () => globalThis.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const scope = useMemo<NotebookExportScope>(() => {
    if (scopeMode === 'page-range') return { kind: 'page-range', fromPage, toPage };
    if (scopeMode === 'sections') return { kind: 'sections', sectionIds };
    return { kind: 'document' };
  }, [fromPage, scopeMode, sectionIds, toPage]);

  useEffect(() => {
    const generation = ++generationRef.current;
    setStatus('preparing');
    setError(null);
    const compatibilityFindings = notebookPdfCompatibilityFindings(record.document.content);
    if (sourceViewMode === 'draft') {
      compatibilityFindings.push({
        kind: 'layout-approximation',
        message: 'Draft view was repaginated with the document page settings for this PDF preview.',
      });
    }
    const job = createNotebookPublicationJob({
      assetPort,
      compatibilityFindings,
      layout,
      record,
      request: { format: 'pdf', scope },
    });
    void job.run().then((next) => {
      if (generation !== generationRef.current) return;
      setProjection(next);
      setStatus('ready');
    }).catch((reason: unknown) => {
      if (generation !== generationRef.current) return;
      setProjection(null);
      setError(reason instanceof Error ? reason.message : 'PDF preview could not be prepared.');
      setStatus('failed');
    });
    return () => job.cancel();
  }, [assetPort, layout, record, scope, sourceViewMode]);

  async function printProjection() {
    const geometry = projection ? notebookPageGeometry(projection.pageSetup) : null;
    const pageStyle = globalThis.document.createElement('style');
    pageStyle.media = 'print';
    pageStyle.textContent = geometry
      ? `@page { size: ${geometry.width}pt ${geometry.height}pt; margin: 0; }`
      : '@page { margin: 0; }';
    globalThis.document.head.append(pageStyle);
    globalThis.document.body.classList.add('notebook-pdf-printing');
    try {
      await nextPaint();
      globalThis.print();
    } finally {
      globalThis.setTimeout(() => {
        globalThis.document.body.classList.remove('notebook-pdf-printing');
        pageStyle.remove();
      }, 0);
    }
  }

  return createPortal((
    <div className="notebook-pdf-dialog" role="dialog" aria-modal="true" aria-label="Print or save Notebook as PDF">
      <div className="notebook-pdf-dialog-chrome">
        <header>
          <div>
            <span>Publication preview</span>
            <h2>Print / Save as PDF</h2>
          </div>
          <button type="button" aria-label="Close PDF preview" onClick={onClose}>×</button>
        </header>
        <fieldset>
          <legend>Export scope</legend>
          <label>
            <input type="radio" checked={scopeMode === 'document'} onChange={() => setScopeMode('document')} />
            Entire document
          </label>
          <label>
            <input type="radio" checked={scopeMode === 'page-range'} onChange={() => setScopeMode('page-range')} />
            Physical pages
          </label>
          {scopeMode === 'page-range' ? (
            <div className="notebook-pdf-range">
              <label>From <input aria-label="PDF from page" type="number" min={1} max={layout.pageCount} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} /></label>
              <label>To <input aria-label="PDF to page" type="number" min={fromPage} max={layout.pageCount} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} /></label>
            </div>
          ) : null}
          <label className={sections.length ? undefined : 'is-disabled'}>
            <input type="radio" disabled={!sections.length} checked={scopeMode === 'sections'} onChange={() => setScopeMode('sections')} />
            Selected Sections
          </label>
          {scopeMode === 'sections' ? (
            <div className="notebook-pdf-sections">
              {sections.map((section) => (
                <label key={section.id}>
                  <input
                    type="checkbox"
                    checked={sectionIds.includes(section.id)}
                    onChange={(event) => setSectionIds((current) => event.target.checked
                      ? [...current, section.id]
                      : current.filter((id) => id !== section.id))}
                  />
                  {section.title || 'Untitled section'}
                </label>
              ))}
            </div>
          ) : null}
        </fieldset>
        <section className="notebook-pdf-compatibility" aria-label="PDF compatibility report">
          <h3>Compatibility report</h3>
          {status === 'preparing' ? <p>Preparing a frozen preview…</p> : null}
          {status === 'failed' ? <p role="alert">{error}</p> : null}
          {projection && projection.compatibility.findings.length === 0 ? (
            <p>No substitutions or layout approximations are required.</p>
          ) : null}
          {projection?.compatibility.findings.length ? (
            <ul>{projection.compatibility.findings.map((finding, index) => (
              <li key={`${finding.kind}.${finding.nodeId ?? index}`}>{finding.message}</li>
            ))}</ul>
          ) : null}
        </section>
        <footer>
          <span>Use your system dialog to choose a printer or Save as PDF.</span>
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" disabled={status !== 'ready' || !projection} onClick={() => void printProjection()}>
            Open system print dialog
          </button>
        </footer>
      </div>
      {projection ? <NotebookPrintProjection projection={projection} /> : (
        <div className="notebook-print-preview is-loading">Preparing preview…</div>
      )}
    </div>
  ), globalThis.document.body);
}
