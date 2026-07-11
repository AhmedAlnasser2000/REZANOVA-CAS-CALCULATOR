import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectMathStaticLatex } from '../../../test/renderAppMain';
import { DEFAULT_SETTINGS } from '../../../types/calculator';
import { DisplayPanel } from '../DisplayPanel';

describe('Display detail contract', () => {
  it('renders typed solve-note math without inferring from compatibility text', () => {
    render(
      <DisplayPanel
        activeResultCopyText={() => ''}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={() => undefined}
        currentMode="equation"
        displayHeaderLabel="Equation"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'Symbolic',
          warnings: [],
          exactLatex: 'x=1',
          solveSummaryText: 'Reduced carrier: u=x^2',
          solveSummaryParts: [[
            { kind: 'text', text: 'Reduced carrier: ' },
            { kind: 'math', latex: 'u=x^2' },
          ]],
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        settings={DEFAULT_SETTINGS}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const solveNote = screen.getByTestId('display-outcome-solve-summary') as HTMLDetailsElement;
    fireEvent.click(within(solveNote).getByText('Solve Note'));
    expect(solveNote.open).toBe(true);
    expect(within(solveNote).getByText('Reduced carrier:')).toBeInTheDocument();
    expectMathStaticLatex(solveNote, 'u=x^2');
  });
});
