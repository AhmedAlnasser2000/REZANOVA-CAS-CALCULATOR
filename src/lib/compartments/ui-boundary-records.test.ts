import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT,
  clearCompartmentUiBoundaryErrors,
  listCompartmentUiBoundaryErrors,
  recordCompartmentUiBoundaryError,
  resetCompartmentUiBoundaryRecordsForTests,
} from './ui-boundary-records';

describe('compartment UI boundary records', () => {
  beforeEach(() => {
    resetCompartmentUiBoundaryRecordsForTests();
  });

  it('records shallow serializable UI boundary facts with manifest labels', () => {
    const record = recordCompartmentUiBoundaryError({
      compartmentId: 'equation',
      error: new Error('Workspace crashed'),
      componentStack: '\n    at EquationWorkspace',
      timestamp: 123,
    });

    expect(record).toEqual({
      recordId: 'compartment.ui.1',
      sequence: 1,
      compartmentId: 'equation',
      compartmentLabel: 'Equation',
      errorMessage: 'Workspace crashed',
      componentStack: 'at EquationWorkspace',
      timestamp: 123,
      source: 'ui-boundary',
    });
    expect(listCompartmentUiBoundaryErrors()).toEqual([record]);
  });

  it('bounds retention and returns immutable snapshots', () => {
    for (let index = 0; index < DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT + 2; index += 1) {
      recordCompartmentUiBoundaryError({
        compartmentId: 'app-shell',
        error: `Failure ${index}`,
        timestamp: index,
      });
    }

    const snapshot = listCompartmentUiBoundaryErrors();

    expect(snapshot).toHaveLength(DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT);
    expect(snapshot[0]).toMatchObject({
      sequence: DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT + 2,
      errorMessage: `Failure ${DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT + 1}`,
    });
    snapshot[0].errorMessage = 'mutated';
    expect(listCompartmentUiBoundaryErrors()[0].errorMessage).toBe(
      `Failure ${DEFAULT_COMPARTMENT_UI_BOUNDARY_RECORD_LIMIT + 1}`,
    );
  });

  it('clears records without resetting the monotonic sequence', () => {
    recordCompartmentUiBoundaryError({
      compartmentId: 'geometry',
      error: 'First',
      timestamp: 1,
    });

    clearCompartmentUiBoundaryErrors();

    const second = recordCompartmentUiBoundaryError({
      compartmentId: 'geometry',
      error: 'Second',
      timestamp: 2,
    });

    expect(listCompartmentUiBoundaryErrors()).toEqual([second]);
    expect(second.sequence).toBe(2);
  });
});
