import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Delete,
  GripHorizontal,
  Grid3X3,
  Keyboard,
  Slash,
  Redo2,
  Search,
  Undo2,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  NOTEBOOK_KEYBOARD_ENTRIES,
  NOTEBOOK_KEYBOARD_TABS,
  notebookKeyboardEntries,
  notebookMatrixLatex,
  type NotebookKeyboardEntry,
  type NotebookKeyboardTabId,
} from '../../../../lib/notebook';
import { useNotebookMathFieldController } from '../math-field';
import { NotebookFloatingLayer, useNotebookTransientLayer } from '../transient-ui';
import { useNotebookUiState } from '../useNotebookUiState';
import { NotebookFontSizeControl } from '../canvas/NotebookFontSizeControl';

const QUICK_ENTRY_IDS = ['fraction', 'square-root', 'power', 'limit', 'integral', 'matrix'];

function keyboardEntry(id: string) {
  return NOTEBOOK_KEYBOARD_ENTRIES.find((entry) => entry.id === id);
}

function MatrixGridIcon() {
  return <Grid3X3 aria-hidden="true" size={21} />;
}

function NotebookTemplateButton({
  entry,
  matrixTriggerId,
  onInsert,
  onOpenMatrix,
}: {
  entry: NotebookKeyboardEntry;
  matrixTriggerId: string;
  onInsert: (entry: NotebookKeyboardEntry) => void;
  onOpenMatrix: () => void;
}) {
  const documentOnly = entry.support === 'document-only';
  return (
    <button
      data-notebook-transient-trigger={entry.id === 'matrix' ? matrixTriggerId : undefined}
      type="button"
      className={`notebook-authoring-key is-${entry.support}`}
      aria-label={`${entry.label}${documentOnly ? ', document only' : ''}`}
      title={documentOnly
        ? `${entry.label} is available for authored documents but is not sent to calculator tools.`
        : `Insert ${entry.label}`}
      onClick={() => entry.id === 'matrix' ? onOpenMatrix() : onInsert(entry)}
      onPointerDown={(event) => event.preventDefault()}
    >
      <span className="notebook-authoring-key-symbol" aria-hidden="true">
        {entry.visualKeycap === 'matrix-grid' ? <MatrixGridIcon /> : entry.visualKeycap}
      </span>
      {documentOnly ? <i aria-hidden="true" title="Document only" /> : null}
    </button>
  );
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const tablist = document.querySelector('[role="tablist"][aria-label="Open workspaces"]');
  const tabBottom = tablist?.getBoundingClientRect().bottom ?? 0;
  return {
    x: Math.max(12, Math.min(x, window.innerWidth - width - 12)),
    y: Math.max(tabBottom + 12, Math.min(y, window.innerHeight - height - 12)),
  };
}

function NotebookMatrixPicker({
  layerId,
  onInsert,
}: {
  layerId: string;
  onInsert: (rows: number, columns: number) => void;
}) {
  const [dimensions, setDimensions] = useState({ rows: 2, columns: 2 });
  const gridRef = useRef<HTMLDivElement>(null);

  function focusCell(rows: number, columns: number) {
    setDimensions({ rows, columns });
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLElement>(
        `[data-matrix-row="${rows}"][data-matrix-column="${columns}"]`,
      )?.focus();
    });
  }

  return (
    <section
      data-notebook-transient-layer={layerId}
      className="notebook-matrix-picker"
      aria-label="Choose matrix dimensions"
    >
      <header>
        <strong>Matrix</strong>
        <span aria-live="polite">{dimensions.rows} × {dimensions.columns}</span>
      </header>
      <div ref={gridRef} role="grid" aria-label="Matrix dimensions" className="notebook-matrix-grid">
        {Array.from({ length: 8 }, (_, rowIndex) => (
          Array.from({ length: 8 }, (_, columnIndex) => {
            const rows = rowIndex + 1;
            const columns = columnIndex + 1;
            const selected = rows <= dimensions.rows && columns <= dimensions.columns;
            return (
              <button
                key={`${rows}x${columns}`}
                data-matrix-row={rows}
                data-matrix-column={columns}
                type="button"
                role="gridcell"
                tabIndex={rows === dimensions.rows && columns === dimensions.columns ? 0 : -1}
                className={selected ? 'is-selected' : undefined}
                aria-label={`${rows} by ${columns} matrix`}
                onFocus={() => setDimensions({ rows, columns })}
                onPointerEnter={() => setDimensions({ rows, columns })}
                onClick={() => onInsert(rows, columns)}
                onKeyDown={(event) => {
                  const next = {
                    rows: event.key === 'ArrowUp' ? Math.max(1, rows - 1)
                      : event.key === 'ArrowDown' ? Math.min(8, rows + 1) : rows,
                    columns: event.key === 'ArrowLeft' ? Math.max(1, columns - 1)
                      : event.key === 'ArrowRight' ? Math.min(8, columns + 1) : columns,
                  };
                  if (next.rows !== rows || next.columns !== columns) {
                    event.preventDefault();
                    focusCell(next.rows, next.columns);
                  }
                }}
              />
            );
          })
        ))}
      </div>
      <small>Square brackets · 1 × 1 through 8 × 8</small>
    </section>
  );
}

export function NotebookAuthoringKeyboard({ instanceId }: { instanceId: string }) {
  const controller = useNotebookMathFieldController();
  const { active } = controller;
  const { patchUiState, uiState } = useNotebookUiState(instanceId);
  const toolsLayer = useNotebookTransientLayer({ id: 'notebook-math-authoring-tools' });
  const symbolsLayer = useNotebookTransientLayer({
    id: 'notebook-math-authoring-symbols',
    parentId: toolsLayer.id,
  });
  const matrixLayer = useNotebookTransientLayer({
    id: 'notebook-matrix-picker',
    parentId: symbolsLayer.id,
  });
  const cancellationLayer = useNotebookTransientLayer({
    id: 'notebook-math-cancellation-variants',
    parentId: toolsLayer.id,
  });
  const closeTools = toolsLayer.close;
  const openTools = toolsLayer.open;
  const toolsOpen = toolsLayer.isOpen;
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<NotebookKeyboardTabId>('core');
  const [anchor, setAnchor] = useState<CSSProperties>({ left: 24, top: 120 });
  const [dragging, setDragging] = useState(false);
  const [mathFontSize, setMathFontSize] = useState(100);
  const [fontSizeNotice, setFontSizeNotice] = useState('Math size: 100%');
  const surfaceRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active?.field) {
      openTools();
    } else {
      closeTools(false);
    }
  }, [active, closeTools, openTools]);

  useLayoutEffect(() => {
    if (!active?.field || !toolsOpen || !surfaceRef.current || dragging) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }
      const surfaceBounds = surface.getBoundingClientRect();
      const fieldBounds = active.field.getBoundingClientRect();
      const saved = uiState.mathAuthoringPosition;
      const initialX = saved?.x ?? fieldBounds.left;
      const preferredBelow = fieldBounds.bottom + 12;
      const initialY = saved?.y ?? (
        preferredBelow + surfaceBounds.height <= window.innerHeight - 12
          ? preferredBelow
          : fieldBounds.top - surfaceBounds.height - 12
      );
      const next = clampPosition(initialX, initialY, surfaceBounds.width, surfaceBounds.height);
      setAnchor({ left: next.x, top: next.y });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, dragging, matrixLayer.isOpen, symbolsLayer.isOpen, toolsOpen, uiState.mathAuthoringPosition]);

  const entries = useMemo(
    () => notebookKeyboardEntries(query ? { query } : { tab }),
    [query, tab],
  );
  const quickEntries = QUICK_ENTRY_IDS
    .map(keyboardEntry)
    .filter((entry): entry is NotebookKeyboardEntry => Boolean(entry));
  const canApplyMathTypography = controller.canApplyTypography();

  if (!active || !toolsOpen) {
    return null;
  }

  function insert(entry: NotebookKeyboardEntry) {
    controller.insert(entry.latex);
  }

  function insertMatrix(rows: number, columns: number) {
    controller.insert(notebookMatrixLatex(rows, columns));
    matrixLayer.close(false);
  }

  function applyMathFontSize(size: number) {
    const result = controller.applyFontSize(size);
    if (!result) {
      return;
    }
    setMathFontSize(result.applied);
    setFontSizeNotice(
      result.applied === result.requested
        ? `Math size: ${result.applied}%`
        : `Math uses ${result.applied}% for your ${result.requested}% request`,
    );
  }

  function applyCancellation(variant: 'diagonal' | 'reverse-diagonal' | 'cross') {
    if (controller.applyCancellation(variant)) {
      cancellationLayer.close(false);
    }
  }

  function startDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!surfaceRef.current) {
      return;
    }
    event.preventDefault();
    const bounds = surfaceRef.current.getBoundingClientRect();
    const offset = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    setDragging(true);
    const move = (moveEvent: PointerEvent) => {
      const surface = surfaceRef.current;
      if (!surface) {
        return;
      }
      const currentBounds = surface.getBoundingClientRect();
      const next = clampPosition(
        moveEvent.clientX - offset.x,
        moveEvent.clientY - offset.y,
        currentBounds.width,
        currentBounds.height,
      );
      setAnchor({ left: next.x, top: next.y });
    };
    const finish = (upEvent: PointerEvent) => {
      const surface = surfaceRef.current;
      if (surface) {
        const currentBounds = surface.getBoundingClientRect();
        const next = clampPosition(
          upEvent.clientX - offset.x,
          upEvent.clientY - offset.y,
          currentBounds.width,
          currentBounds.height,
        );
        patchUiState({ mathAuthoringPosition: next });
        setAnchor({ left: next.x, top: next.y });
      }
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      controller.focusActive();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
  }

  return (
    <section
      ref={surfaceRef}
      data-notebook-transient-layer={toolsLayer.id}
      aria-label="Notebook math authoring surface"
      className={`notebook-authoring-keyboard${symbolsLayer.isOpen ? ' is-expanded' : ' is-compact'}${dragging ? ' is-dragging' : ''}`}
      data-testid="notebook-authoring-keyboard"
      style={anchor}
    >
      <header className="notebook-authoring-keyboard-header">
        <button
          type="button"
          className="notebook-authoring-drag-handle"
          aria-label="Move Math Authoring"
          title="Drag Math Authoring"
          onPointerDown={startDrag}
        ><GripHorizontal aria-hidden="true" size={17} /></button>
        <div>
          <Keyboard aria-hidden="true" size={17} />
          <strong>Math Field Tools</strong>
          <span>{active.role === 'inline' ? 'In text' : 'Separate equation'}</span>
        </div>
        <div className="notebook-authoring-keyboard-commands">
          <button type="button" aria-label="Undo math" title="Undo math" onClick={() => controller.execute('undo')}><Undo2 size={15} /></button>
          <button type="button" aria-label="Redo math" title="Redo math" onClick={() => controller.execute('redo')}><Redo2 size={15} /></button>
          <button type="button" aria-label="Move math cursor left" title="Move cursor left" onClick={() => controller.execute('moveToPreviousChar')}><ArrowLeft size={15} /></button>
          <button type="button" aria-label="Move math cursor right" title="Move cursor right" onClick={() => controller.execute('moveToNextChar')}><ArrowRight size={15} /></button>
          <button type="button" aria-label="Delete previous math character" title="Delete previous character" onClick={() => controller.execute('deleteBackward')}><Delete size={15} /></button>
          <button
            data-notebook-transient-trigger={symbolsLayer.id}
            type="button"
            aria-label={symbolsLayer.isOpen ? 'Close symbol keyboard' : 'Open symbol keyboard'}
            aria-expanded={symbolsLayer.isOpen}
            title={symbolsLayer.isOpen ? 'Close symbol keyboard' : 'Open symbol keyboard'}
            onClick={() => symbolsLayer.isOpen ? symbolsLayer.close() : symbolsLayer.open()}
          >
            <ChevronDown className={symbolsLayer.isOpen ? undefined : 'is-rotated'} size={15} />
          </button>
        </div>
      </header>
      <div className="notebook-authoring-style-controls">
        <NotebookFontSizeControl
          label="Selected math size"
          value={mathFontSize}
          disabled={!canApplyMathTypography}
          onApply={applyMathFontSize}
          onReset={() => {
            if (controller.resetFontSize()) {
              setMathFontSize(100);
              setFontSizeNotice('Math size reset to automatic');
            }
          }}
        />
        <output className="notebook-math-size-notice" aria-live="polite">
          {canApplyMathTypography ? fontSizeNotice : 'Select a math term to resize it'}
        </output>
        <div className="notebook-math-cancellation">
          <button
            type="button"
            aria-label="Cancel selected math diagonally"
            title="Cancel selected math diagonally"
            disabled={!controller.canApplyCancellation()}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => applyCancellation('diagonal')}
          ><Slash aria-hidden="true" size={16} /></button>
          <button
            data-notebook-transient-trigger={cancellationLayer.id}
            type="button"
            aria-label="More mathematical cancellation options"
            aria-expanded={cancellationLayer.isOpen}
            title="More mathematical cancellation options"
            disabled={!controller.canApplyCancellation()}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => cancellationLayer.toggle()}
          ><ChevronDown aria-hidden="true" size={15} /></button>
          {cancellationLayer.isOpen ? (
            <NotebookFloatingLayer
              align="end"
              layerId={cancellationLayer.id}
              className="notebook-math-cancellation-menu"
              role="menu"
              aria-label="Mathematical cancellation options"
            >
              <button type="button" role="menuitem" onClick={() => applyCancellation('diagonal')}>Diagonal cancel</button>
              <button type="button" role="menuitem" onClick={() => applyCancellation('reverse-diagonal')}>Reverse diagonal</button>
              <button type="button" role="menuitem" onClick={() => applyCancellation('cross')}>Cross cancel</button>
            </NotebookFloatingLayer>
          ) : null}
        </div>
      </div>
      {!symbolsLayer.isOpen ? (
        <div className="notebook-authoring-quick-keys" aria-label="Math structure shortcuts">
          {quickEntries.map((entry) => (
            <NotebookTemplateButton
              key={entry.id}
              entry={entry}
              matrixTriggerId={matrixLayer.id}
              onInsert={insert}
              onOpenMatrix={() => {
                symbolsLayer.open();
                requestAnimationFrame(() => matrixLayer.open());
              }}
            />
          ))}
        </div>
      ) : null}
      {symbolsLayer.isOpen ? (
        <div data-notebook-transient-layer={symbolsLayer.id} className="notebook-authoring-keyboard-body">
          <label className="notebook-authoring-keyboard-search">
            <Search aria-hidden="true" size={15} />
            <span className="sr-only">Search math templates</span>
            <input
              type="search"
              placeholder="Find a symbol or structure"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="notebook-authoring-keyboard-tabs" role="tablist" aria-label="Math template categories">
            {NOTEBOOK_KEYBOARD_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={!query && tab === item.id}
                className={!query && tab === item.id ? 'is-active' : undefined}
                onClick={() => {
                  setQuery('');
                  setTab(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="notebook-authoring-keyboard-grid" data-testid="notebook-keyboard-entries">
            {entries.map((entry) => (
              <NotebookTemplateButton
                key={entry.id}
                entry={entry}
                matrixTriggerId={matrixLayer.id}
                onInsert={insert}
                onOpenMatrix={matrixLayer.open}
              />
            ))}
            {entries.length === 0 ? <p>No matching math templates.</p> : null}
          </div>
        </div>
      ) : null}
      {matrixLayer.isOpen ? (
        <NotebookMatrixPicker layerId={matrixLayer.id} onInsert={insertMatrix} />
      ) : null}
    </section>
  );
}
