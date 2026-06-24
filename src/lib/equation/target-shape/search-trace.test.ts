import { describe, expect, it } from 'vitest';
import {
  createEquationSelectedTargetSearchTrace,
  recordSelectedTargetFamilyStop,
} from './search-trace';

describe('Equation selected-target search trace', () => {
  it('records family-level stop evidence without changing route families', () => {
    const trace = createEquationSelectedTargetSearchTrace();

    recordSelectedTargetFamilyStop(
      trace.record,
      'top-level',
      'cubic-cardano',
      'formula-deferred',
      'Cubic formula output is blocked until prerequisites are implemented.',
      { degree: 3, algorithm: 'cardano' },
    );

    expect(trace.events).toEqual([{
      kind: 'family-stop',
      phase: 'top-level',
      family: 'cubic-cardano',
      reason: 'formula-deferred',
      message: 'Cubic formula output is blocked until prerequisites are implemented.',
      details: { degree: 3, algorithm: 'cardano' },
    }]);
  });
});
