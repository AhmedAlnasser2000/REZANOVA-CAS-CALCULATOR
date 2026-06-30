import { useState } from 'react';
import { defaultEquationNumericSolvePanelState } from '../logic/appUtils';
import type { DisplayOutcome, EquationScreen, ModeId } from '../../types/calculator';

type EquationNumericSolvePanelState = ReturnType<typeof defaultEquationNumericSolvePanelState>;

function periodicNumericGuidanceKey(
  outcome: DisplayOutcome | null,
  inputLatex: string,
) {
  if (
    !outcome
    || outcome.kind !== 'error'
    || outcome.numericMethod !== 'Real periodic interval numeric solve'
    || !outcome.solveBadges?.includes('Numeric Interval')
  ) {
    return null;
  }

  return `${inputLatex}|${outcome.error}`;
}

export function useEquationNumericSolvePanelState(input: {
  currentMode: ModeId;
  displayOutcome: DisplayOutcome | null;
  equationScreen: EquationScreen;
  inputLatex: string;
}) {
  const [panel, setPanel] = useState(defaultEquationNumericSolvePanelState);
  const [dismissedPeriodicGuidanceKey, setDismissedPeriodicGuidanceKey] =
    useState<string | null>(null);
  const activePeriodicGuidanceKey =
    input.currentMode === 'equation' && input.equationScreen === 'symbolic'
      ? periodicNumericGuidanceKey(input.displayOutcome, input.inputLatex)
      : null;
  const effectivePanel =
    activePeriodicGuidanceKey !== null && dismissedPeriodicGuidanceKey !== activePeriodicGuidanceKey
      ? { ...panel, enabled: true }
      : panel;

  function updatePanel(patch: Partial<EquationNumericSolvePanelState>) {
    setPanel((currentPanel) => ({
      ...currentPanel,
      ...patch,
    }));
  }

  function setPanelEnabled(enabled: boolean) {
    if (activePeriodicGuidanceKey) {
      setDismissedPeriodicGuidanceKey(enabled ? null : activePeriodicGuidanceKey);
    }
    updatePanel({ enabled });
  }

  return {
    effectivePanel,
    panel,
    setPanel,
    setPanelEnabled,
    updatePanel,
  };
}
