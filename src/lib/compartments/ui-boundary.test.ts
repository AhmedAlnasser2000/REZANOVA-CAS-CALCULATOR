import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCompartmentUiBoundaryErrors,
  listCompartmentUiBoundaryErrors,
  recordCompartmentUiBoundaryError,
  resetCompartmentUiBoundaryRecordsForTests,
} from './ui-boundary';

describe('compartment UI boundary facade', () => {
  beforeEach(() => {
    resetCompartmentUiBoundaryRecordsForTests();
  });

  it('exposes the shallow UI-boundary record surface through a public facade', () => {
    const record = recordCompartmentUiBoundaryError({
      compartmentId: 'equation',
      error: new Error('Workspace crashed'),
      componentStack: 'at EquationWorkspace',
      timestamp: 123,
    });

    expect(listCompartmentUiBoundaryErrors()).toEqual([record]);

    clearCompartmentUiBoundaryErrors();

    expect(listCompartmentUiBoundaryErrors()).toEqual([]);
  });
});
