import { describe, expect, it } from 'vitest';
import { parseGeometryDraft } from './parser';
import { serializeGeometryRequest } from './serializer';

describe('geometry parser', () => {
  it('parses structured square drafts with scalar math intact', () => {
    expect(parseGeometryDraft('square(side=2+3)')).toEqual({
      ok: true,
      request: {
        kind: 'square',
        sideLatex: '2+3',
      },
      style: 'structured',
    });
  });

  it('parses structured 3D and triangle drafts through the shared core syntax', () => {
    expect(parseGeometryDraft('cube(side=3)')).toEqual({
      ok: true,
      request: {
        kind: 'cube',
        sideLatex: '3',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('triangleHeron(a=5, b=6, c=7)')).toEqual({
      ok: true,
      request: {
        kind: 'triangleHeron',
        aLatex: '5',
        bLatex: '6',
        cLatex: '7',
      },
      style: 'structured',
    });
  });

  it('parses shorthand rectangle drafts on 2D screens', () => {
    expect(parseGeometryDraft('w=8, h=5', { screenHint: 'shapes2dHome' })).toEqual({
      ok: true,
      request: {
        kind: 'rectangle',
        widthLatex: '8',
        heightLatex: '5',
      },
      style: 'shorthand',
    });
  });

  it('uses the current coordinate tool to disambiguate point shorthand', () => {
    expect(parseGeometryDraft('P_1=(0,0), P_2=(3,4)', { screenHint: 'distance' })).toEqual({
      ok: true,
      request: {
        kind: 'distance',
        p1: { xLatex: '0', yLatex: '0' },
        p2: { xLatex: '3', yLatex: '4' },
      },
      style: 'shorthand',
    });
  });

  it('supports leaf-level shorthand for 3D solids and triangles', () => {
    expect(parseGeometryDraft('s=4', { screenHint: 'cube' })).toEqual({
      ok: true,
      request: {
        kind: 'cube',
        sideLatex: '4',
      },
      style: 'shorthand',
    });

    expect(parseGeometryDraft('r=3, l=5', { screenHint: 'cone' })).toEqual({
      ok: true,
      request: {
        kind: 'cone',
        radiusLatex: '3',
        slantHeightLatex: '5',
      },
      style: 'shorthand',
    });

    expect(parseGeometryDraft('a=5, b=6, c=7', { screenHint: 'triangleHeron' })).toEqual({
      ok: true,
      request: {
        kind: 'triangleHeron',
        aLatex: '5',
        bLatex: '6',
        cLatex: '7',
      },
      style: 'shorthand',
    });
  });

  it('uses family-home shorthand rules for triangles', () => {
    expect(parseGeometryDraft('b=10, h=6', { screenHint: 'triangleHome' })).toEqual({
      ok: true,
      request: {
        kind: 'triangleArea',
        baseLatex: '10',
        heightLatex: '6',
      },
      style: 'shorthand',
    });

    expect(parseGeometryDraft('a=5, b=6, c=7', { screenHint: 'triangleHome' })).toEqual({
      ok: true,
      request: {
        kind: 'triangleHeron',
        aLatex: '5',
        bLatex: '6',
        cLatex: '7',
      },
      style: 'shorthand',
    });
  });

  it('rejects ambiguous 3D shorthand on the family screen', () => {
    const result = parseGeometryDraft('r=3, h=8', { screenHint: 'shapes3dHome' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('cylinder');
      expect(result.error).toContain('cone');
    }
  });

  it('parses structured solve-missing requests with one unknown marker', () => {
    expect(parseGeometryDraft('square(side=?, area=25)', { screenHint: 'square' })).toEqual({
      ok: true,
      request: {
        kind: 'squareSolveMissing',
        sideLatex: '?',
        areaLatex: '25',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('distance(p1=(0,0), p2=(3,?), distance=5)', { screenHint: 'distance' })).toEqual({
      ok: true,
      request: {
        kind: 'distanceSolveMissing',
        p1: { xLatex: '0', yLatex: '0' },
        p2: { xLatex: '3', yLatex: '?' },
        distanceLatex: '5',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('circle(radius=?, circumference=10*pi)', { screenHint: 'circle' })).toEqual({
      ok: true,
      request: {
        kind: 'circleSolveMissing',
        radiusLatex: '?',
        circumferenceLatex: '10*pi',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('midpoint(p1=(1,2), p2=(?,8), mid=(3,5))', { screenHint: 'midpoint' })).toEqual({
      ok: true,
      request: {
        kind: 'midpointSolveMissing',
        p1: { xLatex: '1', yLatex: '2' },
        p2: { xLatex: '?', yLatex: '8' },
        mid: { xLatex: '3', yLatex: '5' },
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('slope(p1=(1,2), p2=(?,8), slope=2)', { screenHint: 'slope' })).toEqual({
      ok: true,
      request: {
        kind: 'slopeSolveMissing',
        p1: { xLatex: '1', yLatex: '2' },
        p2: { xLatex: '?', yLatex: '8' },
        slopeLatex: '2',
      },
      style: 'structured',
    });
  });

  it('parses deferred P2 solve-missing families', () => {
    expect(parseGeometryDraft('cone(radius=?, height=4, volume=12*pi)', { screenHint: 'cone' })).toEqual({
      ok: true,
      request: {
        kind: 'coneSolveMissing',
        radiusLatex: '?',
        heightLatex: '4',
        slantHeightLatex: '?',
        volumeLatex: '12*pi',
        unknown: 'radius',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('cuboid(length=?, width=3, height=4, diagonal=13)', { screenHint: 'cuboid' })).toEqual({
      ok: true,
      request: {
        kind: 'cuboidSolveMissing',
        lengthLatex: '?',
        widthLatex: '3',
        heightLatex: '4',
        diagonalLatex: '13',
        unknown: 'length',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('arcSector(radius=?, angle=60, unit=deg, arc=2*pi)', { screenHint: 'arcSector' })).toEqual({
      ok: true,
      request: {
        kind: 'arcSectorSolveMissing',
        radiusLatex: '?',
        angleLatex: '60',
        angleUnit: 'deg',
        arcLatex: '2*pi',
        unknown: 'radius',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('triangleHeron(a=?, b=13, c=14, area=84)', { screenHint: 'triangleHeron' })).toEqual({
      ok: true,
      request: {
        kind: 'triangleHeronSolveMissing',
        aLatex: '?',
        bLatex: '13',
        cLatex: '14',
        areaLatex: '84',
        unknown: 'a',
      },
      style: 'structured',
    });
  });

  it('routes lineEquation one-unknown constraints into existing coordinate solve-missing requests', () => {
    expect(parseGeometryDraft('lineEquation(p1=(0,0), p2=(?,8), slope=2)', { screenHint: 'lineEquation' })).toEqual({
      ok: true,
      request: {
        kind: 'slopeSolveMissing',
        p1: { xLatex: '0', yLatex: '0' },
        p2: { xLatex: '?', yLatex: '8' },
        slopeLatex: '2',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('lineEquation(p1=(0,0), p2=(3,?), distance=5)', { screenHint: 'lineEquation' })).toEqual({
      ok: true,
      request: {
        kind: 'distanceSolveMissing',
        p1: { xLatex: '0', yLatex: '0' },
        p2: { xLatex: '3', yLatex: '?' },
        distanceLatex: '5',
      },
      style: 'structured',
    });

    expect(parseGeometryDraft('lineEquation(p1=(1,2), p2=(?,8), mid=(3,5))', { screenHint: 'lineEquation' })).toEqual({
      ok: true,
      request: {
        kind: 'midpointSolveMissing',
        p1: { xLatex: '1', yLatex: '2' },
        p2: { xLatex: '?', yLatex: '8' },
        mid: { xLatex: '3', yLatex: '5' },
      },
      style: 'structured',
    });
  });

  it('rejects solve-missing requests with multiple unknown markers', () => {
    const result = parseGeometryDraft('rectangle(width=?, height=?, area=40)', { screenHint: 'rectangle' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('exactly one ?');
    }
  });

  it('rejects lineEquation solve-missing requests with ambiguous constraints', () => {
    const result = parseGeometryDraft(
      'lineEquation(p1=(0,0), p2=(?,8), slope=2, distance=5)',
      { screenHint: 'lineEquation' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('exactly one constraint');
    }
  });

  it('roundtrips typed Geometry requests for history replay seeds', () => {
    const request = {
      kind: 'arcSector' as const,
      radiusLatex: '6',
      angleLatex: '60',
      angleUnit: 'deg' as const,
    };
    const serialized = serializeGeometryRequest(request);

    expect(serialized).toBe('arcSector(radius=6, angle=60, unit=deg)');
    expect(parseGeometryDraft(serialized, { screenHint: 'arcSector' })).toEqual({
      ok: true,
      request,
      style: 'structured',
    });
  });

  it('roundtrips solve-missing Geometry requests for history replay seeds', () => {
    const request = {
      kind: 'rectangleSolveMissing' as const,
      widthLatex: '?',
      heightLatex: '5',
      areaLatex: '40',
      unknown: 'width' as const,
    };
    const serialized = serializeGeometryRequest(request);

    expect(serialized).toBe('rectangle(width=?, height=5, area=40)');
    expect(parseGeometryDraft(serialized, { screenHint: 'rectangle' })).toEqual({
      ok: true,
      request,
      style: 'structured',
    });
  });
});
