import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailLineContent } from './DetailLineContent';

describe('DetailLineContent', () => {
  it('gives typed parts precedence over an explicit line kind', () => {
    const { container } = render(
      <DetailLineContent
        line="Generated equation: x=1"
        lineKind="math"
        parts={[
          { kind: 'text', text: 'Root: ' },
          { kind: 'math', latex: 'x=2' },
        ]}
        symbolicDisplayPrefs={undefined}
      />,
    );

    expect(container).toHaveTextContent('Root:');
    expect(container.querySelector('[data-raw-latex]')).toHaveAttribute('data-raw-latex', 'x=2');
  });

  it('lets explicit prose block legacy math inference', () => {
    const { container } = render(
      <DetailLineContent
        line="Generated equation: x=1"
        lineKind="text"
        symbolicDisplayPrefs={undefined}
      />,
    );

    expect(container).toHaveTextContent('Generated equation: x = 1');
    expect(container.querySelector('[data-raw-latex]')).toBeNull();
  });

  it('keeps inference only as an undeclared compatibility fallback', () => {
    const { container } = render(
      <DetailLineContent
        line="Generated equation: x=1"
        symbolicDisplayPrefs={undefined}
      />,
    );

    expect(container).toHaveTextContent('Generated equation:');
    expect(container.querySelector('[data-raw-latex]')).toHaveAttribute('data-raw-latex', 'x=1');
  });
});
