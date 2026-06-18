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

export function launchWorkspaceEntryFromLauncher(
  entry: LauncherAppEntry,
  intent: LauncherLaunchIntent = 'current-tab',
  deps: LauncherWorkspaceLaunchDeps,
) {
  if (!prepareWorkspaceLaunch(entry, intent, deps)) {
    return;
  }

  if (entry.launch.mode === 'calculate') {
    deps.openCalculateScreen(entry.launch.calculateScreen ?? 'standard');
    commitLauncherMode('calculate', intent, deps);
    return;
  }

  if (entry.launch.mode === 'equation') {
    deps.clearEquationSolveTarget();
    deps.openEquationScreen(entry.launch.equationScreen ?? 'home');
    deps.clearDisplayOutcome();
    commitLauncherMode('equation', intent, deps);
    return;
  }

  if (entry.launch.mode === 'matrix' || entry.launch.mode === 'vector' || entry.launch.mode === 'table') {
    deps.clearDisplayOutcome();
    commitLauncherMode(entry.launch.mode, intent, deps);
    return;
  }

  if (entry.launch.mode === 'calculus') {
    deps.openCalculusScreen(entry.launch.calculusScreen ?? 'home');
    commitLauncherMode('calculus', intent, deps);
    return;
  }

  if (entry.launch.mode === 'trigonometry') {
    deps.openTrigScreen(entry.launch.trigScreen ?? 'home');
    commitLauncherMode('trigonometry', intent, deps);
    return;
  }

  if (entry.launch.mode === 'statistics') {
    deps.openStatisticsScreen(entry.launch.statisticsScreen ?? 'home');
    commitLauncherMode('statistics', intent, deps);
    return;
  }

  if (entry.launch.mode === 'labs') {
    deps.clearDisplayOutcome();
    commitLauncherMode('labs', intent, deps);
    return;
  }

  deps.openGeometryScreen(entry.launch.geometryScreen ?? 'home');
  commitLauncherMode('geometry', intent, deps);
}
