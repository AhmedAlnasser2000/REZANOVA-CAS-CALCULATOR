import { useState } from 'react';
import { MathStatic } from './MathStatic';
import { normalizeSymbolicDisplayLatex } from '../lib/symbolic-display';
import { clampApproxDigits, formatApproxNumber } from '../lib/numeric-output';
import type {
  AngleUnit,
  MathNotationDisplay,
  OutputStyle,
  Settings,
  SettingsPatch,
} from '../types/calculator';

type SettingsPanelPresentation = 'outboard' | 'overlay';

type SettingsPanelProps = {
  presentation: SettingsPanelPresentation;
  settings: Settings;
  onClose: () => void;
  onPatch: (patch: SettingsPatch) => void;
};

const SCALE_OPTIONS: Array<Settings['uiScale']> = [100, 115, 130, 145];
const ANGLE_OPTIONS: AngleUnit[] = ['deg', 'rad', 'grad'];
const OUTPUT_OPTIONS: OutputStyle[] = ['exact', 'decimal', 'both'];
const MATH_NOTATION_OPTIONS: MathNotationDisplay[] = ['rendered', 'plainText', 'latex'];
const SYMBOLIC_DISPLAY_OPTIONS: Array<Settings['symbolicDisplayMode']> = ['roots', 'powers', 'auto'];
const NOTATION_OPTIONS: Array<Settings['numericNotationMode']> = ['decimal', 'scientific', 'auto'];
const SCIENTIFIC_STYLE_OPTIONS: Array<Settings['scientificNotationStyle']> = ['times10', 'e'];

function symbolicPreviewLatex(settings: Settings) {
  return normalizeSymbolicDisplayLatex('\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}', settings)
    ?? '\\sqrt[3]{\\sqrt{x}}';
}

function symbolicPreviewSummary(settings: Settings) {
  if (settings.symbolicDisplayMode === 'powers') {
    return 'Previewing the power-preferred exact form.';
  }

  if (settings.symbolicDisplayMode === 'auto') {
    return 'Previewing the default power-leaning exact form while keeping plain roots readable.';
  }

  if (settings.flattenNestedRootsWhenSafe) {
    return 'Previewing a flattened radical form when it is safe.';
  }

  return 'Previewing a nested-radical form without flattening.';
}

export function SettingsPanel({
  presentation,
  settings,
  onClose,
  onPatch,
}: SettingsPanelProps) {
  const [approxDigitsDraft, setApproxDigitsDraft] = useState<string | null>(null);
  const approxDigitsInputValue = approxDigitsDraft ?? `${settings.approxDigits}`;

  function applyApproxDigitsDraft(nextDraft: string) {
    setApproxDigitsDraft(nextDraft);

    if (!/^-?\d+$/.test(nextDraft.trim())) {
      return;
    }

    onPatch({ approxDigits: clampApproxDigits(Number(nextDraft)) });
  }

  function commitApproxDigitsDraft() {
    if (!/^-?\d+$/.test(approxDigitsInputValue.trim())) {
      setApproxDigitsDraft(null);
      return;
    }

    const nextValue = clampApproxDigits(Number(approxDigitsInputValue));
    setApproxDigitsDraft(null);
    onPatch({ approxDigits: nextValue });
  }

  const numericPreviewValue = formatApproxNumber(1234567.891234, settings);

  return (
    <aside
      className={`settings-panel settings-panel--${presentation}`}
      data-testid="settings-panel"
      data-settings-presentation={presentation}
    >
      <div className="settings-panel-header">
        <div>
          <strong>Settings</strong>
          <p>Live app preferences and symbolic display defaults.</p>
        </div>
        <button
          type="button"
          className="settings-panel-close"
          data-testid="settings-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="settings-panel-body">
        <section className="settings-section">
          <div className="settings-section-title">Display</div>
          <div className="settings-field">
            <span>UI Scale</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`ui-scale-${option}`}
                  type="button"
                  data-testid={`settings-ui-scale-${option}`}
                  className={settings.uiScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ uiScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Math Size</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`math-scale-${option}`}
                  type="button"
                  data-testid={`settings-math-scale-${option}`}
                  className={settings.mathScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ mathScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Result Size</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`result-scale-${option}`}
                  type="button"
                  data-testid={`settings-result-scale-${option}`}
                  className={settings.resultScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ resultScale: option })}
                >
                  {option}%
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>High Contrast</span>
            <input
              type="checkbox"
              data-testid="settings-high-contrast"
              checked={settings.highContrast}
              onChange={(event) => onPatch({ highContrast: event.currentTarget.checked })}
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">Numeric Output</div>
          <label className="settings-field">
            <span>Approximate digits</span>
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              inputMode="numeric"
              className="settings-number-input"
              data-testid="settings-approx-digits-input"
              value={approxDigitsInputValue}
              onChange={(event) => applyApproxDigitsDraft(event.currentTarget.value)}
              onBlur={commitApproxDigitsDraft}
            />
          </label>
          <div className="settings-field">
            <span>Notation</span>
            <div className="settings-chip-row">
              {NOTATION_OPTIONS.map((option) => (
                <button
                  key={`notation-${option}`}
                  type="button"
                  data-testid={`settings-notation-mode-${option}`}
                  className={settings.numericNotationMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ numericNotationMode: option })}
                >
                  {option === 'decimal'
                    ? 'Decimal'
                    : option === 'scientific'
                      ? 'Scientific'
                      : 'Auto'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Scientific format</span>
            <div className="settings-chip-row">
              {SCIENTIFIC_STYLE_OPTIONS.map((option) => (
                <button
                  key={`scientific-style-${option}`}
                  type="button"
                  data-testid={`settings-scientific-style-${option}`}
                  className={settings.scientificNotationStyle === option ? 'is-active' : ''}
                  onClick={() => onPatch({ scientificNotationStyle: option })}
                >
                  {option === 'times10' ? '×10^n' : 'e'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-preview-card">
            <div className="settings-preview-label">Preview</div>
            <p data-testid="settings-numeric-preview-result">{numericPreviewValue}</p>
            <p className="settings-help-text">
              Controls approximate output only. Exact symbolic lines stay exact.
            </p>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">Symbolic Display</div>
          <div className="settings-field">
            <span>Power / Root Style</span>
            <div className="settings-chip-row">
              {SYMBOLIC_DISPLAY_OPTIONS.map((option) => (
                <button
                  key={`symbolic-${option}`}
                  type="button"
                  data-testid={`settings-symbolic-mode-${option}`}
                  className={settings.symbolicDisplayMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ symbolicDisplayMode: option })}
                >
                  {option === 'roots'
                    ? 'Prefer Roots'
                    : option === 'powers'
                      ? 'Prefer Powers'
                      : 'Auto'}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>Flatten Nested Roots When Safe</span>
            <input
              type="checkbox"
              data-testid="settings-flatten-nested-roots"
              checked={settings.flattenNestedRootsWhenSafe}
              onChange={(event) =>
                onPatch({ flattenNestedRootsWhenSafe: event.currentTarget.checked })
              }
            />
          </label>
          <div className="settings-preview-card">
            <div className="settings-preview-label">Preview Input</div>
            <MathStatic className="preview-math" latex="\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}" />
            <div className="settings-preview-label">Preview Output</div>
            <div data-testid="settings-symbolic-preview-result">
              <MathStatic className="result-math" latex={symbolicPreviewLatex(settings)} />
            </div>
            <p data-testid="settings-symbolic-preview-note">{symbolicPreviewSummary(settings)}</p>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">General</div>
          <div className="settings-field">
            <span>Angle Unit</span>
            <div className="settings-chip-row">
              {ANGLE_OPTIONS.map((option) => (
                <button
                  key={`angle-${option}`}
                  type="button"
                  data-testid={`settings-angle-unit-${option}`}
                  className={settings.angleUnit === option ? 'is-active' : ''}
                  onClick={() => onPatch({ angleUnit: option })}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Math Notation</span>
            <div className="settings-chip-row">
              {MATH_NOTATION_OPTIONS.map((option) => (
                <button
                  key={`math-notation-${option}`}
                  type="button"
                  data-testid={`settings-math-notation-${option}`}
                  className={settings.mathNotationDisplay === option ? 'is-active' : ''}
                  onClick={() => onPatch({ mathNotationDisplay: option })}
                >
                  {option === 'rendered'
                    ? 'Rendered'
                    : option === 'plainText'
                      ? 'Plain Text'
                      : 'LaTeX'}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>Output Style</span>
            <div className="settings-chip-row">
              {OUTPUT_OPTIONS.map((option) => (
                <button
                  key={`output-${option}`}
                  type="button"
                  data-testid={`settings-output-style-${option}`}
                  className={settings.outputStyle === option ? 'is-active' : ''}
                  onClick={() => onPatch({ outputStyle: option })}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>Auto Switch to Equation</span>
            <input
              type="checkbox"
              data-testid="settings-auto-switch-equation"
              checked={settings.autoSwitchToEquation}
              onChange={(event) =>
                onPatch({ autoSwitchToEquation: event.currentTarget.checked })
              }
            />
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">History</div>
          <label className="settings-toggle-row">
            <span>History Enabled</span>
            <input
              type="checkbox"
              data-testid="settings-history-enabled"
              checked={settings.historyEnabled}
              onChange={(event) => onPatch({ historyEnabled: event.currentTarget.checked })}
            />
          </label>
          <p className="settings-help-text">
            Controls whether new history entries are recorded. The top-row history button still
            only opens or closes the history panel.
          </p>
        </section>
      </div>
    </aside>
  );
}
