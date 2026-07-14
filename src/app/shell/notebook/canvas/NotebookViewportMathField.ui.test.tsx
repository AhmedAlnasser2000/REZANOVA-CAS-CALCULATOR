import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotebookMathFieldProvider } from '../math-field';
import { NotebookViewportMathField } from './NotebookViewportMathField';

describe('NotebookViewportMathField', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defers MathLive hydration until the authored math nears the viewport', () => {
    let reveal: () => void = () => {};
    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () => callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }

      disconnect() {}

      observe() {}
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

    render(
      <NotebookMathFieldProvider>
        <NotebookViewportMathField
          dataTestId="deferred-notebook-math"
          nodeId="math.deferred"
          onChange={vi.fn()}
          role="inline"
          selected={false}
          value="x^2"
          workspaceTarget="calculate"
        />
      </NotebookMathFieldProvider>,
    );

    expect(screen.queryByTestId('deferred-notebook-math')).not.toBeInTheDocument();
    expect(document.querySelector('[data-notebook-deferred-math="true"]')).not.toBeNull();
    act(() => reveal());
    expect(screen.getByTestId('deferred-notebook-math')).toBeInTheDocument();
  });
});
