import { describe, expect, it } from 'vitest';
import { getLabExperimentById } from './catalog';
import { getLabRunnerDefinitionById, getLabRunnerDefinitions } from './runner-registry';
import type { LabRunnerCategory } from './runner-types';

const APPROVED_RUNNER_CATEGORIES = [
  'local-stable-probe',
  'local-playground-experiment',
  'corpus-comparison',
] satisfies LabRunnerCategory[];

describe('Labs runner registry', () => {
  it('exposes only the approved first interactive Labs runners', () => {
    const runners = getLabRunnerDefinitions();

    expect(runners.map((runner) => runner.runnerId)).toEqual([
      'sym-search-planner-ordering',
      'expression-baseline-probe',
    ]);
    expect(getLabRunnerDefinitionById('missing-runner')).toBeUndefined();
  });

  it('declares equation and expression input through runner-gated metadata', () => {
    expect(getLabRunnerDefinitionById('sym-search-planner-ordering')?.acceptedInputKinds).toEqual([
      'equation',
      'corpus-case',
    ]);
    expect(getLabRunnerDefinitionById('expression-baseline-probe')?.acceptedInputKinds).toEqual([
      'expression',
    ]);
  });

  it('declares the dev-only runner policy for every approved runner', () => {
    for (const runner of getLabRunnerDefinitions()) {
      expect(APPROVED_RUNNER_CATEGORIES).toContain(runner.runnerCategory);
      expect(runner.executionScope).toBe('dev-only-local');
      expect(runner.historyPolicy).toBe('no-history');
      expect(runner.sourceMirrorPolicy).toBe('no-source-mirror-execution');
      expect(runner.remotePolicy).toBe('no-remote-execution');
    }
  });

  it('keeps runners mapped to committed Playground catalog experiments', () => {
    for (const runner of getLabRunnerDefinitions()) {
      expect(getLabExperimentById(runner.experimentId)).toBeTruthy();
    }
  });

  it('keeps forbidden runner categories out of the stable registry', () => {
    const forbiddenCategories = new Set(['remote-experiment', 'source-mirror-execution']);

    for (const runner of getLabRunnerDefinitions()) {
      expect(forbiddenCategories.has(runner.runnerCategory)).toBe(false);
    }
  });
});
