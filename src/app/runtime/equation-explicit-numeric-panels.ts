import { useState } from 'react';
import { defaultEquationComplexRegionPanelState } from '../logic/appUtils';
import type {
  DisplayOutcome,
  EquationScreen,
  ModeId,
  PeriodicIntervalSuggestion,
} from '../../types/calculator';

type ComplexRegionPanelState = ReturnType<typeof defaultEquationComplexRegionPanelState>;

export function useEquationComplexRegionPanelState(input: {
  currentMode: ModeId;
  equationDomainIntent?: 'real' | 'complex';
  equationScreen: EquationScreen;
  disableNumericPanel: () => void;
}) {
  const [panel, setPanel] = useState(defaultEquationComplexRegionPanelState);
  const canEnable =
    input.currentMode === 'equation'
    && input.equationScreen === 'symbolic'
    && input.equationDomainIntent === 'complex';
  const effectivePanel = canEnable ? panel : { ...panel, enabled: false };

  function updatePanel(patch: Partial<ComplexRegionPanelState>) {
    setPanel((currentPanel) => ({
      ...currentPanel,
      ...patch,
    }));
  }

  function setPanelEnabled(enabled: boolean) {
    updatePanel({ enabled });
    if (enabled) {
      input.disableNumericPanel();
    }
  }

  return {
    effectivePanel,
    panel,
    setPanel,
    setPanelEnabled,
    updatePanel,
  };
}

export function buildEquationExplicitNumericPanelWorkspaceProps(input: {
  controller: {
    shouldAllowEquationNumericSolve: () => boolean;
    shouldShowEquationNumericSolvePanel: () => boolean;
    shouldAllowEquationComplexRegionSolve: () => boolean;
    shouldShowEquationComplexRegionPanel: () => boolean;
  };
  displayOutcome: DisplayOutcome | null;
  setNumericPanelEnabled: (enabled: boolean) => void;
  numericPanel: {
    enabled: boolean;
    start: string;
    end: string;
    subdivisions: number;
  };
  updateNumericPanel: (patch: {
    start?: string;
    end?: string;
    subdivisions?: number;
  }) => void;
  complexRegionPanel: {
    enabled: boolean;
    reMin: string;
    reMax: string;
    imMin: string;
    imMax: string;
    gridSize: number;
  };
  complexRegionControls: {
    setPanelEnabled: (enabled: boolean) => void;
    updatePanel: (patch: Partial<ComplexRegionPanelState>) => void;
  };
}) {
  const numericIntervalSuggestions: readonly PeriodicIntervalSuggestion[] =
    input.displayOutcome && 'periodicFamily' in input.displayOutcome
      ? input.displayOutcome.periodicFamily?.suggestedIntervals ?? []
      : [];
  return {
    shouldAllowNumericSolve: input.controller.shouldAllowEquationNumericSolve(),
    shouldShowNumericSolvePanel: input.controller.shouldShowEquationNumericSolvePanel(),
    equationNumericSolvePanel: input.numericPanel,
    numericIntervalSuggestions,
    onSetNumericSolvePanelEnabled: input.setNumericPanelEnabled,
    onApplyNumericIntervalSuggestion: (start: string, end: string) => input.updateNumericPanel({ start, end }),
    onUpdateNumericStart: (nextValue: number) => input.updateNumericPanel({ start: String(nextValue) }),
    onUpdateNumericEnd: (nextValue: number) => input.updateNumericPanel({ end: String(nextValue) }),
    onUpdateNumericSubdivisions: (nextValue: number) =>
      input.updateNumericPanel({ subdivisions: nextValue || 0 }),
    shouldAllowComplexRegionSolve: input.controller.shouldAllowEquationComplexRegionSolve(),
    shouldShowComplexRegionPanel: input.controller.shouldShowEquationComplexRegionPanel(),
    equationComplexRegionPanel: input.complexRegionPanel,
    onSetComplexRegionPanelEnabled: input.complexRegionControls.setPanelEnabled,
    onUpdateComplexRegionReMin: (nextValue: number) =>
      input.complexRegionControls.updatePanel({ reMin: String(nextValue) }),
    onUpdateComplexRegionReMax: (nextValue: number) =>
      input.complexRegionControls.updatePanel({ reMax: String(nextValue) }),
    onUpdateComplexRegionImMin: (nextValue: number) =>
      input.complexRegionControls.updatePanel({ imMin: String(nextValue) }),
    onUpdateComplexRegionImMax: (nextValue: number) =>
      input.complexRegionControls.updatePanel({ imMax: String(nextValue) }),
    onUpdateComplexRegionGridSize: (nextValue: number) =>
      input.complexRegionControls.updatePanel({ gridSize: nextValue || 0 }),
  };
}
