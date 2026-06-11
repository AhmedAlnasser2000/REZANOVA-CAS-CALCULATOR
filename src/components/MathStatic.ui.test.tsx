import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_ANALYSIS_DEBOUNCE_MS } from '../lib/editor/editor-analysis-runtime';
import { MathNotationProvider } from './MathNotationContext';
import { MathStatic } from './MathStatic';

describe('MathStatic editor preview containment', () => {
  afterEach(() => {
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
});
