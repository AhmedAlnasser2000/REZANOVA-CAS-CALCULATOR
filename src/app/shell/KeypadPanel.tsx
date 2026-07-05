import {
  getKeypadLayerAction,
  type KeypadButton,
  type KeypadLayer,
} from '../../lib/navigation/menu';
import type { MouseEvent } from 'react';

type KeypadPanelProps = {
  rows: KeypadButton[][];
  activeLayer?: KeypadLayer;
  layerLocked?: boolean;
  onKeypad: (button: KeypadButton) => void;
  onSelectLayer?: (layer: KeypadLayer) => void;
  onToggleLayerLock?: () => void;
};

const KEYPAD_LAYERS: Array<{ id: KeypadLayer; label: string }> = [
  { id: 'base', label: 'Base' },
  { id: 'shift', label: 'Shift' },
  { id: 'alpha', label: 'Alt α' },
  { id: 'ctrl', label: 'Ctrl' },
];

function preserveEditorFocusOnMouseDown(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

function KeypadPanel({
  rows,
  activeLayer = 'base',
  layerLocked = false,
  onKeypad,
  onSelectLayer,
  onToggleLayerLock,
}: KeypadPanelProps) {
  return (
    <section className="keypad-panel">
      <div className="keypad-layer-rail" aria-label="Keypad layers">
        {KEYPAD_LAYERS.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={`keypad-layer-button ${activeLayer === layer.id ? 'is-active' : ''}`}
            data-testid={`keypad-layer-${layer.id}`}
            aria-pressed={activeLayer === layer.id}
            onMouseDown={preserveEditorFocusOnMouseDown}
            onClick={() => onSelectLayer?.(layer.id)}
          >
            {layer.label}
          </button>
        ))}
        <button
          type="button"
          className={`keypad-layer-button keypad-layer-lock ${layerLocked ? 'is-active' : ''}`}
          data-testid="keypad-layer-lock"
          aria-pressed={layerLocked}
          onMouseDown={preserveEditorFocusOnMouseDown}
          onClick={onToggleLayerLock}
        >
          Lock
        </button>
      </div>
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="keypad-row">
          {row.map((button) => {
            const activeAction = getKeypadLayerAction(button, activeLayer);
            const shiftLabel = getKeypadLayerAction(button, 'shift')?.label ?? button.secondary;
            const alphaLabel = getKeypadLayerAction(button, 'alpha')?.label ?? button.alpha;
            const ctrlLabel = getKeypadLayerAction(button, 'ctrl')?.label ?? button.ctrl;

            return (
              <button
                key={button.id}
                data-testid={`keypad-${button.id}`}
                className={`keypad-key ${button.variant} keypad-key--layer-${activeLayer}`}
                onMouseDown={preserveEditorFocusOnMouseDown}
                onClick={() => onKeypad(button)}
              >
                {shiftLabel ? (
                  <span className="keypad-key-legend keypad-key-legend--shift">{shiftLabel}</span>
                ) : null}
                {alphaLabel ? (
                  <span className="keypad-key-legend keypad-key-legend--alpha">{alphaLabel}</span>
                ) : null}
                {ctrlLabel && activeLayer === 'ctrl' ? (
                  <span className="keypad-key-legend keypad-key-legend--ctrl">{ctrlLabel}</span>
                ) : null}
                <span className="keypad-key-label">{activeAction?.label ?? button.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

export { KeypadPanel };
