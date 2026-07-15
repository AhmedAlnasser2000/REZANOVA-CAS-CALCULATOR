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
  type NotebookMarginPreset,
  type NotebookPageSetup,
} from '../../../../lib/notebook';
import { NotebookFloatingLayer, useNotebookTransientLayer } from '../transient-ui';
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
  pageSetup,
  viewMode,
  onEditHeaderFooter,
  onChangePageSetup,
  onInsertPageBreak,
  onViewModeChange,
}: {
  editor: Editor;
  pageSetup: NotebookPageSetup;
  viewMode: NotebookViewMode;
  onEditHeaderFooter: () => void;
  onChangePageSetup: (next: NotebookPageSetup) => void;
  onInsertPageBreak: () => void;
  onViewModeChange: (mode: NotebookViewMode) => void;
}) {
  const marginsLayer = useNotebookTransientLayer({ id: 'notebook-custom-margins' });
  const selectionRef = useRef<NotebookToolbarSelection | null>(null);
  const [marginDraft, setMarginDraft] = useState(pageSetup.marginsPt);
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
          <NotebookFloatingLayer
            layerId={marginsLayer.id}
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
          </NotebookFloatingLayer>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Header, footer, and page numbering"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onEditHeaderFooter}
      ><PanelTop aria-hidden="true" size={16} /><span>Header & footer</span></button>
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
