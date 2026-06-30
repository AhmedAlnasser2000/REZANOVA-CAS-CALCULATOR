import { useState } from 'react';
import { defaultEquationNumericSolvePanelState } from '../logic/appUtils';
import type { DisplayOutcome, EquationScreen, ModeId } from '../../types/calculator';

type EquationNumericSolvePanelState = ReturnType<typeof defaultEquationNumericSolvePanelState>;

export function useEquationNumericSolvePanelState(input: {
  currentMode: ModeId;
  displayOutcome: DisplayOutcome | null;
  equationScreen: EquationScreen;
  inputLatex: string;
}) {
  const [panel, setPanel] = useState(defaultEquationNumericSolvePanelState);
  const canEnablePanel =
    input.currentMode === 'equation'
    && input.equationScreen === 'symbolic';
  const effectivePanel =
    canEnablePanel
      ? panel
      : { ...panel, enabled: false };

  function updatePanel(patch: Partial<EquationNumericSolvePanelState>) {
    setPanel((currentPanel) => ({
      ...currentPanel,
      ...patch,
    }));
  }

  function setPanelEnabled(enabled: boolean) {
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
