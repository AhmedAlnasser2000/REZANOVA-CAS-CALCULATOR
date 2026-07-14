import type { Editor } from '@tiptap/core';
import {
  BetweenHorizontalStart,
  FileText,
  PanelTop,
  Pilcrow,
} from 'lucide-react';
import { useRef, useState } from 'react';

import {
  NOTEBOOK_MARGIN_PRESETS_PT,
  notebookMarginPreset,
  type NotebookHeaderFooterSettings,
  type NotebookMarginPreset,
  type NotebookPageSetup,
} from '../../../../lib/notebook';
import { useNotebookTransientLayer } from '../transient-ui';
import {
  captureNotebookToolbarSelection,
  restoreNotebookToolbarSelection,
  type NotebookToolbarSelection,
} from './notebookToolbarSelection';

export type NotebookViewMode = 'print' | 'draft';

function numericMargin(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(144, parsed)) : 0;
}

export function NotebookLayoutControls({
  editor,
  headerFooter,
  pageSetup,
  viewMode,
  onChangeHeaderFooter,
  onChangePageSetup,
  onInsertPageBreak,
  onViewModeChange,
}: {
  editor: Editor;
  headerFooter: NotebookHeaderFooterSettings;
  pageSetup: NotebookPageSetup;
  viewMode: NotebookViewMode;
  onChangeHeaderFooter: (next: NotebookHeaderFooterSettings) => void;
  onChangePageSetup: (next: NotebookPageSetup) => void;
  onInsertPageBreak: () => void;
  onViewModeChange: (mode: NotebookViewMode) => void;
}) {
  const marginsLayer = useNotebookTransientLayer({ id: 'notebook-custom-margins' });
  const runningMatterLayer = useNotebookTransientLayer({ id: 'notebook-header-footer' });
  const selectionRef = useRef<NotebookToolbarSelection | null>(null);
  const [marginDraft, setMarginDraft] = useState(pageSetup.marginsPt);
  const [runningDraft, setRunningDraft] = useState(headerFooter);
  const marginPreset = notebookMarginPreset(pageSetup.marginsPt);

  function rememberSelection() {
    selectionRef.current = captureNotebookToolbarSelection(editor);
  }

  function restoreSelection() {
    requestAnimationFrame(() => {
      if (!editor.isDestroyed) restoreNotebookToolbarSelection(editor, selectionRef.current).run();
    });
  }

  function updatePageSetup(next: NotebookPageSetup) {
    onChangePageSetup(next);
    restoreSelection();
  }

  function openMargins() {
    rememberSelection();
    setMarginDraft(pageSetup.marginsPt);
    marginsLayer.open();
  }

  function openRunningMatter() {
    rememberSelection();
    setRunningDraft(headerFooter);
    runningMatterLayer.open();
  }

  return (
    <>
      <div className="notebook-layout-field">
        <span>Paper</span>
        <select
          aria-label="Paper size"
          value={pageSetup.paperSize}
          onPointerDown={rememberSelection}
          onChange={(event) => updatePageSetup({
            ...pageSetup,
            paperSize: event.target.value as NotebookPageSetup['paperSize'],
          })}
        >
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="legal">Legal</option>
        </select>
      </div>
      <div className="notebook-layout-field">
        <span>Orientation</span>
        <select
          aria-label="Page orientation"
          value={pageSetup.orientation}
          onPointerDown={rememberSelection}
          onChange={(event) => updatePageSetup({
            ...pageSetup,
            orientation: event.target.value as NotebookPageSetup['orientation'],
          })}
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      <div className="notebook-layout-field notebook-layout-field--margins">
        <span>Margins</span>
        <select
          aria-label="Page margins"
          value={marginPreset}
          onPointerDown={rememberSelection}
          onChange={(event) => {
            if (event.target.value === 'custom') {
              openMargins();
              return;
            }
            const preset = event.target.value as NotebookMarginPreset;
            updatePageSetup({
              ...pageSetup,
              marginsPt: { ...NOTEBOOK_MARGIN_PRESETS_PT[preset] },
            });
          }}
        >
          <option value="normal">Normal</option>
          <option value="narrow">Narrow</option>
          <option value="moderate">Moderate</option>
          <option value="wide">Wide</option>
          <option value="custom">Custom…</option>
        </select>
        <button
          data-notebook-transient-trigger={marginsLayer.id}
          type="button"
          aria-label="Edit custom margins"
          aria-expanded={marginsLayer.isOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={openMargins}
        ><BetweenHorizontalStart aria-hidden="true" size={15} /></button>
        {marginsLayer.isOpen ? (
          <div
            data-notebook-transient-layer={marginsLayer.id}
            className="notebook-layout-popover notebook-margin-popover"
            role="dialog"
            aria-label="Custom margins"
          >
            <strong>Custom margins</strong>
            <span>Canonical points (0–144)</span>
            <div>
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <label key={side}>
                  <span>{side}</span>
                  <input
                    aria-label={`${side} margin in points`}
                    type="number"
                    min="0"
                    max="144"
                    step="1"
                    value={marginDraft[side]}
                    onChange={(event) => setMarginDraft((current) => ({
                      ...current,
                      [side]: numericMargin(event.target.value),
                    }))}
                  />
                </label>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => {
                marginsLayer.close(false);
                restoreSelection();
              }}>Cancel</button>
              <button type="button" onClick={() => {
                onChangePageSetup({ ...pageSetup, marginsPt: { ...marginDraft } });
                marginsLayer.close(false);
                restoreSelection();
              }}>Apply</button>
            </footer>
          </div>
        ) : null}
      </div>
      <button
        data-notebook-transient-trigger={runningMatterLayer.id}
        type="button"
        aria-label="Header, footer, and page numbering"
        aria-expanded={runningMatterLayer.isOpen}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openRunningMatter}
      ><PanelTop aria-hidden="true" size={16} /><span>Header & footer</span></button>
      {runningMatterLayer.isOpen ? (
        <div
          data-notebook-transient-layer={runningMatterLayer.id}
          className="notebook-layout-popover notebook-running-matter-popover"
          role="dialog"
          aria-label="Header and footer settings"
        >
          <strong>Header and footer</strong>
          <label><span>Header text</span><input value={runningDraft.headerText} onChange={(event) => setRunningDraft((current) => ({ ...current, headerText: event.target.value }))} /></label>
          <label><span>Footer text</span><input value={runningDraft.footerText} onChange={(event) => setRunningDraft((current) => ({ ...current, footerText: event.target.value }))} /></label>
          <label className="notebook-layout-check"><input type="checkbox" checked={runningDraft.differentFirstPage} onChange={(event) => setRunningDraft((current) => ({ ...current, differentFirstPage: event.target.checked }))} /><span>Different first page</span></label>
          <label className="notebook-layout-check"><input type="checkbox" checked={runningDraft.pageNumbering.enabled} onChange={(event) => setRunningDraft((current) => ({ ...current, pageNumbering: { ...current.pageNumbering, enabled: event.target.checked } }))} /><span>Show page numbers</span></label>
          <div className="notebook-page-number-settings">
            <label><span>Position</span><select aria-label="Page number position" value={runningDraft.pageNumbering.position} onChange={(event) => setRunningDraft((current) => ({ ...current, pageNumbering: { ...current.pageNumbering, position: event.target.value as NotebookHeaderFooterSettings['pageNumbering']['position'] } }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
            <label><span>Start at</span><input aria-label="Starting page number" type="number" min="1" max="9999" value={runningDraft.pageNumbering.startAt || ''} onChange={(event) => setRunningDraft((current) => ({ ...current, pageNumbering: { ...current.pageNumbering, startAt: event.target.value === '' ? 0 : Math.max(1, Math.min(9999, Number(event.target.value) || 1)) } }))} /></label>
          </div>
          <footer>
            <button type="button" onClick={() => {
              runningMatterLayer.close(false);
              restoreSelection();
            }}>Cancel</button>
            <button type="button" onClick={() => {
              onChangeHeaderFooter({
                ...runningDraft,
                pageNumbering: {
                  ...runningDraft.pageNumbering,
                  startAt: Math.max(1, Math.min(9999, runningDraft.pageNumbering.startAt || 1)),
                },
              });
              runningMatterLayer.close(false);
              restoreSelection();
            }}>Apply</button>
          </footer>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Insert page break"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onInsertPageBreak}
      ><FileText aria-hidden="true" size={16} /><span>Page break</span></button>
      <div className="notebook-layout-view" role="group" aria-label="Notebook view">
        <button type="button" aria-pressed={viewMode === 'print'} onMouseDown={(event) => event.preventDefault()} onClick={() => onViewModeChange('print')}><FileText aria-hidden="true" size={15} />Print</button>
        <button type="button" aria-pressed={viewMode === 'draft'} onMouseDown={(event) => event.preventDefault()} onClick={() => onViewModeChange('draft')}><Pilcrow aria-hidden="true" size={15} />Draft</button>
      </div>
    </>
  );
}
