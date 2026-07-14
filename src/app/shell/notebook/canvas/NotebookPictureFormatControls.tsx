import type { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { NodeSelection } from '@tiptap/pm/state';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Crop,
  RotateCw,
  Scaling,
  WrapText,
} from 'lucide-react';
import { useRef, useState } from 'react';

import {
  notebookEffectiveImagePlacement,
  type NotebookImageAlignment,
  type NotebookImagePlacement,
  type NotebookPageSetup,
} from '../../../../lib/notebook';
import { useNotebookTransientLayer } from '../transient-ui';
import { notebookEditorNodeById, notebookEditorSelection } from './selection';

type CropInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const WIDTH_PRESETS = [25, 50, 75, 100] as const;
const WRAP_OPTIONS: ReadonlyArray<{
  value: NotebookImagePlacement;
  label: string;
  description: string;
}> = [
  { value: 'normal', label: 'Normal flow', description: 'Place the picture between paragraphs.' },
  { value: 'top-and-bottom', label: 'Top and Bottom', description: 'Keep text above and below the picture.' },
  { value: 'square-left', label: 'Square Left', description: 'Wrap text beside a left-aligned picture.' },
  { value: 'square-right', label: 'Square Right', description: 'Wrap text beside a right-aligned picture.' },
];

function selectedImage(editor: Editor) {
  const selected = notebookEditorSelection(editor);
  return selected?.type === 'imageFigure' && selected.id ? selected : null;
}

function imageWidth(value: unknown) {
  return typeof value === 'number' && value >= 10 && value <= 100 ? value : 100;
}

function imageAlignment(value: unknown): NotebookImageAlignment {
  return value === 'left' || value === 'right' ? value : 'center';
}

function imagePlacement(value: unknown): NotebookImagePlacement {
  return value === 'top-and-bottom' || value === 'square-left' || value === 'square-right'
    ? value
    : 'normal';
}

function cropInsets(attrs: Record<string, unknown>): CropInsets {
  const x = typeof attrs.cropX === 'number' ? attrs.cropX : 0;
  const y = typeof attrs.cropY === 'number' ? attrs.cropY : 0;
  const width = typeof attrs.cropWidth === 'number' ? attrs.cropWidth : 1;
  const height = typeof attrs.cropHeight === 'number' ? attrs.cropHeight : 1;
  return {
    top: Math.round(y * 100),
    right: Math.round((1 - x - width) * 100),
    bottom: Math.round((1 - y - height) * 100),
    left: Math.round(x * 100),
  };
}

function boundedPercent(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(90, Math.round(parsed))) : 0;
}

function boundedWidth(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(10, Math.min(100, Math.round(parsed))) : 10;
}

function editorContentWidth(editor: Editor) {
  const element = editor.view.dom as HTMLElement;
  const style = getComputedStyle(element);
  const width = element.clientWidth
    - (Number.parseFloat(style.paddingLeft) || 0)
    - (Number.parseFloat(style.paddingRight) || 0);
  return width > 0 ? width : undefined;
}

export function NotebookPictureFormatControls({
  editor,
  pageSetup,
}: {
  editor: Editor;
  pageSetup: NotebookPageSetup;
}) {
  const widthLayer = useNotebookTransientLayer({ id: 'notebook-picture-width' });
  const wrapLayer = useNotebookTransientLayer({ id: 'notebook-picture-wrap' });
  const cropLayer = useNotebookTransientLayer({ id: 'notebook-picture-crop' });
  const targetIdRef = useRef<string | null>(null);
  const image = selectedImage(editor);
  const attrs = image?.attrs ?? {};
  const width = imageWidth(attrs.widthPercent);
  const alignment = imageAlignment(attrs.alignment);
  const placement = imagePlacement(attrs.placement);
  const rotation = typeof attrs.rotation === 'number' ? attrs.rotation : 0;
  const hasCrop = ['cropX', 'cropY', 'cropWidth', 'cropHeight']
    .every((key) => typeof attrs[key] === 'number');
  const effectivePlacement = notebookEffectiveImagePlacement(
    pageSetup,
    placement,
    width,
    editorContentWidth(editor),
  );
  const [customWidth, setCustomWidth] = useState(width);
  const [cropDraft, setCropDraft] = useState<CropInsets>(() => cropInsets(attrs));

  function rememberTarget() {
    const current = selectedImage(editor);
    targetIdRef.current = current?.id ?? null;
    return current;
  }

  function updateImage(nextAttrs: Record<string, unknown>) {
    const targetId = targetIdRef.current ?? selectedImage(editor)?.id;
    if (!targetId) return false;
    const target = notebookEditorNodeById(editor, targetId);
    if (!target || target.type !== 'imageFigure') return false;
    const node = editor.state.doc.nodeAt(target.from);
    if (!node) return false;
    const transaction = closeHistory(editor.state.tr).setNodeMarkup(target.from, undefined, {
      ...node.attrs,
      ...nextAttrs,
    });
    transaction.setSelection(NodeSelection.create(transaction.doc, target.from));
    editor.view.dispatch(transaction);
    editor.view.focus();
    return true;
  }

  function setWidth(nextWidth: number) {
    updateImage({ widthPercent: nextWidth === 100 ? null : nextWidth });
  }

  function setAlignment(nextAlignment: NotebookImageAlignment) {
    let nextPlacement: NotebookImagePlacement = placement;
    if (placement === 'square-left' || placement === 'square-right') {
      nextPlacement = nextAlignment === 'center'
        ? 'normal'
        : nextAlignment === 'left' ? 'square-left' : 'square-right';
    }
    updateImage({
      alignment: nextAlignment === 'center' ? null : nextAlignment,
      placement: nextPlacement === 'normal' ? null : nextPlacement,
    });
  }

  function setPlacement(nextPlacement: NotebookImagePlacement) {
    updateImage({
      placement: nextPlacement === 'normal' ? null : nextPlacement,
      ...(nextPlacement === 'square-left' ? { alignment: 'left' } : {}),
      ...(nextPlacement === 'square-right' ? { alignment: 'right' } : {}),
    });
    wrapLayer.close(false);
  }

  function openWidth() {
    const current = rememberTarget();
    setCustomWidth(imageWidth(current?.attrs.widthPercent));
    widthLayer.toggle();
  }

  function openWrap() {
    rememberTarget();
    wrapLayer.toggle();
  }

  function openCrop() {
    const current = rememberTarget();
    setCropDraft(cropInsets(current?.attrs ?? {}));
    cropLayer.toggle();
  }

  const cropIsValid = cropDraft.left + cropDraft.right <= 90
    && cropDraft.top + cropDraft.bottom <= 90;

  return (
    <>
      <section className="notebook-ribbon-group is-picture-size" aria-label="Picture size">
        <div className="notebook-ribbon-group-tools">
          {WIDTH_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={width === preset ? 'is-active' : undefined}
              aria-label={`Set image width to ${preset}%`}
              aria-pressed={width === preset}
              title={`${preset}% page width`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                rememberTarget();
                setWidth(preset);
              }}
            >{preset}%</button>
          ))}
          <div className="notebook-picture-control">
            <button
              data-notebook-transient-trigger={widthLayer.id}
              type="button"
              aria-label="Custom image width"
              aria-haspopup="dialog"
              aria-expanded={widthLayer.isOpen}
              title="Custom image width"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openWidth}
            ><Scaling aria-hidden="true" size={16} /><ChevronDown aria-hidden="true" size={11} /></button>
            {widthLayer.isOpen ? (
              <div
                data-notebook-transient-layer={widthLayer.id}
                className="notebook-picture-popover notebook-picture-width-popover"
                role="dialog"
                aria-label="Custom image width"
              >
                <label>
                  <span>Width</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={customWidth}
                    aria-label="Image width percentage"
                    onChange={(event) => setCustomWidth(Number(event.target.value))}
                  />
                </label>
                <div>
                  <label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="1"
                      value={customWidth}
                      aria-label="Custom image width percentage"
                      onChange={(event) => setCustomWidth(boundedWidth(event.target.value))}
                    />
                    <span>%</span>
                  </label>
                  <span>of the text area</span>
                </div>
                <footer>
                  <button type="button" onClick={() => widthLayer.close()}>Cancel</button>
                  <button type="button" onClick={() => {
                    setWidth(customWidth);
                    widthLayer.close(false);
                  }}>Apply</button>
                </footer>
              </div>
            ) : null}
          </div>
        </div>
        <span className="notebook-ribbon-group-label">Size</span>
      </section>

      <section className="notebook-ribbon-group" aria-label="Picture alignment">
        <div className="notebook-ribbon-group-tools">
          {([
            ['left', 'Align image left', AlignLeft],
            ['center', 'Center image', AlignCenter],
            ['right', 'Align image right', AlignRight],
          ] as const).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              className={alignment === value ? 'is-active' : undefined}
              aria-label={label}
              aria-pressed={alignment === value}
              title={label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                rememberTarget();
                setAlignment(value);
              }}
            ><Icon aria-hidden="true" size={16} /></button>
          ))}
        </div>
        <span className="notebook-ribbon-group-label">Align</span>
      </section>

      <section className="notebook-ribbon-group" aria-label="Picture wrapping">
        <div className="notebook-ribbon-group-tools">
          <div className="notebook-picture-control">
            <button
              data-notebook-transient-trigger={wrapLayer.id}
              type="button"
              className={placement !== 'normal' ? 'is-active' : undefined}
              aria-label={`Wrap text: ${WRAP_OPTIONS.find((option) => option.value === placement)?.label}`}
              aria-haspopup="menu"
              aria-expanded={wrapLayer.isOpen}
              title="Wrap text"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openWrap}
            ><WrapText aria-hidden="true" size={16} /><ChevronDown aria-hidden="true" size={11} /></button>
            {wrapLayer.isOpen ? (
              <div
                data-notebook-transient-layer={wrapLayer.id}
                className="notebook-picture-menu"
                role="menu"
                aria-label="Picture wrapping"
              >
                {WRAP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={placement === option.value}
                    className={placement === option.value ? 'is-active' : undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setPlacement(option.value)}
                  >
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </button>
                ))}
                {effectivePlacement !== placement ? (
                  <p role="status">Normal flow is used at this size to keep the text column readable.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <span className="notebook-ribbon-group-label">Wrap</span>
      </section>

      <section className="notebook-ribbon-group" aria-label="Picture crop and rotation">
        <div className="notebook-ribbon-group-tools">
          <div className="notebook-picture-control">
            <button
              data-notebook-transient-trigger={cropLayer.id}
              type="button"
              className={hasCrop ? 'is-active' : undefined}
              aria-label="Crop image"
              aria-haspopup="dialog"
              aria-expanded={cropLayer.isOpen}
              title="Crop image"
              onMouseDown={(event) => event.preventDefault()}
              onClick={openCrop}
            ><Crop aria-hidden="true" size={16} /></button>
            {cropLayer.isOpen ? (
              <div
                data-notebook-transient-layer={cropLayer.id}
                className="notebook-picture-popover notebook-picture-crop-popover"
                role="dialog"
                aria-label="Crop image"
              >
                <span>Trim from each edge</span>
                <div>
                  {(Object.keys(cropDraft) as Array<keyof CropInsets>).map((edge) => (
                    <label key={edge}>
                      <span>{edge}</span>
                      <input
                        type="number"
                        min="0"
                        max="90"
                        step="1"
                        value={cropDraft[edge]}
                        aria-label={`${edge} crop percentage`}
                        onChange={(event) => setCropDraft((current) => ({
                          ...current,
                          [edge]: boundedPercent(event.target.value),
                        }))}
                      />
                    </label>
                  ))}
                </div>
                {!cropIsValid ? <p role="alert">Leave at least 10% of the image visible.</p> : null}
                <footer>
                  <button type="button" onClick={() => {
                    updateImage({
                      cropX: null,
                      cropY: null,
                      cropWidth: null,
                      cropHeight: null,
                    });
                    cropLayer.close(false);
                  }}>Reset</button>
                  <button type="button" disabled={!cropIsValid} onClick={() => {
                    const isFull = Object.values(cropDraft).every((value) => value === 0);
                    updateImage(isFull ? {
                      cropX: null,
                      cropY: null,
                      cropWidth: null,
                      cropHeight: null,
                    } : {
                      cropX: cropDraft.left / 100,
                      cropY: cropDraft.top / 100,
                      cropWidth: (100 - cropDraft.left - cropDraft.right) / 100,
                      cropHeight: (100 - cropDraft.top - cropDraft.bottom) / 100,
                    });
                    cropLayer.close(false);
                  }}>Apply</button>
                </footer>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Rotate image right 90 degrees"
            title="Rotate right 90°"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              rememberTarget();
              const nextRotation = (rotation + 90) % 360;
              updateImage({ rotation: nextRotation === 0 ? null : nextRotation });
            }}
          ><RotateCw aria-hidden="true" size={16} /></button>
        </div>
        <span className="notebook-ribbon-group-label">Crop & Rotate</span>
      </section>
    </>
  );
}
