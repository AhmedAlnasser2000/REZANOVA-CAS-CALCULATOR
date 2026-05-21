import { describe, expect, it } from 'vitest';
import { getLabRunnerDefinitionById, getLabRunnerDefinitions } from './runner-registry';

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
});
