/* eslint-disable @typescript-eslint/no-explicit-any */
import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import { useLanguage } from '../../lib/language/language-context';

type ModeStripProps = Record<string, any>;

function ModeStrip({
  MODE_LABELS,
  currentMode,
  cycleAngleUnit,
  historyOpen,
  isLauncherOpen,
  labsEnabled,
  ooeDiagnosticsEnabled,
  ooeDiagnosticsOpen,
  openCalculusScreen,
  openGeometryScreen,
  openGuideHome,
  openStatisticsScreen,
  openTrigScreen,
  patchSettings,
  runtimeLabel,
  setGuideRoute,
  setMode,
  settings,
  settingsOpen,
  showModeTabs,
  toggleHistoryPanel,
  toggleOoeDiagnosticsPanel,
  toggleSettingsPanel,
  toggleVariablesPanel,
  variablesOpen,
}: ModeStripProps) {
  const { strings } = useLanguage();
  const modeText = strings.shell.modeStrip;
  const outputStyleLabel = `Display ${String(settings.outputStyle).charAt(0).toUpperCase()}${String(settings.outputStyle).slice(1)}`;

  return (
  <header className="mode-strip">
    {showModeTabs ? (
      <div className="mode-tabs">
        {([
          'calculate',
          'equation',
          'matrix',
          'vector',
          'table',
          'guide',
          'calculus',
          'trigonometry',
          'statistics',
          'geometry',
          ...(labsEnabled ? ['labs'] : []),
        ]).map((mode: string) => (
          <button
            key={mode}
            className={mode === currentMode || (mode === 'calculus' && isCalculusMode(currentMode)) ? 'is-active' : ''}
            onClick={() => {
              if (mode === 'guide') {
                setGuideRoute({ screen: 'home' });
              }
              if (mode === 'calculus') {
                openCalculusScreen('home');
              }
              if (mode === 'trigonometry') {
                openTrigScreen('home');
              }
              if (mode === 'statistics') {
                openStatisticsScreen('home');
              }
              if (mode === 'geometry') {
                openGeometryScreen('home');
              }
              setMode(mode);
            }}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    ) : (
      <div className="mode-strip-spacer" />
    )}
    <div className="mode-strip-utility">
      <button
        className={currentMode === 'guide' ? 'is-active' : ''}
        aria-pressed={currentMode === 'guide'}
        data-testid="guide-toggle"
        title={modeText.guideTitle}
        onClick={openGuideHome}
      >
        {modeText.guide}
      </button>
      <button
        className={settingsOpen ? 'is-active' : ''}
        aria-pressed={settingsOpen}
        data-testid="settings-toggle"
        title={modeText.settingsTitle}
        onClick={toggleSettingsPanel}
      >
        {modeText.settings}
      </button>
      <button
        className={variablesOpen ? 'is-active' : ''}
        aria-pressed={variablesOpen}
        data-testid="variables-toggle"
        title={modeText.variablesTitle}
        onClick={toggleVariablesPanel}
        disabled={isLauncherOpen || currentMode === 'guide'}
      >
        {modeText.variables}
      </button>
      {ooeDiagnosticsEnabled ? (
        <button
          className={ooeDiagnosticsOpen ? 'is-active' : ''}
          aria-pressed={ooeDiagnosticsOpen}
          data-testid="ooe-diagnostics-toggle"
          title={modeText.ooeDiagnosticsTitle}
          onClick={toggleOoeDiagnosticsPanel}
        >
          {modeText.ooeDiagnostics}
        </button>
      ) : null}
    </div>
    <div className="status-pills">
      <button
        data-testid="quick-setting-angle-unit"
        onClick={() => patchSettings({ angleUnit: cycleAngleUnit(settings.angleUnit) })}
      >
        {settings.angleUnit.toUpperCase()}
      </button>
      <button
        aria-label={`Output style: ${outputStyleLabel}`}
        data-testid="quick-setting-output-style"
        title={`Output style: ${outputStyleLabel}`}
        onClick={() =>
          patchSettings({
            outputStyle:
              settings.outputStyle === 'both'
                ? 'exact'
                : settings.outputStyle === 'exact'
                  ? 'decimal'
                  : 'both',
          })
        }
      >
        {outputStyleLabel}
      </button>
      <button
        className={settings.autoSwitchToEquation ? 'is-active' : ''}
        aria-pressed={settings.autoSwitchToEquation}
        data-testid="quick-setting-auto-equation"
        onClick={() =>
          patchSettings({
            autoSwitchToEquation: !settings.autoSwitchToEquation,
          })
        }
      >
        {settings.autoSwitchToEquation ? modeText.autoEquationOn : modeText.autoEquationOff}
      </button>
      <button
        className={settings.equationDomainIntent === 'complex' ? 'is-active' : ''}
        aria-pressed={settings.equationDomainIntent === 'complex'}
        data-testid="quick-setting-equation-domain-intent"
        onClick={() =>
          patchSettings({
            equationDomainIntent: settings.equationDomainIntent === 'complex' ? 'real' : 'complex',
          })
        }
      >
        {settings.equationDomainIntent === 'complex' ? modeText.complexOn : modeText.complexOff}
      </button>
      <button
        data-testid="history-toggle"
        onClick={toggleHistoryPanel}
        disabled={isLauncherOpen || currentMode === 'guide'}
      >
        {historyOpen ? modeText.hideHistory : modeText.showHistory}
      </button>
      <span>{runtimeLabel}</span>
    </div>
  </header>


  );
}

export { ModeStrip };
