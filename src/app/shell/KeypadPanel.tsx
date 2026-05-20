import type { KeypadButton } from '../../lib/menu';

type KeypadPanelProps = {
  rows: KeypadButton[][];
  onKeypad: (button: KeypadButton) => void;
};

function KeypadPanel({ rows, onKeypad }: KeypadPanelProps) {
  return (
    <section className="keypad-panel">
      {rows.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="keypad-row">
          {row.map((button) => (
            <button
              key={button.id}
              data-testid={`keypad-${button.id}`}
              className={`keypad-key ${button.variant}`}
              onClick={() => onKeypad(button)}
            >
              <span>{button.label}</span>
            </button>
          ))}
        </div>
      ))}
    </section>
  );
}

export { KeypadPanel };
