import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { expectMathStaticLatex } from '../../../test/renderAppMain';
import { DisplayPanel } from '../DisplayPanel';
import { canonicalMathValue } from '../../../lib/result-contract';
import { canonicalResultFixture } from '../../../test-utils/canonical-result-fixture';
import { DEFAULT_SETTINGS } from '../../../types/calculator';

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
        displayOutcome={canonicalResultFixture({
          outcomeKind: 'success',
          title: 'Symbolic',
          warnings: [],
          primaryMath: canonicalMathValue('x=1'),
          solveSummaryParts: [[
            { kind: 'text', text: 'Reduced carrier: ' },
            { kind: 'math', latex: 'u=x^2' },
          ]],
        })}
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

  it('renders math-marked result detail lines through the shared math display path', async () => {
    render(
      <DisplayPanel
        activeResultCopyText={() => 'x=\\sqrt{2}'}
        activeResultEditorLatex={() => ''}
        copyText={() => undefined}
        currentMode="equation"
        displayHeaderLabel="Equation"
        displayResultBadges={[]}
        displayOutcome={canonicalResultFixture({
          outcomeKind: 'success',
          title: 'Symbolic',
          warnings: [],
          primaryMath: canonicalMathValue('x=\\sqrt{2}'),
          detailSections: [
            {
              title: 'Expanded Branches',
              lines: ['x=\\sqrt{2}', 'x=-\\sqrt{2}'],
              lineKind: 'math',
            },
            {
              title: 'Composition Branch',
              lines: [
                'Composition branch: \\cos(|3x^2+1|) stays in [-1, 1], so \\tan(\\cos(|3x^2+1|))=1 reduces to \\cos(|3x^2+1|)=\\frac{\\pi}{4}.',
              ],
              lineParts: [[
                { kind: 'text', text: 'Composition branch: ' },
                { kind: 'math', latex: '\\cos(|3x^2+1|)' },
                { kind: 'text', text: ' stays in ' },
                { kind: 'math', latex: '[-1, 1]' },
                { kind: 'text', text: ', so ' },
                { kind: 'math', latex: '\\tan(\\cos(|3x^2+1|))=1' },
                { kind: 'text', text: ' reduces to ' },
                { kind: 'math', latex: '\\cos(|3x^2+1|)=\\frac{\\pi}{4}' },
                { kind: 'text', text: '.' },
              ]],
            },
            {
              title: 'Solve Note',
              lines: ['Use Exact mode with one variable and exact numeric constants.'],
              lineKind: 'text',
            },
          ],
        })}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        settings={{
          ...DEFAULT_SETTINGS,
          detailedFactsEnabled: true,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
    });
    const details = screen.getByTestId('display-outcome-detail-sections');
    expect(details).toHaveTextContent('Composition Branch');
    const mathRawLatex = [...details.querySelectorAll('[data-raw-latex]')]
      .map((node) => node.getAttribute('data-raw-latex') ?? '');
    expect(mathRawLatex).toContain('x=\\sqrt{2}');
    expect(mathRawLatex).toContain('x=-\\sqrt{2}');
    expect(mathRawLatex.some((latex) => latex.includes('\\cos(|3x^2+1|)'))).toBe(true);
    expect(mathRawLatex.some((latex) => latex.includes('\\tan(\\cos(|3x^2+1|))=1'))).toBe(true);
    expect(details.querySelector('[data-raw-latex^="Composition branch:"]'))
      .toBeNull();
  });
});
