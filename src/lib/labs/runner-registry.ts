import type { LabRunnerSummary } from './runner-types';

export const LAB_RUNNER_DEFINITIONS = [
  {
    runnerId: 'sym-search-planner-ordering',
    experimentId: 'sym-search-planner-ordering',
    title: 'Symbolic Search Planner Ordering',
    description:
      'Compare stable guarded equation solving against alternate symbolic-search planner orderings.',
    runnerCategory: 'corpus-comparison',
    executionScope: 'dev-only-local',
    historyPolicy: 'no-history',
    sourceMirrorPolicy: 'no-source-mirror-execution',
    remotePolicy: 'no-remote-execution',
    acceptedInputKinds: ['equation', 'corpus-case'],
    defaultInputKind: 'corpus-case',
    defaultLatex: '\\sin\\left(x^2+x\\right)=\\frac{1}{2}',
  },
  {
    runnerId: 'expression-baseline-probe',
    experimentId: 'expression-baseline-probe',
    title: 'Expression Baseline Probe',
    description:
      'Run expression input through a Playground-owned visual probe over stable Calculate behavior.',
    runnerCategory: 'local-stable-probe',
    executionScope: 'dev-only-local',
    historyPolicy: 'no-history',
    sourceMirrorPolicy: 'no-source-mirror-execution',
    remotePolicy: 'no-remote-execution',
    acceptedInputKinds: ['expression'],
    defaultInputKind: 'expression',
    defaultLatex: '\\frac{1}{3}+\\frac{1}{6}',
  },
] as const satisfies readonly LabRunnerSummary[];

export function getLabRunnerDefinitions() {
  return LAB_RUNNER_DEFINITIONS;
}

export function getLabRunnerDefinitionById(runnerId: string) {
  return LAB_RUNNER_DEFINITIONS.find((runner) => runner.runnerId === runnerId);
}
