import { describe, expect, it, vi } from 'vitest';
import { getGuideArticle } from '../../lib/guide/content';
import type { GuideExample } from '../../types/calculator';
import { launchGuideExampleDestination } from './guideExampleLaunchActions';

type LaunchDeps = Parameters<typeof launchGuideExampleDestination>[1];

function guideExample(articleId: string, exampleId: string): GuideExample {
  const article = getGuideArticle(articleId);
  const example = article?.examples.find((candidate) => candidate.id === exampleId);

  if (!example) {
    throw new Error(`Missing Guide example ${articleId}/${exampleId}`);
  }

  return example;
}

function createDeps(): LaunchDeps {
  return {
    applyCalculateSeed: vi.fn(),
    applyCalculusSeed: vi.fn(),
    applyTrigSeed: vi.fn(),
    clearDisplayOutcome: vi.fn(),
    closeHistoryPanel: vi.fn(),
    closeLauncher: vi.fn(),
    loadGeometryExample: vi.fn(),
    loadStatisticsExample: vi.fn(),
    loadTablePrimaryLatex: vi.fn(),
    loadTrigExample: vi.fn(),
    openCalculateScreen: vi.fn(),
    openCalculusScreen: vi.fn(),
    openEquationScreen: vi.fn(),
    openLegacyCalculateCalculusInCalculus: vi.fn().mockReturnValue(false),
    openStatisticsScreen: vi.fn(),
    openTrigScreen: vi.fn(),
    routeToModeDestination: vi.fn((_mode, applyDestination) => {
      applyDestination();
      return true;
    }),
    setCalculateLatex: vi.fn(),
    setClipboardNotice: vi.fn(),
    setEquationLatex: vi.fn(),
    setEquationSolveTarget: vi.fn(),
  };
}

function expectCommonLaunchPrep(deps: LaunchDeps) {
  expect(deps.closeLauncher).toHaveBeenCalledTimes(1);
  expect(deps.closeHistoryPanel).toHaveBeenCalledTimes(1);
}

describe('launchGuideExampleDestination', () => {
  it('routes Calculate Guide examples into Calculate with their expression loaded', () => {
    const deps = createDeps();

    launchGuideExampleDestination(
      guideExample('basics-keyboard', 'basics-fraction'),
      deps,
    );

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('calculate', expect.any(Function));
    expect(deps.setCalculateLatex).toHaveBeenCalledWith('\\frac{1}{3}+\\frac{1}{6}');
    expect(deps.openCalculateScreen).toHaveBeenCalledWith('standard');
    expect(deps.applyCalculateSeed).toHaveBeenCalledWith('standard', undefined);
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
    expect(deps.setClipboardNotice).toHaveBeenCalledWith('Load in Calculate');
  });

  it('routes Equation Guide examples into Symbolic Equation with the solve target preserved', () => {
    const deps = createDeps();

    launchGuideExampleDestination(
      guideExample('algebra-equations', 'algebra-equation-param-linear'),
      deps,
    );

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('equation', expect.any(Function));
    expect(deps.setEquationLatex).toHaveBeenCalledWith('x+z=5');
    expect(deps.setEquationSolveTarget).toHaveBeenCalledWith('z');
    expect(deps.openEquationScreen).toHaveBeenCalledWith('symbolic');
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
  });

  it('routes Calculus Guide examples into the requested Calculus screen and seed', () => {
    const deps = createDeps();
    const example = guideExample('calculus-derivatives', 'calc-derivative-function-power');

    launchGuideExampleDestination(example, deps);

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('calculus', expect.any(Function));
    expect(deps.openCalculusScreen).toHaveBeenCalledWith('derivative');
    expect(deps.applyCalculusSeed).toHaveBeenCalledWith(
      'derivative',
      expect.objectContaining({
        bodyLatex: expect.stringContaining('\\sin^2'),
      }),
    );
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
  });

  it('routes Trigonometry Guide examples into their guided Trigonometry screen', () => {
    const deps = createDeps();
    const example = guideExample('trig-period-phase', 'trig-period-phase-sine');

    launchGuideExampleDestination(example, deps);

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('trigonometry', expect.any(Function));
    expect(deps.openTrigScreen).toHaveBeenCalledWith('periodPhase');
    expect(deps.applyTrigSeed).toHaveBeenCalledWith(
      'periodPhase',
      expect.objectContaining({
        expressionLatex: expect.stringContaining('\\sin'),
      }),
    );
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
  });

  it('routes Statistics Guide examples into the requested Statistics screen', () => {
    const deps = createDeps();

    launchGuideExampleDestination(
      guideExample('statistics-inference', 'statistics-inference-mean'),
      deps,
    );

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('statistics', expect.any(Function));
    expect(deps.openStatisticsScreen).toHaveBeenCalledWith('meanInference');
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
  });

  it('routes Geometry Guide examples with their seeded formula workspace state', () => {
    const deps = createDeps();

    launchGuideExampleDestination(
      guideExample('geometry-coordinate', 'geometry-distance'),
      deps,
    );

    expectCommonLaunchPrep(deps);
    expect(deps.routeToModeDestination).toHaveBeenCalledWith('geometry', expect.any(Function));
    expect(deps.loadGeometryExample).toHaveBeenCalledWith(
      'distance',
      '',
      expect.objectContaining({
        p1: { x: '0', y: '0' },
        p2: { x: '3', y: '4' },
      }),
    );
    expect(deps.clearDisplayOutcome).toHaveBeenCalledTimes(1);
  });

  it('routes Matrix and Vector Guide examples as workspace opens, not expression loads', () => {
    const matrixDeps = createDeps();
    const vectorDeps = createDeps();

    launchGuideExampleDestination(
      guideExample('linear-algebra-matrix-vector', 'linear-open-matrix'),
      matrixDeps,
    );
    launchGuideExampleDestination(
      guideExample('linear-algebra-matrix-vector', 'linear-open-vector'),
      vectorDeps,
    );

    expectCommonLaunchPrep(matrixDeps);
    expectCommonLaunchPrep(vectorDeps);
    expect(matrixDeps.routeToModeDestination).toHaveBeenCalledWith('matrix', matrixDeps.clearDisplayOutcome);
    expect(vectorDeps.routeToModeDestination).toHaveBeenCalledWith('vector', vectorDeps.clearDisplayOutcome);
    expect(matrixDeps.setCalculateLatex).not.toHaveBeenCalled();
    expect(vectorDeps.setCalculateLatex).not.toHaveBeenCalled();
    expect(matrixDeps.setEquationLatex).not.toHaveBeenCalled();
    expect(vectorDeps.setEquationLatex).not.toHaveBeenCalled();
  });
});
