import { describe, expect, it } from 'vitest';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../../types/calculator';
import {
  isLauncherEntryAvailable,
  isShellModeAvailable,
  unavailableModeNotice,
  UNAVAILABLE_WORKSPACE_SIGN,
} from './availability';

describe('workspace availability', () => {
  it('opens only Equation and New Integration from the launcher', () => {
    const available = DEFAULT_LAUNCHER_CATEGORIES
      .flatMap((category) => category.entries)
      .filter((entry) => isLauncherEntryAvailable(entry))
      .map((entry) => entry.id)
      .sort();
    expect(available).toEqual(['new-equation', 'new-integration']);
  });

  it('keeps Guide as the only open calculator-shell mode', () => {
    expect(isShellModeAvailable('guide')).toBe(true);
    for (const mode of ['calculate', 'equation', 'matrix', 'vector', 'table', 'calculus', 'trigonometry', 'statistics', 'geometry', 'labs'] as const) {
      expect(isShellModeAvailable(mode)).toBe(false);
    }
  });

  it('names the refused workspace in its notice', () => {
    expect(unavailableModeNotice('calculate')).toBe(`Calculate: ${UNAVAILABLE_WORKSPACE_SIGN}`);
  });
});
