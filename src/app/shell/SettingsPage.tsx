import { SettingsPanel } from '../../components/SettingsPanel';
import { useLanguage } from '../../lib/language/language-context';
import type { Settings, SettingsPatch } from '../../types/calculator';

type SettingsPageProps = {
  settings: Settings;
  onPatch: (patch: SettingsPatch) => void;
  onClearHistory: () => void;
  onResetCalculatorMemory: () => void;
};

export function SettingsPage({
  settings,
  onPatch,
  onClearHistory,
  onResetCalculatorMemory,
}: SettingsPageProps) {
  const { strings } = useLanguage();
  const settingsText = strings.settings;
  const categories = [
    settingsText.sections.display,
    settingsText.sections.numericOutput,
    settingsText.sections.symbolicDisplay,
    settingsText.sections.complex,
    settingsText.sections.general,
    settingsText.sections.history,
    settingsText.sections.calculatorMemory,
  ];

  return (
    <section className="app-page app-page--settings" data-testid="settings-page">
      <header className="app-page-header">
        <div>
          <span className="app-page-kicker">App Page</span>
          <h1>{settingsText.title}</h1>
          <p>{settingsText.description}</p>
        </div>
        <div className="settings-page-status" data-testid="settings-page-status">
          <span>{settingsText.fields.angleUnit}: {settings.angleUnit.toUpperCase()}</span>
          <span>{settingsText.fields.outputStyle}: {settings.outputStyle.toUpperCase()}</span>
          <span>{settingsText.fields.mathNotation}: {settingsText.options.mathNotation[settings.mathNotationDisplay]}</span>
        </div>
      </header>

      <div className="settings-page-grid">
        <nav className="settings-page-rail" aria-label="Settings categories">
          {categories.map((category) => (
            <span key={category}>{category}</span>
          ))}
        </nav>
        <SettingsPanel
          presentation="page"
          settings={settings}
          onClose={() => undefined}
          onPatch={onPatch}
          onClearHistory={onClearHistory}
          onResetCalculatorMemory={onResetCalculatorMemory}
          showHeader={false}
        />
      </div>
    </section>
  );
}
