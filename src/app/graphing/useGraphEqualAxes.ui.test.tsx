import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import type { GraphViewportV1 } from '../../lib/graphing';
import { isSquareGraphViewport } from './graph-equal-axes';
import { useGraphEqualAxes } from './useGraphEqualAxes';

const start: GraphViewportV1 = { coordinateSystem: 'cartesian', xMin: -10, xMax: 10, yMin: -6, yMax: 6 };

function setup() {
  let commits = 0;
  const rendered = renderHook(() => {
    const [viewport, setViewportState] = useState(start);
    const axes = useGraphEqualAxes({ viewport, setViewport: (next) => { commits += 1; setViewportState(next); } });
    return { ...axes, viewport };
  });
  return { rendered, commits: () => commits };
}

describe('useGraphEqualAxes', () => {
  it('leaves the viewport alone until a pane has been measured', () => {
    const { rendered, commits } = setup();
    expect(rendered.result.current.viewport).toEqual(start);
    expect(commits()).toBe(0);
  });

  it('squares once when a pane reports its size, then settles', () => {
    const { rendered, commits } = setup();
    act(() => rendered.result.current.reportSize({ width: 900, height: 500 }));
    expect(isSquareGraphViewport(rendered.result.current.viewport, { width: 900, height: 500 })).toBe(true);
    expect(commits()).toBe(1);
    act(() => rendered.result.current.reportSize({ width: 900, height: 500 }));
    expect(commits()).toBe(1);
  });

  it('re-squares after a resize and stops when Equal axes is switched off', () => {
    const { rendered, commits } = setup();
    act(() => rendered.result.current.reportSize({ width: 900, height: 500 }));
    act(() => rendered.result.current.reportSize({ width: 600, height: 500 }));
    expect(isSquareGraphViewport(rendered.result.current.viewport, { width: 600, height: 500 })).toBe(true);
    expect(commits()).toBe(2);
    act(() => rendered.result.current.setEqualAxes(false));
    act(() => rendered.result.current.reportSize({ width: 1400, height: 500 }));
    expect(commits()).toBe(2);
  });
});
