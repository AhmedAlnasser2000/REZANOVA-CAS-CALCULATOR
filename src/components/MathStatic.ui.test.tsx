import { act, render, screen } from '@testing-library/react';
import { convertLatexToMarkup } from 'mathlive';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_ANALYSIS_DEBOUNCE_MS } from '../lib/editor/editor-analysis-runtime';
import { MathNotationProvider } from './MathNotationContext';
import { MathStatic } from './MathStatic';

vi.mock('mathlive', () => ({
  convertLatexToMarkup: vi.fn((latex: string, options: { defaultMode: string }) =>
    `<math data-mode="${options.defaultMode}">${latex}</math>`),
}));

const convertLatexToMarkupMock = vi.mocked(convertLatexToMarkup);

describe('MathStatic editor preview containment', () => {
  afterEach(() => {
    convertLatexToMarkupMock.mockClear();
    vi.useRealTimers();
  });

  it('defers preview rendering and preserves the last safe preview for huge input', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <MathNotationProvider notationMode="latex">
        <MathStatic className="preview-math" latex="x+1" emptyLabel="Preview" deferRender />
      </MathNotationProvider>,
    );

    expect(screen.getByText('Preview')).toHaveAttribute('data-editor-analysis-status', 'analyzing');

    act(() => {
      vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    });

    expect(screen.getByLabelText('x+1')).toBeInTheDocument();

    rerender(
      <MathNotationProvider notationMode="latex">
        <MathStatic className="preview-math" latex={'x'.repeat(5001)} emptyLabel="Preview" deferRender />
      </MathNotationProvider>,
    );

    expect(screen.getByLabelText('x+1')).toBeInTheDocument();
    expect(screen.getByLabelText('x+1').parentElement).toHaveAttribute(
      'data-editor-analysis-status',
      'guarded',
    );
  });

  it('does not mount raw latex before deferred rendering completes', () => {
    vi.useFakeTimers();
    const latex = String.raw`\frac{x^3+x+1}{x-m}=\sqrt{\left(\frac{x}{2}\right)^2+\left(\frac{x}{3}\right)^3}`;

    const { container } = render(
      <MathNotationProvider notationMode="latex">
        <MathStatic className="preview-math" latex={latex} emptyLabel="Deferred math" deferRender />
      </MathNotationProvider>,
    );

    expect(screen.getByText('Deferred math')).toHaveAttribute(
      'data-editor-analysis-status',
      'analyzing',
    );
    expect(container.querySelector('[data-raw-latex]')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(EDITOR_ANALYSIS_DEBOUNCE_MS);
    });

    expect(container.querySelector('[data-raw-latex]')).toHaveAttribute('data-raw-latex', latex);
  });

  it('contains internal symbolic error fragments behind a safe refresh hint', () => {
    render(
      <MathNotationProvider notationMode="latex">
        <MathStatic
          className="history-math"
          latex={'z=\\mathtip{\\error{\\blacksquare}}{\\in \\text{tuple<finite_number, any>}\\notin \\mathrm{number}}'}
        />
      </MathNotationProvider>,
    );

    const fallback = screen.getByText('\\text{Unsupported symbolic fragment. Re-run to refresh.}');
    expect(fallback).toBeInTheDocument();
    expect(fallback.getAttribute('data-raw-latex')).not.toContain('\\blacksquare');
  });

  it('renders the internal imaginary unit command as visible i while preserving raw latex', () => {
    const rawLatex = 'x+\\imaginaryI';

    render(
      <MathNotationProvider notationMode="latex">
        <MathStatic className="result-math" latex={rawLatex} />
      </MathNotationProvider>,
    );

    const rendered = screen.getByText('x+i');
    expect(rendered).toHaveAttribute('data-raw-latex', rawLatex);
  });

  it('only asks MathLive for markup in rendered notation mode', () => {
    const { rerender } = render(
      <MathNotationProvider notationMode="latex">
        <MathStatic className="result-math" latex="x+1" />
      </MathNotationProvider>,
    );
    expect(convertLatexToMarkupMock).not.toHaveBeenCalled();

    rerender(
      <MathNotationProvider notationMode="plainText">
        <MathStatic className="result-math" latex="x+1" />
      </MathNotationProvider>,
    );
    expect(convertLatexToMarkupMock).not.toHaveBeenCalled();

    rerender(
      <MathNotationProvider notationMode="rendered">
        <MathStatic className="result-math" latex="x+1" />
      </MathNotationProvider>,
    );

    expect(convertLatexToMarkupMock).toHaveBeenCalledTimes(1);
  });
});
