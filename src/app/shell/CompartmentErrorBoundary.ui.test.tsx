import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listCompartmentUiBoundaryErrors,
  resetCompartmentUiBoundaryRecordsForTests,
} from '../../lib/compartments/ui-boundary-records';
import { CompartmentErrorBoundary } from './CompartmentErrorBoundary';

function CrashingWorkspace(): null {
  throw new Error('Workspace exploded');
}

describe('CompartmentErrorBoundary', () => {
  beforeEach(() => {
    resetCompartmentUiBoundaryRecordsForTests();
  });

  it('contains a workspace render failure and records compartment evidence', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      render(
        <CompartmentErrorBoundary
          compartmentId="geometry"
          compartmentLabel="Geometry"
          surfaceLabel="Geometry workspace"
        >
          <CrashingWorkspace />
        </CompartmentErrorBoundary>,
      );
    } finally {
      consoleError.mockRestore();
    }

    expect(screen.getByTestId('compartment-error-boundary')).toHaveTextContent(
      'Geometry workspace stopped rendering',
    );
    expect(screen.getByTestId('compartment-error-boundary')).toHaveTextContent(
      'Workspace exploded',
    );
    expect(listCompartmentUiBoundaryErrors()).toEqual([
      expect.objectContaining({
        compartmentId: 'geometry',
        compartmentLabel: 'Geometry',
        errorMessage: 'Workspace exploded',
        source: 'ui-boundary',
      }),
    ]);
  });
});
