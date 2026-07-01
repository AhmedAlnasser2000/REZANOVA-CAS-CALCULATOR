import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import type {
  CalculateScreen,
  CalculusScreen,
  EquationScreen,
  GeometryScreen,
  GuideExample,
  ModeId,
  StatisticsScreen,
  TrigScreen,
} from '../../types/calculator';

type GuideExampleLaunchDeps = {
  applyCalculateSeed: (screen: CalculateScreen, seed: GuideExample['launch']['calculateSeed']) => void;
  applyCalculusSeed: (screen: CalculusScreen, seed: GuideExample['launch']['calculusSeed']) => void;
  applyTrigSeed: (screen: TrigScreen, seed: GuideExample['launch']['trigSeed']) => void;
  clearDisplayOutcome: () => void;
  closeHistoryPanel: () => void;
  closeLauncher: () => void;
  loadGeometryExample: (screen: GeometryScreen, latex: string, seed: GuideExample['launch']['geometrySeed']) => void;
  loadStatisticsExample: (screen: StatisticsScreen, latex: string) => void;
  loadTablePrimaryLatex: (latex: string) => void;
  loadTrigExample: (screen: TrigScreen, latex: string, seed: GuideExample['launch']['trigSeed']) => void;
  openCalculateScreen: (screen: CalculateScreen) => void;
  openCalculusScreen: (screen: CalculusScreen) => void;
  openEquationScreen: (screen: EquationScreen) => void;
  openLegacyCalculateCalculusInCalculus: (
    screen: CalculateScreen | null | undefined,
    seed: GuideExample['launch']['calculateSeed'],
  ) => boolean;
  openStatisticsScreen: (screen: StatisticsScreen) => void;
  openTrigScreen: (screen: TrigScreen) => void;
  routeToModeDestination: (mode: ModeId, applyDestination: () => void) => boolean;
  setCalculateLatex: (latex: string) => void;
  setClipboardNotice: (notice: string | null) => void;
  setEquationLatex: (latex: string) => void;
  setEquationSolveTarget: (target: string | null) => void;
};

type GuideExampleWithLaunch<TLaunch extends GuideExample['launch']> =
  Omit<GuideExample, 'launch'> & { launch: TLaunch };
type OpenToolGuideExample = GuideExampleWithLaunch<Extract<GuideExample['launch'], { kind: 'open-tool' }>>;
type LoadExpressionGuideExample = GuideExampleWithLaunch<
  Extract<GuideExample['launch'], { kind: 'load-expression' }>
>;

function announce(deps: GuideExampleLaunchDeps, label: string | undefined, fallback: string) {
  deps.setClipboardNotice(label ?? fallback);
}

function openCalculateGuideTarget(example: GuideExample, deps: GuideExampleLaunchDeps, latex?: string) {
  const screen = example.launch.calculateScreen ?? 'standard';
  if (deps.openLegacyCalculateCalculusInCalculus(screen, example.launch.calculateSeed)) {
    deps.clearDisplayOutcome();
    announce(deps, example.launch.label, latex ? 'Example loaded in Calculus' : 'Opened in Calculus');
    return;
  }

  deps.routeToModeDestination('calculate', () => {
    if (latex !== undefined) {
      deps.setCalculateLatex(latex);
    }
    deps.openCalculateScreen(screen);
    deps.applyCalculateSeed(screen, example.launch.calculateSeed);
    deps.clearDisplayOutcome();
  });
  announce(deps, example.launch.label, latex ? 'Example loaded' : 'Opened in tool');
}

function openCalculusGuideTarget(example: GuideExample, deps: GuideExampleLaunchDeps) {
  const screen = example.launch.calculusScreen ?? 'home';
  deps.routeToModeDestination('calculus', () => {
    deps.openCalculusScreen(screen);
    deps.applyCalculusSeed(screen, example.launch.calculusSeed);
    deps.clearDisplayOutcome();
  });
}

function openOpenToolGuideTarget(example: OpenToolGuideExample, deps: GuideExampleLaunchDeps) {
  if (example.launch.targetMode === 'calculate') {
    openCalculateGuideTarget(example, deps);
    return;
  }

  if (isCalculusMode(example.launch.targetMode)) {
    openCalculusGuideTarget(example, deps);
    announce(deps, example.launch.label, 'Opened in tool');
    return;
  }

  if (example.launch.targetMode === 'equation') {
    deps.routeToModeDestination('equation', () => {
      deps.setEquationSolveTarget(null);
      deps.openEquationScreen(example.launch.equationScreen ?? 'home');
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Opened in tool');
    return;
  }

  if (example.launch.targetMode === 'trigonometry') {
    const screen = example.launch.trigScreen ?? 'home';
    deps.routeToModeDestination('trigonometry', () => {
      deps.openTrigScreen(screen);
      deps.applyTrigSeed(screen, example.launch.trigSeed);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Opened in tool');
    return;
  }

  if (example.launch.targetMode === 'statistics') {
    const screen = example.launch.statisticsScreen ?? 'home';
    deps.routeToModeDestination('statistics', () => {
      deps.openStatisticsScreen(screen);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Opened in tool');
    return;
  }

  if (example.launch.targetMode === 'geometry') {
    const screen = example.launch.geometryScreen ?? 'home';
    deps.routeToModeDestination('geometry', () => {
      deps.loadGeometryExample(screen, '', example.launch.geometrySeed);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Opened in tool');
    return;
  }

  if (
    example.launch.targetMode === 'matrix'
    || example.launch.targetMode === 'vector'
    || example.launch.targetMode === 'table'
  ) {
    deps.routeToModeDestination(example.launch.targetMode, deps.clearDisplayOutcome);
    announce(deps, example.launch.label, 'Opened in tool');
  }
}

function loadLatexGuideTarget(
  example: LoadExpressionGuideExample,
  deps: GuideExampleLaunchDeps,
  latex: string,
) {
  if (example.launch.targetMode === 'calculate') {
    openCalculateGuideTarget(example, deps, latex);
    return;
  }

  if (example.launch.targetMode === 'equation') {
    const equationSolveTarget = example.launch.equationSolveTarget ?? null;
    const equationScreen = example.launch.equationScreen ?? 'symbolic';
    deps.routeToModeDestination('equation', () => {
      deps.setEquationLatex(latex);
      deps.setEquationSolveTarget(equationSolveTarget);
      deps.openEquationScreen(equationScreen);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  if (isCalculusMode(example.launch.targetMode)) {
    openCalculusGuideTarget(example, deps);
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'trigonometry') {
    const screen = example.launch.trigScreen ?? 'functions';
    deps.routeToModeDestination('trigonometry', () => {
      deps.loadTrigExample(screen, latex, example.launch.trigSeed);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'statistics') {
    const screen = example.launch.statisticsScreen ?? 'home';
    deps.routeToModeDestination('statistics', () => {
      deps.loadStatisticsExample(screen, latex);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'geometry') {
    const screen = example.launch.geometryScreen ?? 'home';
    deps.routeToModeDestination('geometry', () => {
      deps.loadGeometryExample(screen, latex, example.launch.geometrySeed);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  if (example.launch.targetMode === 'table') {
    deps.routeToModeDestination('table', () => {
      deps.loadTablePrimaryLatex(latex);
      deps.clearDisplayOutcome();
    });
    announce(deps, example.launch.label, 'Example loaded');
    return;
  }

  deps.routeToModeDestination('table', deps.clearDisplayOutcome);
  announce(deps, example.launch.label, 'Example loaded');
}

export function launchGuideExampleDestination(
  example: GuideExample | undefined,
  deps: GuideExampleLaunchDeps,
) {
  if (!example) {
    return;
  }

  deps.closeLauncher();
  deps.closeHistoryPanel();

  const launch = example.launch;
  if (launch.kind === 'open-tool') {
    openOpenToolGuideTarget({ ...example, launch }, deps);
    return;
  }

  const latex = launch.latex.trim();
  if (latex) {
    loadLatexGuideTarget({ ...example, launch }, deps, latex);
  }
}
