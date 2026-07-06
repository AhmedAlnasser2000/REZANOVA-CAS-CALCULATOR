import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisplayPanel } from './DisplayPanel';
import { expectMathStaticLatex } from '../../test/renderAppMain';
import { DEFAULT_SETTINGS } from '../../types/calculator';

describe('DisplayOutcomeShell result title', () => {
  it('hides Matrix expression titles when the editor preview already shows the same expression', () => {
    const titleLatex = String.raw`\operatorname{ls}\left(\begin{bmatrix}1&0\\0&1\\0&0\end{bmatrix},\begin{bmatrix}2\\3\\4\end{bmatrix}\right)`;

    render(
      <DisplayPanel
        activeExpressionLatex={() => titleLatex}
        activeResultCopyText={() => String.raw`x_{\mathrm{LS}}=\begin{bmatrix}2\\3\end{bmatrix}`}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={() => undefined}
        currentMode="matrix"
        displayHeaderLabel="Matrix"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: titleLatex,
          warnings: [],
          exactLatex: String.raw`x_{\mathrm{LS}}=\begin{bmatrix}2\\3\end{bmatrix}`,
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        matrixEditorLatex=""
        setMatrixEditorLatex={() => undefined}
        setVectorEditorLatex={() => undefined}
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
        vectorEditorLatex=""
      />,
    );

    expect(screen.queryByTestId('display-outcome-title')).toBeNull();
    expect(screen.getByTestId('display-outcome-exact')).toBeInTheDocument();
  });

  it('renders non-duplicate LaTeX result titles as math instead of uppercase raw text', () => {
    const titleLatex = String.raw`\operatorname{ls}\left(\begin{bmatrix}1&0\\0&1\\0&0\end{bmatrix},\begin{bmatrix}2\\3\\4\end{bmatrix}\right)`;

    render(
      <DisplayPanel
        activeExpressionLatex={() => ''}
        activeResultCopyText={() => String.raw`x_{\mathrm{LS}}=\begin{bmatrix}2\\3\end{bmatrix}`}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={() => undefined}
        currentMode="calculate"
        displayHeaderLabel="Calculate"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: titleLatex,
          warnings: [],
          exactLatex: String.raw`x_{\mathrm{LS}}=\begin{bmatrix}2\\3\end{bmatrix}`,
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        matrixEditorLatex=""
        setMatrixEditorLatex={() => undefined}
        setVectorEditorLatex={() => undefined}
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
        vectorEditorLatex=""
      />,
    );

    const title = screen.getByTestId('display-outcome-title');
    expect(title).toHaveClass('result-title--math');
    expectMathStaticLatex(title, titleLatex);
    expect(title).not.toHaveTextContent(String.raw`\OPERATORNAME`);
  });

  it('renders vector dot/cross titles as math so lowercase names stay lowercase', () => {
    render(
      <DisplayPanel
        activeExpressionLatex={() => ''}
        activeResultCopyText={() => '32'}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={() => undefined}
        currentMode="vector"
        displayHeaderLabel="Vector"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'q·v',
          warnings: [],
          exactLatex: '32',
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        matrixEditorLatex=""
        setMatrixEditorLatex={() => undefined}
        setVectorEditorLatex={() => undefined}
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
        vectorEditorLatex=""
      />,
    );

    const title = screen.getByTestId('display-outcome-title');
    expect(title).toHaveClass('result-title--math');
    expectMathStaticLatex(title, 'q·v');
    expect(title).not.toHaveTextContent('Q·V');
  });

  it('renders vector operation titles with function notation as math', () => {
    render(
      <DisplayPanel
        activeExpressionLatex={() => ''}
        activeResultCopyText={() => '2'}
        activeResultEditorLatex={() => ''}
        calculateLatex=""
        copyText={() => undefined}
        currentMode="vector"
        displayHeaderLabel="Vector"
        displayResultBadges={[]}
        displayOutcome={{
          kind: 'success',
          title: 'triple(p,q,r)',
          warnings: [],
          exactLatex: '2',
        }}
        getPeriodicStopReasonText={(reason: string) => reason}
        hydrated
        matrixEditorLatex=""
        setMatrixEditorLatex={() => undefined}
        setVectorEditorLatex={() => undefined}
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
        vectorEditorLatex=""
      />,
    );

    const title = screen.getByTestId('display-outcome-title');
    expect(title).toHaveClass('result-title--math');
    expectMathStaticLatex(title, 'triple(p,q,r)');
  });
});
