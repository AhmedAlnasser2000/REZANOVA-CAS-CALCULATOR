import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DisplayPanel } from './DisplayPanel';
import { expectMathStaticLatex } from '../../test/renderAppMain';
import { DEFAULT_SETTINGS } from '../../types/calculator';

async function waitForDisplayQueueToSettle() {
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

describe('DisplayPanel result shell', () => {
  it('keeps Stop available for active runtime work even when editor analysis is paused', () => {
    const onStopEditorAnalysis = vi.fn();

    render(
      <DisplayPanel
        calculateLatex=""
        currentMode="calculate"
        displayHeaderLabel="Calculate"
        displayResultBadges={[]}
        editorAnalysisStopped
        editorRuntimeStopDisabled={false}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        onStopEditorAnalysis={onStopEditorAnalysis}
        settings={DEFAULT_SETTINGS}
        showEditorRuntimeControls
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const stop = screen.getByTestId('editor-runtime-stop');
    expect(screen.getByRole('button', { name: 'Run' })).toHaveAttribute(
      'title',
      'Run the current editor input and resume editor analysis.',
    );
    expect(stop).toHaveTextContent('Stop');
    expect(screen.getByRole('button', { name: 'Restart Editor' })).toHaveAttribute(
      'title',
      'Clear and remount the active editor, then restart editor analysis.',
    );
    expect(screen.getByTestId('display-status')).toHaveTextContent('Ready');
    expect(stop).not.toBeDisabled();

    fireEvent.click(stop);
    expect(onStopEditorAnalysis).toHaveBeenCalledTimes(1);
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
        displayOutcome={{
          kind: 'success',
          title: 'Symbolic',
          warnings: [],
          exactLatex: 'x=\\sqrt{2}',
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
            },
            {
              title: 'Solve Note',
              lines: ['Use Exact mode with one variable and exact numeric constants.'],
            },
          ],
        }}
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

    await waitForDisplayQueueToSettle();
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

  it('keeps oversized result blocks compact until full rendering is requested', async () => {
    const exactLatex = 'x=2';
    const validWhenLatex = Array.from({ length: 25 }, (_, index) => `x\\ne${index}`);
    const copyLatex = `x=2, ${validWhenLatex.join(', ')}`;
    const copyText = vi.fn();

    render(
      <DisplayPanel
        activeExpressionLatex=""
        activeResultCopyText={() => copyLatex}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={copyText}
        currentMode="calculate"
        displayHeaderLabel="Calculate"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'Expand',
          warnings: [],
          exactLatex,
          exactSupplementLatex: validWhenLatex,
        }}
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

    const exact = screen.getByTestId('display-outcome-exact');
    await waitFor(() => expectMathStaticLatex(exact, exactLatex));
    await waitForDisplayQueueToSettle();

    const validWhen = screen.getByTestId('display-outcome-valid-when');
    fireEvent.click(within(validWhen).getByText(/Valid when/i));
    expect(screen.getByTestId('display-outcome-supplement-compact-preview')).toBeInTheDocument();
    expect(validWhen.querySelector('[data-raw-latex]')).toBeNull();

    fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
    expect(copyText).toHaveBeenCalledWith(copyLatex, 'Result copied');

    fireEvent.click(within(validWhen).getByRole('button', { name: /show full result/i }));
    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-supplement-0'),
      validWhenLatex[0],
    ));
  });

  it('renders finite branch answers as vertical rows with the long tail opt-in', async () => {
    const exactLatex = 's\\in\\left\\{a+b,a-b,\\frac{d}{4}+r+\\sqrt{x+j},\\frac{d}{4}-r-\\sqrt{x+j},z\\right\\}';
    const copyText = vi.fn();

    render(
      <DisplayPanel
        activeExpressionLatex=""
        activeResultCopyText={() => exactLatex}
        activeResultEditorLatex={() => exactLatex}
        calculateLatex=""
        copyText={copyText}
        currentMode="equation"
        displayHeaderLabel="Equation"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'Symbolic',
          warnings: [],
          exactLatex,
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact-branch-0'),
      's=a+b',
    ));
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact-branch-3'), /s=/);
    expect(screen.queryByTestId('display-outcome-exact-branch-4')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show remaining branches/i }));
    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact-branch-4'),
      's=z',
    ));

    fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
    expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied');
  });

  it('renders Real Cardano case answers as structured rows while preserving copy latex', async () => {
    const positiveRoot = String.raw`\left\{-\frac{A}{3}+\sqrt[3]{-\frac{q}{2}+\sqrt{\Delta}}+\sqrt[3]{-\frac{q}{2}-\sqrt{\Delta}}\right\}`;
    const tripleRoot = String.raw`\left\{-\frac{A}{3}\right\}`;
    const exactLatex = String.raw`x\in\begin{cases}${positiveRoot},&\Delta>0\\${tripleRoot},&\Delta=0,\ p=0,\ q=0\end{cases}`;
    const copyText = vi.fn();

    render(
      <DisplayPanel
        activeExpressionLatex=""
        activeResultCopyText={() => exactLatex}
        activeResultEditorLatex={() => exactLatex}
        calculateLatex=""
        copyText={copyText}
        currentMode="equation"
        displayHeaderLabel="Equation"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'Symbolic',
          warnings: [],
          exactLatex,
          detailSections: [
            {
              title: 'Real Cardano Definitions',
              lines: [String.raw`A=\frac{b}{a}`],
              lineKind: 'math',
            },
            {
              title: 'Real Cardano Cases',
              lines: [
                String.raw`${positiveRoot}, \Delta>0`,
                String.raw`${tripleRoot}, \Delta=0,\ p=0,\ q=0 has multiplicity 3`,
              ],
              lineParts: [
                [
                  { kind: 'math', latex: positiveRoot },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta>0` },
                ],
                [
                  { kind: 'math', latex: tripleRoot },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta=0,\ p=0,\ q=0` },
                  { kind: 'text', text: ' has multiplicity 3' },
                ],
              ],
            },
          ],
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const caseList = await screen.findByTestId('display-outcome-exact-case-list');
    expect(screen.queryByTestId('display-outcome-exact-branch-list')).not.toBeInTheDocument();
    await waitFor(() => {
      const rawLatex = [...caseList.querySelectorAll('[data-raw-latex]')]
        .map((node) => node.getAttribute('data-raw-latex') ?? '');
      expect(rawLatex).toContain(String.raw`x\in`);
      expect(rawLatex).toContain(positiveRoot);
      expect(rawLatex).toContain(String.raw`\Delta>0`);
      expect(rawLatex).toContain(tripleRoot);
      expect(rawLatex).toContain(String.raw`\Delta=0,\ p=0,\ q=0`);
    });

    fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
    expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied');
  });
});
