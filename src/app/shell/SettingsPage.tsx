import { useMemo, useState } from 'react';
import {
  SettingsPanel,
  type SettingsPanelSectionId,
} from '../../components/SettingsPanel';
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
  const categories = useMemo(() => [
    {
      id: 'display',
      label: settingsText.sections.display,
      sections: ['display'] satisfies SettingsPanelSectionId[],
      value: `${settings.uiScale}% UI`,
    },
    {
      id: 'math-output',
      label: settingsText.sections.numericOutput,
      sections: ['numericOutput'] satisfies SettingsPanelSectionId[],
      value: `${settings.approxDigits} digits`,
    },
    {
      id: 'symbolic-display',
      label: settingsText.sections.symbolicDisplay,
      sections: ['symbolicDisplay'] satisfies SettingsPanelSectionId[],
      value: settingsText.options.symbolicDisplay[settings.symbolicDisplayMode],
    },
    {
      id: 'equation-complex',
      label: 'Equation / Complex',
      sections: ['general', 'complex'] satisfies SettingsPanelSectionId[],
      value: settings.complexExactForm,
    },
    {
      id: 'memory-data',
      label: 'Memory / Data',
      sections: ['history', 'calculatorMemory'] satisfies SettingsPanelSectionId[],
      value: settings.historyEnabled ? 'History on' : 'History off',
    },
  ], [
    settings.approxDigits,
    settings.complexExactForm,
    settings.historyEnabled,
    settings.symbolicDisplayMode,
    settings.uiScale,
    settingsText,
  ]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0].id);
  const activeCategory = categories.find((category) => category.id === activeCategoryId)
    ?? categories[0];

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
            <button
              key={category.id}
              type="button"
              className={category.id === activeCategory.id ? 'is-active' : ''}
              data-testid={`settings-category-${category.id}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              <span>{category.label}</span>
              <small>{category.value}</small>
            </button>
          ))}
        </nav>
        <div className="settings-page-content">
          <div className="settings-page-content-header" data-testid="settings-active-category">
            <span>{activeCategory.label}</span>
            <strong>{activeCategory.value}</strong>
          </div>
          <SettingsPanel
            presentation="page"
            settings={settings}
            onClose={() => undefined}
            onPatch={onPatch}
            onClearHistory={onClearHistory}
            onResetCalculatorMemory={onResetCalculatorMemory}
            showHeader={false}
            visibleSections={activeCategory.sections}
          />
        </div>
      </div>
    </section>
  );
}
