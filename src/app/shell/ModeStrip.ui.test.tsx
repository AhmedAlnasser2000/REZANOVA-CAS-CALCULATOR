import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MODE_LABELS } from '../../lib/navigation/menu';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import { ModeStrip } from './ModeStrip';

function renderModeStrip() {
  const handlers = {
    openGuideHome: vi.fn(),
    toggleSettingsPanel: vi.fn(),
    toggleVariablesPanel: vi.fn(),
    toggleOoeDiagnosticsPanel: vi.fn(),
    toggleHistoryPanel: vi.fn(),
    patchSettings: vi.fn(),
  };

  render(
    <ModeStrip
      MODE_LABELS={MODE_LABELS}
      currentMode="calculate"
      cycleAngleUnit={() => 'deg'}
      historyOpen={false}
      isLauncherOpen={false}
      labsEnabled={false}
      ooeDiagnosticsEnabled
      ooeDiagnosticsOpen={false}
      openCalculusScreen={vi.fn()}
      openGeometryScreen={vi.fn()}
      openGuideHome={handlers.openGuideHome}
      openStatisticsScreen={vi.fn()}
      openTrigScreen={vi.fn()}
      patchSettings={handlers.patchSettings}
      runtimeLabel="Desktop runtime"
      setGuideRoute={vi.fn()}
      setMode={vi.fn()}
      settings={{
        ...DEFAULT_SETTINGS,
        autoSwitchToEquation: true,
        equationDomainIntent: 'complex',
        outputStyle: 'exact',
      }}
      settingsOpen={false}
      showModeTabs={false}
      toggleHistoryPanel={handlers.toggleHistoryPanel}
      toggleOoeDiagnosticsPanel={handlers.toggleOoeDiagnosticsPanel}
      toggleSettingsPanel={handlers.toggleSettingsPanel}
      toggleVariablesPanel={handlers.toggleVariablesPanel}
      variablesOpen={false}
    />,
  );

  return handlers;
}

describe('ModeStrip', () => {
  it('renders language-backed utility labels and keeps callbacks wired', () => {
    const handlers = renderModeStrip();

    expect(screen.getByTestId('guide-toggle')).toHaveTextContent('Guide');
    expect(screen.getByTestId('guide-toggle')).toHaveAttribute('title', 'Guide (Ctrl+G)');
    expect(screen.getByTestId('settings-toggle')).toHaveTextContent('Settings');
    expect(screen.getByTestId('variables-toggle')).toHaveTextContent('Vars');
    expect(screen.getByTestId('ooe-diagnostics-toggle')).toHaveAttribute('title', 'OOE diagnostics');
    expect(screen.getByTestId('quick-setting-auto-equation')).toHaveTextContent('Auto Eq On');
    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex On');
    expect(screen.getByTestId('history-toggle')).toHaveTextContent('Show Hist');

    fireEvent.click(screen.getByTestId('guide-toggle'));
    fireEvent.click(screen.getByTestId('settings-toggle'));
    fireEvent.click(screen.getByTestId('variables-toggle'));
    fireEvent.click(screen.getByTestId('ooe-diagnostics-toggle'));
    fireEvent.click(screen.getByTestId('history-toggle'));

    expect(handlers.openGuideHome).toHaveBeenCalledTimes(1);
    expect(handlers.toggleSettingsPanel).toHaveBeenCalledTimes(1);
    expect(handlers.toggleVariablesPanel).toHaveBeenCalledTimes(1);
    expect(handlers.toggleOoeDiagnosticsPanel).toHaveBeenCalledTimes(1);
    expect(handlers.toggleHistoryPanel).toHaveBeenCalledTimes(1);
  });
});
