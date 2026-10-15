import type { LauncherAppEntry, LauncherLeafId, ModeId } from '../../types/calculator';

/**
 * Which workspaces can be opened (EQUATION-RECONSTRUCTION-CLOSEOUT1 PR B, user decision 2026-10-14). The rebuilt
 * pages stay open: Equation (the New Equation page), New Integration, Graphing, Notebook, Settings, History, Guide.
 * Every calculator-shell workspace stays visible but cannot be opened until it is rebuilt on a new engine.
 */
export const UNAVAILABLE_WORKSPACE_SIGN = 'Unavailable: being rebuilt';

/** Launcher leaves that open a page; every other leaf opens a calculator-shell workspace. */
const AVAILABLE_LAUNCHER_LEAVES: ReadonlySet<LauncherLeafId> = new Set<LauncherLeafId>([
  'new-equation',
  'new-integration',
]);

/** Calculator-shell modes that still open: Guide is help, not a workspace. */
const AVAILABLE_SHELL_MODES: ReadonlySet<ModeId> = new Set<ModeId>(['guide']);

export function isLauncherLeafAvailable(id: LauncherLeafId): boolean {
  return AVAILABLE_LAUNCHER_LEAVES.has(id);
}

export function isLauncherEntryAvailable(entry: Pick<LauncherAppEntry, 'id'>): boolean {
  return isLauncherLeafAvailable(entry.id);
}

export function isShellModeAvailable(mode: ModeId): boolean {
  return AVAILABLE_SHELL_MODES.has(mode);
}
