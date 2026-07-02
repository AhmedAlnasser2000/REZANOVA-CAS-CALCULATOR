import {
  CheckCircle2,
  CircleGauge,
  Database,
  Eye,
  Globe2,
  History,
  Info,
  Languages,
  Monitor,
  Pi,
  Shield,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { MathStatic } from '../../components/MathStatic';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { clampApproxDigits, formatApproxNumber } from '../../lib/display/numeric-output';
import { normalizeSymbolicDisplayLatex } from '../../lib/display/symbolic-display';
import { listLanguageMetadata } from '../../lib/language';
import { useLanguage } from '../../lib/language/language-context';
import type {
  AngleUnit,
  ComplexExactForm,
  EquationAnswerMode,
  MathNotationDisplay,
  OutputStyle,
  Settings,
  SettingsPatch,
} from '../../types/calculator';

type SettingsPageProps = {
  settings: Settings;
  onPatch: (patch: SettingsPatch) => void;
  onClearHistory: () => void;
  onResetCalculatorMemory: () => void;
};

type SettingsCategoryId =
  | 'general'
  | 'display'
  | 'math'
  | 'runtime'
  | 'privacy'
  | 'language';

type HistoryNotationField = 'historyInspectorNotationMode' | 'historyPageNotationMode';

type SettingsCategory = {
  description: string;
  id: SettingsCategoryId;
  icon: LucideIcon;
  label: string;
  value: string;
};

const ANGLE_OPTIONS: AngleUnit[] = ['deg', 'rad', 'grad'];
const OUTPUT_OPTIONS: OutputStyle[] = ['exact', 'decimal', 'both'];
const EQUATION_ANSWER_MODE_OPTIONS: EquationAnswerMode[] = ['exact', 'isolate'];
const COMPLEX_EXACT_FORM_OPTIONS: ComplexExactForm[] = ['rectangular', 'polar', 'cis'];
const MATH_NOTATION_OPTIONS: MathNotationDisplay[] = ['rendered', 'plainText', 'latex'];
const SYMBOLIC_DISPLAY_OPTIONS: Array<Settings['symbolicDisplayMode']> = ['roots', 'powers', 'auto'];
const NOTATION_OPTIONS: Array<Settings['numericNotationMode']> = ['decimal', 'scientific', 'auto'];
const SCIENTIFIC_STYLE_OPTIONS: Array<Settings['scientificNotationStyle']> = ['times10', 'e'];
const MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS = 20;

function formatScale(value: number) {
  return `${value}%`;
}

function symbolicPreviewLatex(settings: Settings) {
  return normalizeSymbolicDisplayLatex('\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}', settings)
    ?? '\\sqrt[3]{\\sqrt{x}}';
}

function SettingsSection({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="settings-page-card">
      <div className="settings-page-card-heading">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <div className="settings-page-card-body">{children}</div>
    </section>
  );
}

function SettingsRow({
  children,
  hint,
  icon: Icon,
  label,
}: {
  children: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  label: string;
}) {
  return (
    <div className="settings-page-row">
      <div className="settings-page-row-label">
        {Icon ? <Icon aria-hidden="true" size={17} /> : <Info aria-hidden="true" size={15} />}
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="settings-page-row-control">{children}</div>
    </div>
  );
}

function SegmentedControl<T extends string>({
  getLabel,
  onChange,
  options,
  value,
}: {
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
  options: readonly T[];
  value: T;
}) {
  return (
    <div className="settings-page-segmented">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={option === value ? 'is-active' : ''}
          onClick={() => onChange(option)}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}

function historyNotationPatch(field: HistoryNotationField, value: MathNotationDisplay): SettingsPatch {
  return field === 'historyInspectorNotationMode'
    ? { historyInspectorNotationMode: value }
    : { historyPageNotationMode: value };
}

function HistoryNotationControl({
  label,
  onChange,
  value,
  warning,
}: {
  label: string;
  onChange: (option: MathNotationDisplay) => void;
  value: MathNotationDisplay;
  warning: string;
}) {
  return (
    <div className="settings-page-history-notation" data-testid={`${label}-control`}>
      <SegmentedControl
        value={value}
        options={MATH_NOTATION_OPTIONS}
        getLabel={(option) => option === 'rendered' ? 'Rendered Math' : option === 'plainText' ? 'Plain Text' : 'LaTeX'}
        onChange={onChange}
      />
      {value === 'rendered' ? (
        <p className="settings-page-warning" data-testid={`${label}-warning`}>
          {warning}
        </p>
      ) : null}
    </div>
  );
}

function ScaleControl({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: Settings['uiScale']) => void;
  value: Settings['uiScale'];
}) {
  return (
    <div className="settings-page-scale-control">
      <input
        aria-label={label}
        type="range"
        min={100}
        max={145}
        step={15}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value) as Settings['uiScale'])}
      />
      <strong>{formatScale(value)}</strong>
    </div>
  );
}

function ToggleControl({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingsSwitch
      checked={checked}
      className="settings-page-toggle"
      label={label}
      onChange={onChange}
    />
  );
}

function NumberStepper({
  max,
  min,
  onChange,
  value,
}: {
  max?: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}) {
  const decrement = Math.max(min, value - 1);
  const increment = typeof max === 'number' ? Math.min(max, value + 1) : value + 1;
  return (
    <div className="settings-page-stepper">
      <button type="button" onClick={() => onChange(decrement)}>-</button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <button type="button" onClick={() => onChange(increment)}>+</button>
    </div>
  );
}

function StatusPill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'accent' | 'neutral' | 'success';
}) {
  return <span className={`settings-page-pill settings-page-pill--${tone}`}>{children}</span>;
}

export function SettingsPage({
  settings,
  onPatch,
  onClearHistory,
  onResetCalculatorMemory,
}: SettingsPageProps) {
  const { strings } = useLanguage();
  const settingsText = strings.settings;
  const languageOptions = listLanguageMetadata();
  const [activeCategoryId, setActiveCategoryId] = useState<SettingsCategoryId>('general');
  const [pendingRenderedHistoryField, setPendingRenderedHistoryField] =
    useState<HistoryNotationField | null>(null);

  const categories: SettingsCategory[] = [
    {
      description: 'Core behavior',
      icon: SlidersHorizontal,
      id: 'general',
      label: 'General',
      value: settings.autoSwitchToEquation ? 'Auto Equation' : settings.outputStyle.toUpperCase(),
    },
    {
      description: 'Scale and notation',
      icon: Monitor,
      id: 'display',
      label: 'Display',
      value: `${formatScale(settings.uiScale)} UI`,
    },
    {
      description: 'CAS defaults',
      icon: Pi,
      id: 'math',
      label: 'Math',
      value: `${settings.angleUnit.toUpperCase()} / ${settings.outputStyle.toUpperCase()}`,
    },
    {
      description: 'Engine and memory',
      icon: CircleGauge,
      id: 'runtime',
      label: 'Runtime',
      value: settings.calculatorMemoryEnabled ? 'Memory on' : 'Memory off',
    },
    {
      description: 'Local data controls',
      icon: Shield,
      id: 'privacy',
      label: 'Privacy',
      value: settings.historyEnabled ? 'History on' : 'History off',
    },
    {
      description: 'English foundation',
      icon: Languages,
      id: 'language',
      label: 'Language',
      value: 'English',
    },
  ];
  const activeCategory = categories.find((category) => category.id === activeCategoryId)
    ?? categories[0];

  const numericPreviewValue = formatApproxNumber(1234567.891234, settings);
  const approxDigits = clampApproxDigits(settings.approxDigits);
  const autosaveSeconds = Math.max(
    MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS,
    settings.calculatorMemoryAutosaveIntervalSeconds,
  );

  function requestHistoryNotationChange(field: HistoryNotationField, value: MathNotationDisplay) {
    if (value === 'rendered' && settings[field] !== 'rendered') {
      setPendingRenderedHistoryField(field);
      return;
    }

    onPatch(historyNotationPatch(field, value));
  }

  function confirmRenderedHistoryMath() {
    if (!pendingRenderedHistoryField) {
      return;
    }

    onPatch(historyNotationPatch(pendingRenderedHistoryField, 'rendered'));
    setPendingRenderedHistoryField(null);
  }

  function renderGeneral() {
    return (
      <>
        <SettingsSection title="Interface Behavior" eyebrow="General">
          <SettingsRow
            icon={Sparkles}
            label={settingsText.fields.outputStyle}
            hint="Controls the preferred result card emphasis."
          >
            <SegmentedControl
              value={settings.outputStyle}
              options={OUTPUT_OPTIONS}
              getLabel={(option) => settingsText.options.outputStyle[option]}
              onChange={(option) => onPatch({ outputStyle: option })}
            />
          </SettingsRow>
          <SettingsRow
            icon={History}
            label={settingsText.fields.historyEnabled}
            hint="Keeps the quick history button and full History page populated."
          >
            <ToggleControl
              label={settingsText.fields.historyEnabled}
              checked={settings.historyEnabled}
              onChange={(checked) => onPatch({ historyEnabled: checked })}
            />
          </SettingsRow>
          <SettingsRow
            icon={CheckCircle2}
            label={settingsText.fields.autoSwitchToEquation}
            hint="Route equation-looking input to Equation when appropriate."
          >
            <ToggleControl
              label={settingsText.fields.autoSwitchToEquation}
              checked={settings.autoSwitchToEquation}
              onChange={(checked) => onPatch({ autoSwitchToEquation: checked })}
            />
          </SettingsRow>
          <SettingsRow
            icon={Eye}
            label={settingsText.fields.detailedFacts}
            hint={settingsText.help.detailedFacts}
          >
            <ToggleControl
              label={settingsText.fields.detailedFacts}
              checked={settings.detailedFactsEnabled}
              onChange={(checked) => onPatch({ detailedFactsEnabled: checked })}
            />
          </SettingsRow>
        </SettingsSection>
        <SettingsSection title="Runtime Status">
          <div className="settings-page-status-row">
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>All engines operational</span>
            <small>Desktop preview</small>
          </div>
        </SettingsSection>
      </>
    );
  }

  function renderDisplay() {
    return (
      <SettingsSection title="Appearance" eyebrow="Display">
        <SettingsRow icon={Monitor} label={settingsText.fields.uiScale}>
          <ScaleControl
            label={settingsText.fields.uiScale}
            value={settings.uiScale}
            onChange={(value) => onPatch({ uiScale: value })}
          />
        </SettingsRow>
        <SettingsRow icon={Pi} label={settingsText.fields.mathSize}>
          <ScaleControl
            label={settingsText.fields.mathSize}
            value={settings.mathScale}
            onChange={(value) => onPatch({ mathScale: value })}
          />
        </SettingsRow>
        <SettingsRow icon={Eye} label={settingsText.fields.resultSize}>
          <ScaleControl
            label={settingsText.fields.resultSize}
            value={settings.resultScale}
            onChange={(value) => onPatch({ resultScale: value })}
          />
        </SettingsRow>
        <SettingsRow icon={Shield} label={settingsText.fields.highContrast}>
          <ToggleControl
            label={settingsText.fields.highContrast}
            checked={settings.highContrast}
            onChange={(checked) => onPatch({ highContrast: checked })}
          />
        </SettingsRow>
        <SettingsRow icon={Eye} label={settingsText.fields.mathNotation}>
          <SegmentedControl
            value={settings.mathNotationDisplay}
            options={MATH_NOTATION_OPTIONS}
            getLabel={(option) => settingsText.options.mathNotation[option]}
            onChange={(option) => onPatch({ mathNotationDisplay: option })}
          />
        </SettingsRow>
      </SettingsSection>
    );
  }

  function renderMath() {
    return (
      <>
        <SettingsSection title="Mathematics" eyebrow="Math">
          <SettingsRow icon={Pi} label={settingsText.fields.angleUnit}>
            <SegmentedControl
              value={settings.angleUnit}
              options={ANGLE_OPTIONS}
              getLabel={(option) => settingsText.options.angleUnit[option]}
              onChange={(option) => onPatch({ angleUnit: option })}
            />
          </SettingsRow>
          <SettingsRow icon={Sparkles} label={settingsText.fields.equationAnswerMode}>
            <SegmentedControl
              value={settings.equationAnswerMode}
              options={EQUATION_ANSWER_MODE_OPTIONS}
              getLabel={(option) => settingsText.options.equationAnswerMode[option]}
              onChange={(option) => onPatch({ equationAnswerMode: option })}
            />
          </SettingsRow>
          <SettingsRow icon={CircleGauge} label={settingsText.fields.approximateDigits}>
            <NumberStepper
              min={0}
              max={20}
              value={approxDigits}
              onChange={(value) => onPatch({ approxDigits: clampApproxDigits(value) })}
            />
          </SettingsRow>
          <SettingsRow icon={CircleGauge} label={settingsText.fields.notation}>
            <SegmentedControl
              value={settings.numericNotationMode}
              options={NOTATION_OPTIONS}
              getLabel={(option) => settingsText.options.numericNotation[option]}
              onChange={(option) => onPatch({ numericNotationMode: option })}
            />
          </SettingsRow>
          <SettingsRow icon={CircleGauge} label={settingsText.fields.scientificFormat}>
            <SegmentedControl
              value={settings.scientificNotationStyle}
              options={SCIENTIFIC_STYLE_OPTIONS}
              getLabel={(option) => settingsText.options.scientificStyle[option]}
              onChange={(option) => onPatch({ scientificNotationStyle: option })}
            />
          </SettingsRow>
        </SettingsSection>
        <SettingsSection title="Symbolic Display">
          <SettingsRow icon={Pi} label={settingsText.fields.powerRootStyle}>
            <SegmentedControl
              value={settings.symbolicDisplayMode}
              options={SYMBOLIC_DISPLAY_OPTIONS}
              getLabel={(option) => settingsText.options.symbolicDisplay[option]}
              onChange={(option) => onPatch({ symbolicDisplayMode: option })}
            />
          </SettingsRow>
          <SettingsRow icon={CheckCircle2} label={settingsText.fields.flattenNestedRootsWhenSafe}>
            <ToggleControl
              label={settingsText.fields.flattenNestedRootsWhenSafe}
              checked={settings.flattenNestedRootsWhenSafe}
              onChange={(checked) => onPatch({ flattenNestedRootsWhenSafe: checked })}
            />
          </SettingsRow>
          <div className="settings-page-preview-strip" data-testid="settings-symbolic-preview-result">
            <span>{settingsText.previews.previewOutput}</span>
            <MathStatic latex={symbolicPreviewLatex(settings)} />
          </div>
        </SettingsSection>
        <SettingsSection title="Equation / Complex">
          <SettingsRow icon={Sparkles} label={settingsText.fields.exactBranchForm}>
            <SegmentedControl
              value={settings.complexExactForm}
              options={COMPLEX_EXACT_FORM_OPTIONS}
              getLabel={(option) => settingsText.options.complexExactForm[option]}
              onChange={(option) => onPatch({ complexExactForm: option })}
            />
          </SettingsRow>
        </SettingsSection>
      </>
    );
  }

  function renderRuntime() {
    return (
      <>
        <SettingsSection title="Calculator Memory" eyebrow="Runtime">
          <SettingsRow icon={Database} label={settingsText.fields.saveCalculatorMemory}>
            <ToggleControl
              label={settingsText.fields.saveCalculatorMemory}
              checked={settings.calculatorMemoryEnabled}
              onChange={(checked) => onPatch({ calculatorMemoryEnabled: checked })}
            />
          </SettingsRow>
          <SettingsRow icon={Database} label={settingsText.fields.autosaveMode}>
            <SegmentedControl
              value={settings.calculatorMemoryAutosaveMode}
              options={['settled', 'interval']}
              getLabel={(option) => settingsText.options.calculatorMemoryAutosaveMode[option]}
              onChange={(option) => onPatch({ calculatorMemoryAutosaveMode: option })}
            />
          </SettingsRow>
          <SettingsRow icon={CircleGauge} label={settingsText.fields.autosaveInterval}>
            <NumberStepper
              min={MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS}
              value={autosaveSeconds}
              onChange={(value) => onPatch({
                calculatorMemoryAutosaveIntervalSeconds: Math.max(
                  MIN_CALCULATOR_MEMORY_AUTOSAVE_SECONDS,
                  value,
                ),
              })}
            />
          </SettingsRow>
          <button
            type="button"
            className="settings-page-secondary-action"
            onClick={onResetCalculatorMemory}
          >
            {settingsText.actions.resetCalculatorMemory}
          </button>
        </SettingsSection>
        <SettingsSection title="Runtime Status">
          <div className="settings-page-status-row">
            <CheckCircle2 aria-hidden="true" size={18} />
            <span>All engines operational</span>
            <small>Last checked in this session</small>
          </div>
        </SettingsSection>
      </>
    );
  }

  function renderPrivacy() {
    return (
      <>
        <SettingsSection title="History Records" eyebrow="Privacy">
          <SettingsRow icon={History} label={settingsText.fields.historyEnabled}>
            <ToggleControl
              label={settingsText.fields.historyEnabled}
              checked={settings.historyEnabled}
              onChange={(checked) => onPatch({ historyEnabled: checked })}
            />
          </SettingsRow>
          <SettingsRow
            icon={History}
            label={settingsText.fields.historyInspectorNotation}
            hint="Controls quick History inspector row previews."
          >
            <HistoryNotationControl
              label="history-inspector-notation"
              value={settings.historyInspectorNotationMode}
              warning={settingsText.help.renderedHistoryMathWarning}
              onChange={(value) =>
                requestHistoryNotationChange('historyInspectorNotationMode', value)}
            />
          </SettingsRow>
          <SettingsRow
            icon={History}
            label={settingsText.fields.historyPageNotation}
            hint="Controls full History page ledger row previews."
          >
            <HistoryNotationControl
              label="history-page-notation"
              value={settings.historyPageNotationMode}
              warning={settingsText.help.renderedHistoryMathWarning}
              onChange={(value) =>
                requestHistoryNotationChange('historyPageNotationMode', value)}
            />
          </SettingsRow>
        </SettingsSection>
        <SettingsSection title="Local Data" eyebrow="Privacy">
          <SettingsRow icon={Database} label={settingsText.fields.saveCalculatorMemory}>
            <ToggleControl
              label={settingsText.fields.saveCalculatorMemory}
              checked={settings.calculatorMemoryEnabled}
              onChange={(checked) => onPatch({ calculatorMemoryEnabled: checked })}
            />
          </SettingsRow>
          <p className="settings-page-note">
            History and calculator memory are stored locally for this preview build.
          </p>
          <div className="settings-page-danger-row">
            <button type="button" onClick={onClearHistory}>
              {settingsText.actions.resetHistory}
            </button>
            <button type="button" onClick={onResetCalculatorMemory}>
              {settingsText.actions.resetCalculatorMemory}
            </button>
          </div>
        </SettingsSection>
      </>
    );
  }

  function renderLanguage() {
    return (
      <SettingsSection title="Language" eyebrow="Language">
        <SettingsRow icon={Globe2} label={settingsText.fields.language}>
          <SegmentedControl
            value={settings.languageCode}
            options={languageOptions.map((language) => language.code)}
            getLabel={(option) =>
              languageOptions.find((language) => language.code === option)?.label ?? option}
            onChange={(option) => onPatch({ languageCode: option })}
          />
        </SettingsRow>
        <p className="settings-page-note">
          {settingsText.help.language} Arabic/right-to-left localization remains a later milestone.
        </p>
      </SettingsSection>
    );
  }

  function renderActiveContent() {
    switch (activeCategory.id) {
      case 'display':
        return renderDisplay();
      case 'math':
        return renderMath();
      case 'runtime':
        return renderRuntime();
      case 'privacy':
        return renderPrivacy();
      case 'language':
        return renderLanguage();
      case 'general':
      default:
        return renderGeneral();
    }
  }

  return (
    <section className="app-page app-page--settings" data-testid="settings-page">
      <div className="app-page-shell-header">
        <span>REZANOVA CLASSWIZ CALCULATOR</span>
      </div>
      <div className="settings-page-workbench">
        <aside className="settings-page-nav" aria-label="Settings categories">
          <div className="settings-page-nav-title">
            <h1>{settingsText.title}</h1>
            <p>{settingsText.description}</p>
          </div>
          <div className="settings-page-nav-items">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={category.id === activeCategory.id ? 'is-active' : ''}
                  data-testid={`settings-category-${category.id}`}
                  onClick={() => setActiveCategoryId(category.id)}
                >
                  <Icon aria-hidden="true" size={22} />
                  <span>{category.label}</span>
                  <small>{category.value}</small>
                </button>
              );
            })}
          </div>
          <div className="settings-page-brand">
            <Sparkles aria-hidden="true" size={22} />
            <div>
              <strong>REZANOVA</strong>
              <span>CLASSWIZ CALCULATOR</span>
            </div>
          </div>
        </aside>

        <main className="settings-page-main" data-testid="settings-active-category">
          <header className="settings-page-main-header">
            <div>
              <span>{activeCategory.description}</span>
              <h2>{activeCategory.label}</h2>
            </div>
            <StatusPill tone="accent">{activeCategory.value}</StatusPill>
          </header>
          <div className="settings-page-panels">
            {renderActiveContent()}
          </div>
        </main>

        <aside className="settings-page-preview" data-testid="settings-live-preview">
          <section className="settings-page-preview-card">
            <h2>Live Preview</h2>
            <p>Result card preview</p>
            <div className="settings-page-result-preview">
              <span>Solve for x</span>
              <MathStatic latex="x^2-5x+6=0" />
              <small>Solutions</small>
              <MathStatic latex="x=2,\quad x=3" />
              <div>
                <StatusPill tone="success">Exact</StatusPill>
                <StatusPill>{settings.angleUnit.toUpperCase()}</StatusPill>
                <span>2 roots</span>
              </div>
            </div>
          </section>
          <section className="settings-page-impact-card">
            <h3>Setting impact</h3>
            <div data-testid="settings-impact-angle">
              <Pi aria-hidden="true" size={18} />
              <span>Angle unit: <strong>{settings.angleUnit.toUpperCase()}</strong></span>
              <small>All angle inputs and outputs use this unit.</small>
            </div>
            <div data-testid="settings-impact-output">
              <Sparkles aria-hidden="true" size={18} />
              <span>Output style: <strong>{settings.outputStyle.toUpperCase()}</strong></span>
              <small>Result cards follow this exact/decimal preference.</small>
            </div>
            <div data-testid="settings-impact-digits">
              <CircleGauge aria-hidden="true" size={18} />
              <span>Approx digits: <strong>{approxDigits}</strong></span>
              <small>Preview: {numericPreviewValue}</small>
            </div>
            <div>
              <History aria-hidden="true" size={18} />
              <span>History: <strong>{settings.historyEnabled ? 'On' : 'Off'}</strong></span>
              <small>History remains a local app surface.</small>
            </div>
          </section>
          <section className="settings-page-help-card">
            <strong>Need help?</strong>
            <p>See the user guide for details on each setting.</p>
          </section>
        </aside>
      </div>
      {pendingRenderedHistoryField ? (
        <div className="settings-page-confirm-layer">
          <section
            className="settings-page-confirm"
            role="alertdialog"
            aria-label={settingsText.confirmations.renderedHistoryMathTitle}
          >
            <strong>{settingsText.confirmations.renderedHistoryMathTitle}</strong>
            <p>{settingsText.help.renderedHistoryMathConfirmation}</p>
            <div>
              <button type="button" onClick={confirmRenderedHistoryMath}>
                {settingsText.actions.useRenderedMath}
              </button>
              <button
                type="button"
                onClick={() => setPendingRenderedHistoryField(null)}
              >
                {strings.common.actions.cancel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      <footer className="app-page-shell-footer">
        <span><CheckCircle2 aria-hidden="true" size={14} /> Ready</span>
        <span>Workspace: Settings</span>
        <span>Mode: N/A (Page Surface)</span>
      </footer>
    </section>
  );
}
