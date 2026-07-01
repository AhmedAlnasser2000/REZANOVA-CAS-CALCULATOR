import { canOpenLauncherEntryInNewTab } from '../../lib/navigation/launcher';
import type {
  CalculateScreen,
  CalculusScreen,
  EquationScreen,
  GeometryScreen,
  LauncherAppEntry,
  LauncherLaunchIntent,
  ModeId,
  StatisticsScreen,
  TrigScreen,
} from '../../types/calculator';

type LauncherWorkspaceLaunchDeps = {
  clearDisplayOutcome: () => void;
  clearEquationSolveTarget: () => void;
  commitVisibleModeSelection: (mode: ModeId) => void;
  createWorkspaceKindTab: ((mode: ModeId) => void) | null;
  openCalculateScreen: (screen: CalculateScreen) => void;
  openCalculusScreen: (screen: CalculusScreen) => void;
  openEquationScreen: (screen: EquationScreen) => void;
  openGeometryScreen: (screen: GeometryScreen) => void;
  openStatisticsScreen: (screen: StatisticsScreen) => void;
  openTrigScreen: (screen: TrigScreen) => void;
  routeWorkspaceDestination?: (
    entry: LauncherAppEntry,
    intent: LauncherLaunchIntent,
    applyDestination: () => void,
  ) => boolean;
  setMode: (mode: ModeId) => void;
};

function prepareWorkspaceLaunch(
  entry: LauncherAppEntry,
  intent: LauncherLaunchIntent,
  deps: LauncherWorkspaceLaunchDeps,
) {
  if (intent !== 'new-tab') {
    return true;
  }

  if (!canOpenLauncherEntryInNewTab(entry) || !deps.createWorkspaceKindTab) {
    return false;
  }

  deps.createWorkspaceKindTab(entry.launch.mode);
  return true;
}

function commitLauncherMode(
  mode: ModeId,
  intent: LauncherLaunchIntent,
  deps: LauncherWorkspaceLaunchDeps,
) {
  if (intent === 'new-tab') {
    deps.commitVisibleModeSelection(mode);
    return;
  }

  deps.setMode(mode);
}

function openLauncherDestination(
  entry: LauncherAppEntry,
  intent: LauncherLaunchIntent,
  deps: LauncherWorkspaceLaunchDeps,
  applyDestination: () => void,
) {
  if (deps.routeWorkspaceDestination) {
    if (intent === 'new-tab' && !canOpenLauncherEntryInNewTab(entry)) {
      return false;
    }
    return deps.routeWorkspaceDestination(entry, intent, applyDestination);
  }

  if (!prepareWorkspaceLaunch(entry, intent, deps)) {
    return false;
  }

  applyDestination();
  commitLauncherMode(entry.launch.mode, intent, deps);
  return true;
}

export function launchWorkspaceEntryFromLauncher(
  entry: LauncherAppEntry,
  intent: LauncherLaunchIntent = 'current-tab',
  deps: LauncherWorkspaceLaunchDeps,
) {
  if (entry.launch.mode === 'calculate') {
    const screen = entry.launch.calculateScreen ?? 'standard';
    openLauncherDestination(entry, intent, deps, () =>
      deps.openCalculateScreen(screen));
    return;
  }

  if (entry.launch.mode === 'equation') {
    const screen = entry.launch.equationScreen ?? 'home';
    openLauncherDestination(entry, intent, deps, () => {
      deps.clearEquationSolveTarget();
      deps.openEquationScreen(screen);
      deps.clearDisplayOutcome();
    });
    return;
  }

  if (entry.launch.mode === 'matrix' || entry.launch.mode === 'vector' || entry.launch.mode === 'table') {
    openLauncherDestination(entry, intent, deps, () => deps.clearDisplayOutcome());
    return;
  }

  if (entry.launch.mode === 'calculus') {
    const screen = entry.launch.calculusScreen ?? 'home';
    openLauncherDestination(entry, intent, deps, () =>
      deps.openCalculusScreen(screen));
    return;
  }

  if (entry.launch.mode === 'trigonometry') {
    const screen = entry.launch.trigScreen ?? 'home';
    openLauncherDestination(entry, intent, deps, () =>
      deps.openTrigScreen(screen));
    return;
  }

  if (entry.launch.mode === 'statistics') {
    const screen = entry.launch.statisticsScreen ?? 'home';
    openLauncherDestination(entry, intent, deps, () =>
      deps.openStatisticsScreen(screen));
    return;
  }

  if (entry.launch.mode === 'labs') {
    openLauncherDestination(entry, intent, deps, () => deps.clearDisplayOutcome());
    return;
  }

  const screen = entry.launch.geometryScreen ?? 'home';
  openLauncherDestination(entry, intent, deps, () =>
    deps.openGeometryScreen(screen));
}
