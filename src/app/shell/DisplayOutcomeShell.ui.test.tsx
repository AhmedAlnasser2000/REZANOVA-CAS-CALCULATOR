import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DisplayPanel } from './DisplayPanel';
import { expectMathStaticLatex } from '../../test/renderAppMain';
import { DEFAULT_SETTINGS } from '../../types/calculator';

describe('DisplayOutcomeShell result title', () => {
  it('renders LaTeX result titles as math instead of uppercase raw text', () => {
    const titleLatex = String.raw`\operatorname{ls}\left(\begin{bmatrix}1&0\\0&1\\0&0\end{bmatrix},\begin{bmatrix}2\\3\\4\end{bmatrix}\right)`;

    render(
      <DisplayPanel
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
        settings={{
          ...DEFAULT_SETTINGS,
          outputStyle: 'exact',
        }}
        symbolicDisplayPrefs={DEFAULT_SETTINGS}
      />,
    );

    const title = screen.getByTestId('display-outcome-title');
    expect(title).toHaveClass('result-title--math');
    expectMathStaticLatex(title, titleLatex);
    expect(title).not.toHaveTextContent(String.raw`\OPERATORNAME`);
  });
});
