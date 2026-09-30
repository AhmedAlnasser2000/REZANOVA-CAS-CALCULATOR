import { describe, expect, it } from 'vitest';
import type { GraphDocumentV4 } from '../../../lib/graphing';
import {
  ptxAcquireLocus,
  ptxComplexLociFrom,
  ptxComplexReadout,
  ptxComplexTracePoint,
  ptxNearBranchCut,
  ptxStepComplexTrace,
  ptxSweepLocus,
  type PtxComplexTrace,
} from './ptx-complex-trace';
import { ptxSnapOnArrival } from './ptx-snap';
import type { PtxDot } from './usePtxPointsOfInterest';

const side = (mathJson: unknown) => ({ mathJson, freeSymbols: ['z'] });
const document = {
  items: [{
    kind: 'relation', itemId: 'circle', visible: true,
    relation: { kind: 'complex-locus', clauses: [{ left: side(['Abs', ['Add', 'z', -1]]), operator: '=', right: side(2) }] },
  }],
} as unknown as GraphDocumentV4;
const units = { x: 0.02, y: 0.02 };
const live = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 };
const toScreen = (x: number, y: number) => ({ x: (x - live.xMin) / units.x, y: (live.yMax - y) / units.y });
const onCircle = (point: { x: number; y: number }) => Math.abs(Math.hypot(point.x - 1, point.y) - 2);

describe('PTX Complex tracing', () => {
  const loci = ptxComplexLociFrom(document, {});

  it('picks a locus only when the click is within a few pixels of it', () => {
    const trace = ptxAcquireLocus(loci, { x: 3.05, y: 0.1 }, units, [], toScreen);
    expect(trace?.kind).toBe('locus');
    expect(onCircle(ptxComplexTracePoint(trace!))).toBeLessThan(1e-10);
    expect(ptxAcquireLocus(loci, { x: 3.5, y: 0.1 }, units, [], toScreen)).toBeNull();
  });

  it('sweeps along the true curve and steps with the arrow keys', () => {
    const trace = ptxAcquireLocus(loci, { x: 3, y: 0.05 }, units, [], toScreen) as Extract<PtxComplexTrace, { kind: 'locus' }>;
    const swept = ptxSweepLocus(trace, loci, { x: 1.3, y: 2.6 }, units, [], toScreen);
    expect(onCircle(ptxComplexTracePoint(swept))).toBeLessThan(1e-10);
    expect(ptxComplexTracePoint(swept).y).toBeGreaterThan(1.9);
    const stepped = ptxStepComplexTrace(swept, 1, loci, units, [], toScreen);
    expect(onCircle(ptxComplexTracePoint(stepped))).toBeLessThan(1e-10);
    expect(ptxComplexTracePoint(stepped)).not.toEqual(ptxComplexTracePoint(swept));
  });

  it('snaps to a dot only on arrival and releases it when moving on', () => {
    const dot: PtxDot = { key: 'i', plane: 'complex', feature: 'intersection', itemIds: ['circle', 'other'], x: 1, y: 2, level: 'sampled-estimate', errorBound: 1e-9 };
    const trace = ptxAcquireLocus(loci, { x: 1, y: 1.98 }, units, [dot], toScreen)!;
    expect(trace.kind === 'locus' && trace.snapped?.key).toBe('i');
    expect(ptxComplexReadout(trace).lines[0]).toBe('Intersection · z = 1 + 2i');
    const away = ptxSweepLocus(trace as Extract<PtxComplexTrace, { kind: 'locus' }>, loci, { x: 2.4, y: 1.5 }, units, [dot], toScreen);
    expect(away.kind === 'locus' && away.snapped).toBeNull();
    // Nine pixels from the dot is not arrival.
    expect(ptxSnapOnArrival({ x: 1.18, y: 2 }, [dot], toScreen, 'circle')).toBeNull();
  });

  it('reads out z with honest digits, the polar form and a badge level', () => {
    const trace = ptxAcquireLocus(loci, { x: 3.01, y: 0 }, units, [], toScreen)!;
    const readout = ptxComplexReadout(trace);
    expect(readout.lines[0]).toBe('z = 3');
    expect(readout.lines[1]).toMatch(/^\|z\| = 3 · arg z = 0$/u);
    expect(readout.level).toBe('numeric-validated');
    expect(readout.detail).toContain('Verified');
  });

  it('steps through root points and flags probes near a branch cut', () => {
    const roots = [{ re: 1, im: 0, exact: true, label: '1', multiplicity: 1 }, { re: -0.5, im: 0.866, exact: true, label: 'e^(2πi/3)', multiplicity: 1 }];
    const trace: PtxComplexTrace = { kind: 'root', itemId: 'r', roots, index: 0 };
    const next = ptxStepComplexTrace(trace, 1, loci, units, [], toScreen);
    expect(ptxComplexReadout(next).lines).toEqual(['z = e^(2πi/3)', 'root 2 of 2']);
    expect(ptxComplexReadout(next).level).toBe('exact-proved');
    const cut = [{ from: { re: 0, im: 0 }, to: { re: -4, im: 0 } }];
    expect(ptxNearBranchCut({ x: -2, y: 0.05 }, cut, toScreen)).toBe(true);
    expect(ptxNearBranchCut({ x: -2, y: 0.5 }, cut, toScreen)).toBe(false);
  });
});
