/* eslint-disable @typescript-eslint/no-explicit-any */

type ModeStripProps = Record<string, any>;

function ModeStrip({
  MODE_LABELS,
  currentMode,
  cycleAngleUnit,
  historyOpen,
  isLauncherOpen,
  labsEnabled,
  openAdvancedCalcScreen,
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
  toggleSettingsPanel,
  toggleVariablesPanel,
  variablesOpen,
}: ModeStripProps) {
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
          'advancedCalculus',
          'trigonometry',
          'statistics',
          'geometry',
          ...(labsEnabled ? ['labs'] : []),
        ]).map((mode: string) => (
          <button
            key={mode}
            className={mode === currentMode ? 'is-active' : ''}
            onClick={() => {
              if (mode === 'guide') {
                setGuideRoute({ screen: 'home' });
              }
              if (mode === 'advancedCalculus') {
                openAdvancedCalcScreen('home');
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
        title="Guide (Ctrl+G)"
        onClick={openGuideHome}
      >
        Guide
      </button>
      <button
        className={settingsOpen ? 'is-active' : ''}
        aria-pressed={settingsOpen}
        data-testid="settings-toggle"
        title="Settings (Ctrl+,)"
        onClick={toggleSettingsPanel}
      >
        Settings
      </button>
      <button
        className={variablesOpen ? 'is-active' : ''}
        aria-pressed={variablesOpen}
        data-testid="variables-toggle"
        title="Variables"
        onClick={toggleVariablesPanel}
        disabled={isLauncherOpen || currentMode === 'guide'}
      >
        Vars
      </button>
    </div>
    <div className="status-pills">
      <button
        data-testid="quick-setting-angle-unit"
        onClick={() => patchSettings({ angleUnit: cycleAngleUnit(settings.angleUnit) })}
      >
        {settings.angleUnit.toUpperCase()}
      </button>
      <button
        data-testid="quick-setting-output-style"
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
        {settings.outputStyle.toUpperCase()}
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
        {settings.autoSwitchToEquation ? 'Auto Eq On' : 'Auto Eq Off'}
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
        {settings.equationDomainIntent === 'complex' ? 'Complex On' : 'Complex Off'}
      </button>
      <button
        data-testid="history-toggle"
        onClick={toggleHistoryPanel}
        disabled={isLauncherOpen || currentMode === 'guide'}
      >
        {historyOpen ? 'Hide Hist' : 'Show Hist'}
      </button>
      <span>{runtimeLabel}</span>
    </div>
  </header>


  );
}

export { ModeStrip };
