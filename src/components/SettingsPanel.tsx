import { useState } from 'react';
import { MathStatic } from './MathStatic';
import { normalizeSymbolicDisplayLatex } from '../lib/display/symbolic-display';
import { clampApproxDigits, formatApproxNumber } from '../lib/display/numeric-output';
import { listLanguageMetadata, type SettingsLanguageCatalog } from '../lib/language';
import { useLanguage } from '../lib/language/language-context';
import type {
  AngleUnit,
  ComplexExactForm,
  EquationAnswerMode,
  MathNotationDisplay,
  OutputStyle,
  Settings,
  SettingsPatch,
} from '../types/calculator';

export type SettingsPanelSectionId =
  | 'display'
  | 'numericOutput'
  | 'symbolicDisplay'
  | 'complex'
  | 'general'
  | 'history'
  | 'calculatorMemory';

type SettingsPanelPresentation = 'outboard' | 'overlay' | 'page';

type SettingsPanelProps = {
  presentation: SettingsPanelPresentation;
  settings: Settings;
  onClose: () => void;
  onOpenFullPage?: () => void;
  onPatch: (patch: SettingsPatch) => void;
  onClearHistory: () => void;
  onResetCalculatorMemory: () => void;
  showHeader?: boolean;
  visibleSections?: readonly SettingsPanelSectionId[];
};

const MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS = 20;
const SCALE_OPTIONS: Array<Settings['uiScale']> = [100, 115, 130, 145];
const ANGLE_OPTIONS: AngleUnit[] = ['deg', 'rad', 'grad'];
const OUTPUT_OPTIONS: OutputStyle[] = ['exact', 'decimal', 'both'];
const EQUATION_ANSWER_MODE_OPTIONS: EquationAnswerMode[] = ['exact', 'isolate'];
const COMPLEX_EXACT_FORM_OPTIONS: ComplexExactForm[] = ['rectangular', 'polar', 'cis'];
const MATH_NOTATION_OPTIONS: MathNotationDisplay[] = ['rendered', 'plainText', 'latex'];
const SYMBOLIC_DISPLAY_OPTIONS: Array<Settings['symbolicDisplayMode']> = ['roots', 'powers', 'auto'];
const NOTATION_OPTIONS: Array<Settings['numericNotationMode']> = ['decimal', 'scientific', 'auto'];
const SCIENTIFIC_STYLE_OPTIONS: Array<Settings['scientificNotationStyle']> = ['times10', 'e'];

function symbolicPreviewLatex(settings: Settings) {
  return normalizeSymbolicDisplayLatex('\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}', settings)
    ?? '\\sqrt[3]{\\sqrt{x}}';
}

function symbolicPreviewSummary(settings: Settings, settingsText: SettingsLanguageCatalog) {
  const summaryText = settingsText.previews.symbolicSummary;

  if (settings.symbolicDisplayMode === 'powers') {
    return summaryText.powers;
  }

  if (settings.symbolicDisplayMode === 'auto') {
    return summaryText.auto;
  }

  if (settings.flattenNestedRootsWhenSafe) {
    return summaryText.flattenedRoots;
  }

  return summaryText.nestedRoots;
}

export function SettingsPanel({
  presentation,
  settings,
  onClose,
  onOpenFullPage,
  onPatch,
  onClearHistory,
  onResetCalculatorMemory,
  showHeader = true,
  visibleSections,
}: SettingsPanelProps) {
  const { strings } = useLanguage();
  const settingsText = strings.settings;
  const languageOptions = listLanguageMetadata();
  const [approxDigitsDraft, setApproxDigitsDraft] = useState<string | null>(null);
  const [autosaveIntervalDraft, setAutosaveIntervalDraft] = useState<string | null>(null);
  const approxDigitsInputValue = approxDigitsDraft ?? `${settings.approxDigits}`;
  const autosaveIntervalInputValue =
    autosaveIntervalDraft ?? `${settings.calculatorMemoryAutosaveIntervalSeconds}`;

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

  function applyAutosaveIntervalDraft(nextDraft: string) {
    setAutosaveIntervalDraft(nextDraft);

    if (!/^\d+$/.test(nextDraft.trim())) {
      return;
    }

    onPatch({
      calculatorMemoryAutosaveIntervalSeconds: Math.max(
        MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS,
        Number(nextDraft),
      ),
    });
  }

  function commitAutosaveIntervalDraft() {
    if (!/^\d+$/.test(autosaveIntervalInputValue.trim())) {
      setAutosaveIntervalDraft(null);
      return;
    }

    setAutosaveIntervalDraft(null);
    onPatch({
      calculatorMemoryAutosaveIntervalSeconds: Math.max(
        MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS,
        Number(autosaveIntervalInputValue),
      ),
    });
  }

  const numericPreviewValue = formatApproxNumber(1234567.891234, settings);
  const shouldShowSection = (sectionId: SettingsPanelSectionId) =>
    !visibleSections || visibleSections.includes(sectionId);

  return (
    <aside
      className={`settings-panel settings-panel--${presentation}`}
      data-testid="settings-panel"
      data-settings-presentation={presentation}
    >
      {showHeader ? (
        <div className="settings-panel-header">
          <div>
            <strong>{settingsText.title}</strong>
            <p>{settingsText.description}</p>
          </div>
          <div className="settings-panel-actions">
            {onOpenFullPage ? (
              <button
                type="button"
                className="settings-panel-open-full"
                data-testid="settings-open-full-page"
                onClick={onOpenFullPage}
              >
                {settingsText.actions.openFullPage}
              </button>
            ) : null}
            <button
              type="button"
              className="settings-panel-close"
              data-testid="settings-close"
              onClick={onClose}
            >
              {strings.common.actions.close}
            </button>
          </div>
        </div>
      ) : null}

      <div className="settings-panel-body">
        {shouldShowSection('display') ? (
        <section className="settings-section" data-testid="settings-section-display">
          <div className="settings-section-title">{settingsText.sections.display}</div>
          <div className="settings-field">
            <span>{settingsText.fields.uiScale}</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`ui-scale-${option}`}
                  type="button"
                  data-testid={`settings-ui-scale-${option}`}
                  className={settings.uiScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ uiScale: option })}
                >
                  {settingsText.options.scalePercent(option)}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.mathSize}</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`math-scale-${option}`}
                  type="button"
                  data-testid={`settings-math-scale-${option}`}
                  className={settings.mathScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ mathScale: option })}
                >
                  {settingsText.options.scalePercent(option)}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.resultSize}</span>
            <div className="settings-chip-row">
              {SCALE_OPTIONS.map((option) => (
                <button
                  key={`result-scale-${option}`}
                  type="button"
                  data-testid={`settings-result-scale-${option}`}
                  className={settings.resultScale === option ? 'is-active' : ''}
                  onClick={() => onPatch({ resultScale: option })}
                >
                  {settingsText.options.scalePercent(option)}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.highContrast}</span>
            <input
              type="checkbox"
              data-testid="settings-high-contrast"
              checked={settings.highContrast}
              onChange={(event) => onPatch({ highContrast: event.currentTarget.checked })}
            />
          </label>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.detailedFacts}</span>
            <input
              type="checkbox"
              data-testid="settings-detailed-facts"
              checked={settings.detailedFactsEnabled}
              onChange={(event) => onPatch({ detailedFactsEnabled: event.currentTarget.checked })}
            />
          </label>
          <p className="settings-help-text">
            {settingsText.help.detailedFacts}
          </p>
        </section>
        ) : null}

        {shouldShowSection('numericOutput') ? (
        <section className="settings-section" data-testid="settings-section-numeric-output">
          <div className="settings-section-title">{settingsText.sections.numericOutput}</div>
          <label className="settings-field">
            <span>{settingsText.fields.approximateDigits}</span>
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
            <span>{settingsText.fields.notation}</span>
            <div className="settings-chip-row">
              {NOTATION_OPTIONS.map((option) => (
                <button
                  key={`notation-${option}`}
                  type="button"
                  data-testid={`settings-notation-mode-${option}`}
                  className={settings.numericNotationMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ numericNotationMode: option })}
                >
                  {settingsText.options.numericNotation[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.scientificFormat}</span>
            <div className="settings-chip-row">
              {SCIENTIFIC_STYLE_OPTIONS.map((option) => (
                <button
                  key={`scientific-style-${option}`}
                  type="button"
                  data-testid={`settings-scientific-style-${option}`}
                  className={settings.scientificNotationStyle === option ? 'is-active' : ''}
                  onClick={() => onPatch({ scientificNotationStyle: option })}
                >
                  {settingsText.options.scientificStyle[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-preview-card">
            <div className="settings-preview-label">{settingsText.previews.preview}</div>
            <p data-testid="settings-numeric-preview-result">{numericPreviewValue}</p>
            <p className="settings-help-text">
              {settingsText.help.numericOutput}
            </p>
          </div>
        </section>
        ) : null}

        {shouldShowSection('symbolicDisplay') ? (
        <section className="settings-section" data-testid="settings-section-symbolic-display">
          <div className="settings-section-title">{settingsText.sections.symbolicDisplay}</div>
          <div className="settings-field">
            <span>{settingsText.fields.powerRootStyle}</span>
            <div className="settings-chip-row">
              {SYMBOLIC_DISPLAY_OPTIONS.map((option) => (
                <button
                  key={`symbolic-${option}`}
                  type="button"
                  data-testid={`settings-symbolic-mode-${option}`}
                  className={settings.symbolicDisplayMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ symbolicDisplayMode: option })}
                >
                  {settingsText.options.symbolicDisplay[option]}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.flattenNestedRootsWhenSafe}</span>
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
            <div className="settings-preview-label">{settingsText.previews.previewInput}</div>
            <MathStatic className="preview-math" latex="\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}" />
            <div className="settings-preview-label">{settingsText.previews.previewOutput}</div>
            <div data-testid="settings-symbolic-preview-result">
              <MathStatic className="result-math" latex={symbolicPreviewLatex(settings)} />
            </div>
            <p data-testid="settings-symbolic-preview-note">
              {symbolicPreviewSummary(settings, settingsText)}
            </p>
          </div>
        </section>
        ) : null}

        {shouldShowSection('complex') ? (
        <section className="settings-section" data-testid="settings-section-complex">
          <div className="settings-section-title">{settingsText.sections.complex}</div>
          <div className="settings-field">
            <span>{settingsText.fields.exactBranchForm}</span>
            <div className="settings-chip-row">
              {COMPLEX_EXACT_FORM_OPTIONS.map((option) => (
                <button
                  key={`complex-exact-form-${option}`}
                  type="button"
                  data-testid={`settings-complex-exact-form-${option}`}
                  className={settings.complexExactForm === option ? 'is-active' : ''}
                  onClick={() => onPatch({ complexExactForm: option })}
                >
                  {settingsText.options.complexExactForm[option]}
                </button>
              ))}
            </div>
          </div>
          <p className="settings-help-text">
            {settingsText.help.complex}
          </p>
        </section>
        ) : null}

        {shouldShowSection('general') ? (
        <section className="settings-section" data-testid="settings-section-general">
          <div className="settings-section-title">{settingsText.sections.general}</div>
          <div className="settings-field">
            <span>{settingsText.fields.language}</span>
            <div className="settings-chip-row">
              {languageOptions.map((language) => (
                <button
                  key={`language-${language.code}`}
                  type="button"
                  data-testid={`settings-language-code-${language.code}`}
                  className={settings.languageCode === language.code ? 'is-active' : ''}
                  onClick={() => onPatch({ languageCode: language.code })}
                >
                  {language.label}
                </button>
              ))}
            </div>
          </div>
          <p className="settings-help-text">
            {settingsText.help.language}
          </p>
          <div className="settings-field">
            <span>{settingsText.fields.angleUnit}</span>
            <div className="settings-chip-row">
              {ANGLE_OPTIONS.map((option) => (
                <button
                  key={`angle-${option}`}
                  type="button"
                  data-testid={`settings-angle-unit-${option}`}
                  className={settings.angleUnit === option ? 'is-active' : ''}
                  onClick={() => onPatch({ angleUnit: option })}
                >
                  {settingsText.options.angleUnit[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.mathNotation}</span>
            <div className="settings-chip-row">
              {MATH_NOTATION_OPTIONS.map((option) => (
                <button
                  key={`math-notation-${option}`}
                  type="button"
                  data-testid={`settings-math-notation-${option}`}
                  className={settings.mathNotationDisplay === option ? 'is-active' : ''}
                  onClick={() => onPatch({ mathNotationDisplay: option })}
                >
                  {settingsText.options.mathNotation[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.outputStyle}</span>
            <div className="settings-chip-row">
              {OUTPUT_OPTIONS.map((option) => (
                <button
                  key={`output-${option}`}
                  type="button"
                  data-testid={`settings-output-style-${option}`}
                  className={settings.outputStyle === option ? 'is-active' : ''}
                  onClick={() => onPatch({ outputStyle: option })}
                >
                  {settingsText.options.outputStyle[option]}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-field">
            <span>{settingsText.fields.equationAnswerMode}</span>
            <div className="settings-chip-row">
              {EQUATION_ANSWER_MODE_OPTIONS.map((option) => (
                <button
                  key={`equation-answer-mode-${option}`}
                  type="button"
                  data-testid={`settings-equation-answer-mode-${option}`}
                  className={settings.equationAnswerMode === option ? 'is-active' : ''}
                  onClick={() => onPatch({ equationAnswerMode: option })}
                >
                  {settingsText.options.equationAnswerMode[option]}
                </button>
              ))}
            </div>
          </div>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.autoSwitchToEquation}</span>
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
        ) : null}

        {shouldShowSection('history') ? (
        <section className="settings-section" data-testid="settings-section-history">
          <div className="settings-section-title">{settingsText.sections.history}</div>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.historyEnabled}</span>
            <input
              type="checkbox"
              data-testid="settings-history-enabled"
              checked={settings.historyEnabled}
              onChange={(event) => onPatch({ historyEnabled: event.currentTarget.checked })}
            />
          </label>
          <p className="settings-help-text">
            {settingsText.help.history}
          </p>
          <button
            type="button"
            className="settings-secondary-action"
            data-testid="settings-reset-history"
            onClick={onClearHistory}
          >
            {settingsText.actions.resetHistory}
          </button>
        </section>
        ) : null}

        {shouldShowSection('calculatorMemory') ? (
        <section className="settings-section" data-testid="settings-section-calculator-memory">
          <div className="settings-section-title">{settingsText.sections.calculatorMemory}</div>
          <label className="settings-toggle-row">
            <span>{settingsText.fields.saveCalculatorMemory}</span>
            <input
              type="checkbox"
              data-testid="settings-calculator-memory-enabled"
              checked={settings.calculatorMemoryEnabled}
              onChange={(event) =>
                onPatch({ calculatorMemoryEnabled: event.currentTarget.checked })
              }
            />
          </label>
          <div className="settings-field">
            <span>{settingsText.fields.autosaveMode}</span>
            <div className="settings-chip-row">
              <button
                type="button"
                data-testid="settings-calculator-memory-mode-settled"
                className={settings.calculatorMemoryAutosaveMode === 'settled' ? 'is-active' : ''}
                onClick={() => onPatch({ calculatorMemoryAutosaveMode: 'settled' })}
              >
                {settingsText.options.calculatorMemoryAutosaveMode.settled}
              </button>
              <button
                type="button"
                data-testid="settings-calculator-memory-mode-interval"
                className={settings.calculatorMemoryAutosaveMode === 'interval' ? 'is-active' : ''}
                onClick={() => onPatch({ calculatorMemoryAutosaveMode: 'interval' })}
              >
                {settingsText.options.calculatorMemoryAutosaveMode.interval}
              </button>
            </div>
          </div>
          <label className="settings-field">
            <span>{settingsText.fields.autosaveInterval}</span>
            <input
              type="number"
              min={MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS}
              step={1}
              inputMode="numeric"
              className="settings-number-input"
              data-testid="settings-calculator-memory-interval-input"
              disabled={settings.calculatorMemoryAutosaveMode !== 'interval'}
              value={autosaveIntervalInputValue}
              onChange={(event) => applyAutosaveIntervalDraft(event.currentTarget.value)}
              onBlur={commitAutosaveIntervalDraft}
            />
          </label>
          <p className="settings-help-text">
            {settingsText.help.calculatorMemory}
          </p>
          <button
            type="button"
            className="settings-secondary-action"
            data-testid="settings-reset-calculator-memory"
            onClick={onResetCalculatorMemory}
          >
            {settingsText.actions.resetCalculatorMemory}
          </button>
        </section>
        ) : null}
      </div>
    </aside>
  );
}
