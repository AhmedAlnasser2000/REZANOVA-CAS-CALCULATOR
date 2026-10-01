import { describe, expect, it } from 'vitest';
import type { GraphDocumentV4 } from '../../../lib/graphing';
import { ptxNextDot, ptxRealRefiners, ptxRealTraceBadge, ptxRealTraceText, ptxRefineRealTrace } from './ptx-real-trace';
import type { PtxDot } from './usePtxPointsOfInterest';

const expression = (mathJson: unknown, freeSymbols: string[]) => ({ mathJson, freeSymbols });
const document = { items: [
  { kind: 'relation', itemId: 'sine', visible: true, relation: { kind: 'explicit-y', rhs: expression(['Sin', 'x'], ['x']) } },
  { kind: 'relation', itemId: 'circle', visible: true, relation: { kind: 'implicit-equality',
    left: expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y']), right: expression(9, []) } },
  { kind: 'relation', itemId: 'disc', visible: true, source: { sourceLatex: String.raw`x^2+y^2\le9` }, relation: { kind: 'inequality', operator: '<=',
    left: expression(['Add', ['Power', 'x', 2], ['Power', 'y', 2]], ['x', 'y']), right: expression(9, []) } },
] } as unknown as GraphDocumentV4;
const viewport = { coordinateSystem: 'cartesian' as const, xMin: -10, xMax: 10, yMin: -6, yMax: 6 };
const size = { width: 1000, height: 600 };
const dot: PtxDot = { key: 'd', plane: 'real', feature: 'extremum', itemIds: ['sine'], x: Math.PI / 2, y: 1, level: 'numeric-validated', errorBound: 1e-8 };

describe('PTX Real tracing', () => {
  const refiners = ptxRealRefiners(document, {});

  it('reads explicit curves exactly at the pointer, not from the sampled polyline', () => {
    const point = ptxRefineRealTrace(refiners.get('sine'), 'sine', { x: 0.7, y: 0.64 }, viewport, size, []);
    expect(point.y).toBe(Math.sin(0.7));
    expect(ptxRealTraceText(point)).toBe(`(0.7, ${Number(Math.sin(0.7).toPrecision(6))})`);
  });

  it('projects implicit curves onto the true curve', () => {
    const point = ptxRefineRealTrace(refiners.get('circle'), 'circle', { x: 2.12, y: 2.13 }, viewport, size, []);
    expect(Math.abs(Math.hypot(point.x, point.y) - 3)).toBeLessThan(1e-10);
  });

  it('puts a region trace on its boundary curve', () => {
    const point = ptxRefineRealTrace(refiners.get('disc'), 'disc', { x: 3.004, y: 1e-15 }, viewport, size, [], undefined, undefined, 'disc:boundary:0');
    expect(Math.abs(Math.hypot(point.x, point.y) - 3)).toBeLessThan(1e-10);
    // The edge says which condition it belongs to and whether its points are in the region (PTX3).
    expect(ptxRealTraceText(point)).toBe('(3, 0) · edge of x² + y² ≤ 9, included');
  });

  it('snaps to a dot only on arrival and names it', () => {
    const on = ptxRefineRealTrace(refiners.get('sine'), 'sine', { x: Math.PI / 2 + 0.05, y: 1 }, viewport, size, [dot]);
    expect(ptxRealTraceText(on)).toBe('Extremum (1.5708, 1)');
    const off = ptxRefineRealTrace(refiners.get('sine'), 'sine', { x: Math.PI / 2 + 0.2, y: 1 }, viewport, size, [dot]);
    expect(off.dot).toBeNull();
  });

  it('keeps unrefined items honest and finds the next dot for Shift+Arrow', () => {
    const sampled = ptxRefineRealTrace(undefined, 'piecewise', { x: 4.00012, y: 2.00003 }, viewport, size, []);
    expect(ptxRealTraceText(sampled)).toBe('(4.00012, 2.00003)');
    expect(ptxRealTraceBadge(sampled)).toEqual({ badge: 'numeric', detail: 'Numeric: read from the drawn curve, not refined yet' });
    expect(ptxNextDot([dot], 'sine', 0, 1)?.key).toBe('d');
    expect(ptxNextDot([dot], 'sine', 2, 1)).toBeNull();
    expect(ptxNextDot([dot], 'sine', 2, -1)?.key).toBe('d');
  });
});
