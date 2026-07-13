import type { Editor } from '@tiptap/core';
import {
  Bold,
  Highlighter,
  Italic,
  Palette,
  RotateCcw,
  Strikethrough,
} from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { useNotebookTransientLayer } from '../transient-ui';
import { NotebookFontSizeControl } from './NotebookFontSizeControl';

export type NotebookProseSelection = {
  from: number;
  to: number;
};

export type NotebookPaletteMode = 'highlight' | 'text-color';

export type NotebookPaletteRequest = {
  mode: NotebookPaletteMode;
  nonce: number;
};

const TEXT_COLORS = [
  { label: 'Paper white', value: '#edf2e8' },
  { label: 'Pale olive', value: '#c5dda9' },
  { label: 'Sky blue', value: '#9dcdf0' },
  { label: 'Warm gold', value: '#e5c47a' },
  { label: 'Soft coral', value: '#efa79a' },
  { label: 'Lavender', value: '#c7b8ef' },
] as const;

const HIGHLIGHT_COLORS = [
  { label: 'Olive', value: '#40573a' },
  { label: 'Blue', value: '#24506a' },
  { label: 'Amber', value: '#66501f' },
  { label: 'Rose', value: '#663b48' },
  { label: 'Teal', value: '#245b55' },
  { label: 'Violet', value: '#504066' },
] as const;

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const value = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/iu.test(value)) {
    return 0;
  }
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

function contrast(first: string, second: string) {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function selectionPosition(editor: Editor, toolbarWidth = 264): CSSProperties {
  const selection = window.getSelection();
  if (!selection?.rangeCount) {
    return { left: '50%', top: 72 };
  }
  const range = selection.getRangeAt(0);
  if (typeof range.getBoundingClientRect !== 'function') {
    return { left: '50%', top: 72 };
  }
  const rangeBounds = range.getBoundingClientRect();
  const canvasBounds = editor.view.dom.closest('.notebook-rich-canvas')?.getBoundingClientRect();
  if (!canvasBounds || (!rangeBounds.width && !rangeBounds.height)) {
    return { left: '50%', top: 72 };
  }
  const horizontalClearance = Math.max(12, toolbarWidth / 2 + 8);
  const left = Math.max(horizontalClearance, Math.min(
    rangeBounds.left - canvasBounds.left + rangeBounds.width / 2,
    canvasBounds.width - horizontalClearance,
  ));
  const top = Math.max(58, rangeBounds.top - canvasBounds.top - 12);
  return { left, top };
}

function restoreSelection(editor: Editor, selection: NotebookProseSelection) {
  return editor.chain().focus().setTextSelection(selection);
}

export function NotebookSelectionToolbar({
  editor,
  paletteRequest,
  selection,
}: {
  editor: Editor;
  paletteRequest: NotebookPaletteRequest | null;
  selection: NotebookProseSelection | null;
}) {
  const toolbarLayer = useNotebookTransientLayer({ id: 'notebook-selection-toolbar' });
  const paletteLayer = useNotebookTransientLayer({
    id: 'notebook-selection-palette',
    parentId: toolbarLayer.id,
  });
  const toolbarClose = toolbarLayer.close;
  const toolbarOpen = toolbarLayer.open;
  const paletteClose = paletteLayer.close;
  const paletteOpen = paletteLayer.open;
  const [activePalette, setActivePalette] = useState<NotebookPaletteMode>(
    paletteRequest?.mode ?? 'highlight',
  );
  const [customColor, setCustomColor] = useState('#c5dda9');
  const [position, setPosition] = useState<CSSProperties>({ left: '50%', top: 72 });
  const [recentColors, setRecentColors] = useState<Record<NotebookPaletteMode, string[]>>({
    highlight: [],
    'text-color': [],
  });
  const lastSelectionRef = useRef<string | null>(null);
  const lastPaletteRequestRef = useRef(0);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!selection || !toolbarLayer.isOpen) {
      return;
    }
    const update = () => {
      setPosition(selectionPosition(editor, toolbarRef.current?.getBoundingClientRect().width));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [editor, selection, toolbarLayer.isOpen]);

  useEffect(() => {
    if (!selection) {
      lastSelectionRef.current = null;
      paletteClose(false);
      toolbarClose(false);
      return;
    }
    const signature = `${selection.from}:${selection.to}`;
    if (signature !== lastSelectionRef.current) {
      lastSelectionRef.current = signature;
      toolbarOpen();
    }
  }, [paletteClose, selection, toolbarClose, toolbarOpen]);

  useEffect(() => {
    if (!selection || !paletteRequest || paletteRequest.nonce === lastPaletteRequestRef.current) {
      return;
    }
    lastPaletteRequestRef.current = paletteRequest.nonce;
    toolbarOpen();
    paletteOpen();
  }, [paletteOpen, paletteRequest, selection, toolbarOpen]);

  if (!selection || !toolbarLayer.isOpen) {
    return null;
  }
  const currentSelection = selection;

  function applyMark(mark: 'bold' | 'italic' | 'strike') {
    const chain = restoreSelection(editor, currentSelection);
    if (mark === 'bold') {
      chain.toggleBold().run();
    } else if (mark === 'italic') {
      chain.toggleItalic().run();
    } else {
      chain.toggleStrike().run();
    }
  }

  function selectionFontSize() {
    const value = editor.getAttributes('textStyle').fontSize;
    return typeof value === 'number' ? value : null;
  }

  function requestPalette(mode: NotebookPaletteMode) {
    setActivePalette(mode);
    paletteOpen();
  }

  function applyColor(value: string) {
    const chain = restoreSelection(editor, currentSelection);
    if (activePalette === 'highlight') {
      chain.setHighlight({ color: value }).run();
    } else {
      chain.setColor(value).run();
    }
    setRecentColors((current) => ({
      ...current,
      [activePalette]: [value, ...current[activePalette].filter((color) => color !== value)].slice(0, 4),
    }));
  }

  function clearColor() {
    const chain = restoreSelection(editor, currentSelection);
    if (activePalette === 'highlight') {
      chain.unsetHighlight().run();
    } else {
      chain.unsetColor().run();
    }
  }

  const colors = activePalette === 'highlight' ? HIGHLIGHT_COLORS : TEXT_COLORS;
  const contrastTarget = activePalette === 'highlight' ? '#edf2e8' : '#0b1819';
  const lowContrast = contrast(customColor, contrastTarget) < 3;

  return (
    <div
      ref={toolbarRef}
      data-notebook-transient-layer={toolbarLayer.id}
      data-testid="notebook-selection-toolbar"
      className="notebook-selection-toolbar"
      style={position}
      onPointerDown={(event) => {
        if (event.target instanceof HTMLInputElement) {
          return;
        }
        event.preventDefault();
      }}
    >
      <button type="button" aria-label="Bold selection" aria-pressed={editor.isActive('bold')} onClick={() => applyMark('bold')}>
        <Bold aria-hidden="true" size={15} />
      </button>
      <button type="button" aria-label="Italicize selection" aria-pressed={editor.isActive('italic')} onClick={() => applyMark('italic')}>
        <Italic aria-hidden="true" size={15} />
      </button>
      <button type="button" aria-label="Strikethrough selection" aria-pressed={editor.isActive('strike')} onClick={() => applyMark('strike')}>
        <Strikethrough aria-hidden="true" size={15} />
      </button>
      <button
        data-notebook-transient-trigger={paletteLayer.id}
        type="button"
        aria-label="Highlight selection"
        aria-expanded={paletteLayer.isOpen && activePalette === 'highlight'}
        onClick={() => requestPalette('highlight')}
      >
        <Highlighter aria-hidden="true" size={15} />
      </button>
      <button
        data-notebook-transient-trigger={paletteLayer.id}
        type="button"
        aria-label="Color selected text"
        aria-expanded={paletteLayer.isOpen && activePalette === 'text-color'}
        onClick={() => requestPalette('text-color')}
      >
        <Palette aria-hidden="true" size={15} />
      </button>
      <NotebookFontSizeControl
        label="Selected text font size"
        value={selectionFontSize()}
        onApply={(fontSize) => restoreSelection(editor, currentSelection).setMark('textStyle', { fontSize }).run()}
        onReset={() => restoreSelection(editor, currentSelection).setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()}
      />
      {paletteLayer.isOpen ? (
        <section
          data-notebook-transient-layer={paletteLayer.id}
          className="notebook-selection-palette"
          aria-label="Notebook selection colors"
        >
          <header>
            <button type="button" className={activePalette === 'text-color' ? 'is-active' : undefined} onClick={() => setActivePalette('text-color')}>Text Color</button>
            <button type="button" className={activePalette === 'highlight' ? 'is-active' : undefined} onClick={() => setActivePalette('highlight')}>Highlight</button>
          </header>
          <div className="notebook-selection-swatches">
            {colors.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={`${activePalette === 'highlight' ? 'Highlight' : 'Text'} ${color.label}`}
                title={color.label}
                style={{ '--notebook-swatch': color.value } as CSSProperties}
                onClick={() => applyColor(color.value)}
              />
            ))}
          </div>
          {recentColors[activePalette].length ? (
            <div className="notebook-selection-recents">
              <span>Recent</span>
              {recentColors[activePalette].map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Use recent color ${color}`}
                  style={{ '--notebook-swatch': color } as CSSProperties}
                  onClick={() => applyColor(color)}
                />
              ))}
            </div>
          ) : null}
          <div className="notebook-selection-custom-color">
            <label>
              <span>Custom</span>
              <input
                type="color"
                aria-label={`Custom ${activePalette === 'highlight' ? 'highlight' : 'text'} color`}
                value={customColor}
                onChange={(event) => setCustomColor(event.target.value)}
              />
            </label>
            <button type="button" onClick={() => applyColor(customColor)}>Apply</button>
            <button type="button" aria-label="Clear selected color" title="Clear color" onClick={clearColor}>
              <RotateCcw aria-hidden="true" size={14} />
            </button>
          </div>
          {lowContrast ? <p role="status">This custom color may be difficult to read.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
