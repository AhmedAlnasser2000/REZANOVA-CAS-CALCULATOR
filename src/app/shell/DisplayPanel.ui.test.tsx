import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanonicalDisplayPanel as DisplayPanel } from '../../test-utils/CanonicalDisplayPanel';
import { expectMathStaticLatex } from '../../test/renderAppMain';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import { getEquationAlgebraActionLabel } from '../../lib/modes/equation';

async function waitForDisplayQueueToSettle() {
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

describe('DisplayPanel result shell', () => {
  it('renders Equation algebra tray actions supplied by the runtime', () => {
    const runEquationAlgebraTransformAction = vi.fn();

    render(
      <DisplayPanel
        activeAlgebraTransforms={['combineFractions', 'useStoredValues']}
        activeResultCopyText={() => ''}
        activeResultEditorLatex={() => ''}
        copyText={() => undefined}
        currentMode="equation"
        displayHeaderLabel="Equation"
        displayResultBadges={[]}
        getAlgebraTransformLabel={getEquationAlgebraActionLabel}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        runEquationAlgebraTransformAction={runEquationAlgebraTransformAction}
        settings={DEFAULT_SETTINGS}
        shouldShowEquationAlgebraTray
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const action = screen.getByTestId('algebra-transform-combineFractions');
    expect(action).toHaveTextContent('Combine Fractions');
    expect(screen.getByTestId('algebra-transform-useStoredValues')).toHaveTextContent('Use Stored Values');

    fireEvent.click(action);
    expect(runEquationAlgebraTransformAction).toHaveBeenCalledWith('combineFractions');

    fireEvent.click(screen.getByTestId('algebra-transform-useStoredValues'));
    expect(runEquationAlgebraTransformAction).toHaveBeenCalledWith('useStoredValues');
  });

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

  it('collapses top-level solve notes by default', () => {
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
          solveSummaryParts: [[{ kind: 'text', text: 'Composition branch: reduced carrier; Periodic family: generated branches.' }]],
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        settings={DEFAULT_SETTINGS}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const solveNote = screen.getByTestId('display-outcome-solve-summary') as HTMLDetailsElement;
    expect(solveNote.tagName.toLowerCase()).toBe('details');
    expect(solveNote.open).toBe(false);
    expect(within(solveNote).getByText('Solve Note')).toBeInTheDocument();
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
    expect(copyText).toHaveBeenCalledWith(copyLatex, 'Result copied', 'display');

    fireEvent.click(within(validWhen).getByRole('button', { name: /show full result/i }));
    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-supplement-0'),
      validWhenLatex[0],
    ));
  });

  it('stacks comma-separated valid-when facts as separate math rows', async () => {
    const copyText = vi.fn();

    render(
      <DisplayPanel
        activeExpressionLatex=""
        activeResultCopyText={() => 'x'}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={copyText}
        currentMode="calculus"
        displayHeaderLabel="Calculus"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'Indefinite Integral',
          warnings: [],
          exactLatex: 'x',
          exactSupplementLatex: ['\\text{Conditions: } cn\\ne0, p+1\\ne0'],
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
    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-supplement-0'),
      'c\\,n\\ne0',
    ));
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-1'), 'p+1\\ne0');
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
          resultOrigin: 'symbolic',
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
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('Exact roots · 5 roots');
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact-branch-3'), /s=/);
    expect(screen.queryByTestId('display-outcome-exact-branch-4')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /show remaining branches/i }));
    await waitFor(() => expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact-branch-4'),
      's=z',
    ));

    fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
    expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied', 'display');
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
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('2 guarded rows');
    expect(screen.queryByTestId('display-outcome-exact-branch-list')).not.toBeInTheDocument();
    expect(caseList).toHaveTextContent(/when/i);
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
    expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied', 'display');
  });

  it('renders grouped wrapper formula cases with scoped labels while preserving copy latex', async () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\sqrt{b}\\\Delta>0}\\z_2,&\substack{z^3+z+1=-\sqrt{b}\\\Delta>0}\end{cases}`;
    const copyText = vi.fn();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    window.cancelAnimationFrame = vi.fn();

    try {
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
            exactSupplementLatex: [String.raw`b\ge0`],
            detailSections: [
              {
                title: 'Square-Power Formula Cases',
                lines: [
                  String.raw`z^3+z+1=\sqrt{b}: z_1, \Delta>0`,
                  String.raw`z^3+z+1=-\sqrt{b}: z_2, \Delta>0`,
                ],
                lineParts: [
                  [
                    { kind: 'math', latex: String.raw`z^3+z+1=\sqrt{b}` },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: 'z_1' },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: String.raw`\Delta>0` },
                  ],
                  [
                    { kind: 'math', latex: String.raw`z^3+z+1=-\sqrt{b}` },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: 'z_2' },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: String.raw`\Delta>0` },
                  ],
                ],
              },
              {
                title: 'Square-Power Branch 1 - Real Cardano Definitions',
                lines: [String.raw`A=0`],
                lineKind: 'math',
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

      const compactPreview = await screen.findByTestId('display-outcome-exact-compact-preview');
      expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('2 branch families');
      expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('2 guarded rows');
      expect(compactPreview).toHaveTextContent('Formula cases paused for responsiveness');
      expect(compactPreview).toHaveTextContent('2 guarded case rows across 2 generated branches');
      expect(compactPreview.querySelector('.result-large-preview-snippet')).toBeNull();
      expect(screen.queryByTestId('display-outcome-exact-case-list')).not.toBeInTheDocument();
      expect([
        ...screen.getByTestId('display-outcome-exact').querySelectorAll('[data-raw-latex]'),
      ]).toHaveLength(0);

      fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
      expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied', 'display');

      fireEvent.click(screen.getByRole('button', { name: 'Show full formula cases' }));

      const caseList = await screen.findByTestId('display-outcome-exact-case-list');
      expect(screen.getByTestId('display-outcome-exact-case-render-progress'))
        .toHaveTextContent('Rendering formula cases 0/2');
      expect(caseList.querySelector('[data-raw-latex]')).toBeNull();

      await act(async () => {
        frameCallbacks.shift()?.(performance.now());
      });
      await waitFor(() => {
        expect(screen.getByTestId('display-outcome-exact-case-render-progress'))
          .toHaveTextContent('Rendering formula cases 1/2');
      });

      await act(async () => {
        frameCallbacks.shift()?.(performance.now());
      });
      await waitFor(() => {
        expect(screen.queryByTestId('display-outcome-exact-case-render-progress'))
          .not.toBeInTheDocument();
      });
      expect(caseList).toHaveTextContent(/when/i);
      await waitFor(() => {
        const rawLatex = [...caseList.querySelectorAll('[data-raw-latex]')]
          .map((node) => node.getAttribute('data-raw-latex') ?? '');
        expect(rawLatex).toContain(String.raw`z\in`);
        expect(rawLatex).toContain(String.raw`z^3+z+1=\sqrt{b}`);
        expect(rawLatex).toContain('z_1');
        expect(rawLatex).toContain(String.raw`z^3+z+1=-\sqrt{b}`);
        expect(rawLatex).toContain('z_2');
        expect(rawLatex).toContain(String.raw`\Delta>0`);
      });
      expect(screen.getByTestId('display-outcome-exact-case-group-0')).toBeInTheDocument();
      expect(screen.getByTestId('display-outcome-exact-case-group-1')).toBeInTheDocument();
      await waitForDisplayQueueToSettle();
      expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), String.raw`b\ge0`);

      fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
      expect(copyText).toHaveBeenCalledTimes(2);
      expect(copyText).toHaveBeenLastCalledWith(exactLatex, 'Result copied', 'display');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('opens heavy formula cases in a Formula Viewer artifact from the compact source card', async () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\sqrt{b}\\\Delta>0}\\z_2,&\substack{z^3+z+1=-\sqrt{b}\\\Delta>0}\end{cases}`;
    const copyText = vi.fn();
    const openFormulaViewer = vi.fn();

    render(
      <DisplayPanel
        activeExpressionLatex={() => String.raw`(z^3+z+1)^2=b`}
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
          exactSupplementLatex: [String.raw`b\ge0`],
          resolvedInputLatex: String.raw`(z^3+z+1)^2=b`,
          detailSections: [
            {
              title: 'Square-Power Formula Cases',
              lines: [
                String.raw`z^3+z+1=\sqrt{b}: z_1, \Delta>0`,
                String.raw`z^3+z+1=-\sqrt{b}: z_2, \Delta>0`,
              ],
              lineParts: [
                [
                  { kind: 'math', latex: String.raw`z^3+z+1=\sqrt{b}` },
                  { kind: 'text', text: ': ' },
                  { kind: 'math', latex: 'z_1' },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta>0` },
                ],
                [
                  { kind: 'math', latex: String.raw`z^3+z+1=-\sqrt{b}` },
                  { kind: 'text', text: ': ' },
                  { kind: 'math', latex: 'z_2' },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta>0` },
                ],
              ],
            },
          ],
        }}
        formulaViewerSourceContext={{
          sourceWorkspaceInstanceId: 'equation.1',
          sourceWorkspaceKind: 'equation',
          sourceWorkspaceTitle: 'Equation',
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        onOpenFormulaViewer={openFormulaViewer}
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const compactPreview = await screen.findByTestId('display-outcome-exact-compact-preview');
    expect(compactPreview).toHaveTextContent('Formula cases paused for responsiveness');
    expect(screen.queryByRole('button', { name: 'Show full formula cases' })).not.toBeInTheDocument();
    expect(compactPreview.querySelector('[data-raw-latex]')).toBeNull();

    fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
    expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied', 'display');

    fireEvent.click(within(compactPreview).getByRole('button', { name: 'Open Formula Viewer' }));

    expect(openFormulaViewer).toHaveBeenCalledTimes(1);
    const artifact = openFormulaViewer.mock.calls[0]?.[0];
    expect(artifact).toMatchObject({
      kind: 'formula-viewer-artifact',
      copyLatex: exactLatex,
      resultTitle: 'Symbolic',
      rowCount: 2,
      groupCount: 2,
      countSummary: {
        branchFamilyCount: 2,
        guardedRowCount: 2,
        kind: 'branchFamilies',
        text: '2 branch families · 2 guarded rows',
      },
      sourceExpressionLatex: String.raw`(z^3+z+1)^2=b`,
      sourceWorkspaceInstanceId: 'equation.1',
      sourceWorkspaceKind: 'equation',
      sourceWorkspaceTitle: 'Equation',
    });
    expect(artifact.primaryBlock).toMatchObject({
      kind: 'answer',
      renderKind: 'caseMath',
    });
    expect(artifact.globalFactBlocks.map((block: { kind: string }) => block.kind))
      .toContain('validWhen');
    expect(artifact.detailBlocks.map((block: { label: string }) => block.label))
      .toContain('Square-Power Formula Cases');
  });

  it('keeps over-budget formula rows as opt-in placeholders after expansion', async () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{\frac{z^3+z+1}{z-m}=\arcsin(b)+2\pi n\\\Delta>0}\\z_2,&\substack{\frac{z^3+z+1}{z-m}=\pi-\arcsin(b)+2\pi n\\\Delta>0}\end{cases}`;
    const groupOne = String.raw`\frac{z^3+z+1}{z-m}=\arcsin(b)+2\pi n`;
    const groupTwo = String.raw`\frac{z^3+z+1}{z-m}=\pi-\arcsin(b)+2\pi n`;
    const giantValue = String.raw`\left\{\sqrt[3]{-\frac{2\pi mn+m\arcsin(b)+1}{2}+\sqrt{\left(\frac{2\pi mn+m\arcsin(b)+1}{2}\right)^2+\left(\frac{-2\pi n-\arcsin(b)+1}{3}\right)^3}}+\sqrt[3]{-\frac{2\pi mn+m\arcsin(b)+1}{2}-\sqrt{\left(\frac{2\pi mn+m\arcsin(b)+1}{2}\right)^2+\left(\frac{-2\pi n-\arcsin(b)+1}{3}\right)^3}}\right\}`;
    const giantCondition = String.raw`\Delta<0,\ P<0,\ t=2\sqrt{-\frac{P}{3}}\cos\left(\frac{1}{3}\arccos\left(\frac{3Q}{2P}\sqrt{-\frac{3}{P}}\right)-\frac{2\pi k}{3}\right),\ k=0,1,2`;
    const copyText = vi.fn();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    window.cancelAnimationFrame = vi.fn();

    try {
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
                title: 'Trig Formula Cases',
                lines: [
                  `${groupOne}: ${giantValue}, ${giantCondition}`,
                  `${groupTwo}: ${giantValue}, ${giantCondition}`,
                ],
                lineParts: [
                  [
                    { kind: 'math', latex: groupOne },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: giantValue },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: giantCondition },
                  ],
                  [
                    { kind: 'math', latex: groupTwo },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: giantValue },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: giantCondition },
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

      const compactPreview = await screen.findByTestId('display-outcome-exact-compact-preview');
      expect(compactPreview).toHaveTextContent('Formula cases paused for responsiveness');
      expect(compactPreview.querySelector('[data-raw-latex]')).toBeNull();

      await waitForDisplayQueueToSettle();
      const detailSection = await screen.findByTestId('display-outcome-detail-section-0');
      fireEvent.click(within(detailSection).getByText('Trig Formula Cases'));
      const detailCompactPreview =
        await screen.findByTestId('display-outcome-detail-section-0-compact-preview');
      expect(detailCompactPreview).toHaveTextContent('Formula cases paused for responsiveness');
      expect(detailCompactPreview.querySelector('[data-raw-latex]')).toBeNull();
      expect(detailSection.querySelector('[data-raw-latex]')).toBeNull();

      fireEvent.click(within(compactPreview).getByRole('button', { name: 'Show full formula cases' }));
      const caseList = await screen.findByTestId('display-outcome-exact-case-list');
      await act(async () => {
        frameCallbacks.shift()?.(performance.now());
      });

      const pausedRow = await screen.findByTestId('display-outcome-exact-case-0-paused');
      expect(pausedRow).toHaveTextContent('Formula row paused for responsiveness');
      expect(caseList.querySelector('[data-raw-latex]')).toBeNull();

      fireEvent.click(within(pausedRow).getByRole('button', { name: 'Show formula row' }));
      await waitFor(() => {
        const rawLatex = [...caseList.querySelectorAll('[data-raw-latex]')]
          .map((node) => node.getAttribute('data-raw-latex') ?? '');
        expect(rawLatex).toContain(groupOne);
        expect(rawLatex).toContain(giantValue);
        expect(rawLatex).toContain(giantCondition);
        expect(rawLatex).not.toContain(groupTwo);
      });

      fireEvent.click(screen.getByTestId('display-outcome-action-copy-result'));
      expect(copyText).toHaveBeenCalledWith(exactLatex, 'Result copied', 'display');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('hides redundant grouped wrapper labels for exact-zero case answers', async () => {
    const exactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=0\\\Delta>0}\\z_2,&\substack{z^3+z+1=0\\\Delta=0}\end{cases}`;

    render(
      <DisplayPanel
        activeExpressionLatex=""
        activeResultCopyText={() => exactLatex}
        activeResultEditorLatex={() => exactLatex}
        calculateLatex=""
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
              title: 'Absolute-Value Formula Cases',
              lines: [
                String.raw`z^3+z+1=0: z_1, \Delta>0`,
                String.raw`z^3+z+1=0: z_2, \Delta=0`,
              ],
              lineParts: [
                [
                  { kind: 'math', latex: String.raw`z^3+z+1=0` },
                  { kind: 'text', text: ': ' },
                  { kind: 'math', latex: 'z_1' },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta>0` },
                ],
                [
                  { kind: 'math', latex: String.raw`z^3+z+1=0` },
                  { kind: 'text', text: ': ' },
                  { kind: 'math', latex: 'z_2' },
                  { kind: 'text', text: ', ' },
                  { kind: 'math', latex: String.raw`\Delta=0` },
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
    expect(caseList).toHaveTextContent(/when/i);
    await waitFor(() => {
      const rawLatex = [...caseList.querySelectorAll('[data-raw-latex]')]
        .map((node) => node.getAttribute('data-raw-latex') ?? '');
      expect(rawLatex).toContain(String.raw`z\in`);
      expect(rawLatex).toContain('z_1');
      expect(rawLatex).toContain('z_2');
      expect(rawLatex).toContain(String.raw`\Delta>0`);
      expect(rawLatex).toContain(String.raw`\Delta=0`);
    });
    expect(screen.queryByTestId(/display-outcome-exact-case-group-/)).not.toBeInTheDocument();
  });

  it('cancels pending formula row rendering when a new result replaces the answer', async () => {
    const heavyExactLatex = String.raw`z\in\begin{cases}z_1,&\substack{z^3+z+1=\sqrt{b}\\\Delta>0}\\z_2,&\substack{z^3+z+1=-\sqrt{b}\\\Delta>0}\end{cases}`;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const frameCallbacks: FrameRequestCallback[] = [];

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    window.cancelAnimationFrame = vi.fn();

    const baseProps = {
      activeExpressionLatex: '',
      activeResultEditorLatex: () => '',
      calculateLatex: '',
      currentMode: 'equation' as const,
      displayHeaderLabel: 'Equation',
      displayResultBadges: [],
      getPeriodicStopReasonText: (reason: string) => reason,
      hydrated: true,
      settings: {
        ...DEFAULT_SETTINGS,
        outputStyle: 'exact' as const,
      },
      symbolicDisplayPrefs: DEFAULT_SETTINGS,
    };

    try {
      const view = render(
        <DisplayPanel
          {...baseProps}
          activeResultCopyText={() => heavyExactLatex}
          displayOutcome={{
            kind: 'success',
            title: 'Symbolic',
            warnings: [],
            exactLatex: heavyExactLatex,
            detailSections: [
              {
                title: 'Square-Power Formula Cases',
                lines: [
                  String.raw`z^3+z+1=\sqrt{b}: z_1, \Delta>0`,
                  String.raw`z^3+z+1=-\sqrt{b}: z_2, \Delta>0`,
                ],
                lineParts: [
                  [
                    { kind: 'math', latex: String.raw`z^3+z+1=\sqrt{b}` },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: 'z_1' },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: String.raw`\Delta>0` },
                  ],
                  [
                    { kind: 'math', latex: String.raw`z^3+z+1=-\sqrt{b}` },
                    { kind: 'text', text: ': ' },
                    { kind: 'math', latex: 'z_2' },
                    { kind: 'text', text: ', ' },
                    { kind: 'math', latex: String.raw`\Delta>0` },
                  ],
                ],
              },
            ],
          }}
        />,
      );

      await screen.findByTestId('display-outcome-exact-compact-preview');
      fireEvent.click(screen.getByRole('button', { name: 'Show full formula cases' }));
      expect(await screen.findByTestId('display-outcome-exact-case-render-progress'))
        .toHaveTextContent('Rendering formula cases 0/2');

      view.rerender(
        <DisplayPanel
          {...baseProps}
          activeResultCopyText={() => 'y=1'}
          displayOutcome={{
            kind: 'success',
            title: 'Symbolic',
            warnings: [],
            exactLatex: 'y=1',
          }}
        />,
      );

      await act(async () => {
        frameCallbacks.splice(0).forEach((callback) => callback(performance.now()));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('display-outcome-exact-case-list')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('display-outcome-exact')).not.toHaveTextContent('z_1');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
