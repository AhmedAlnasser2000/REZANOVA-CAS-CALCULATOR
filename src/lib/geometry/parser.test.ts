import { describe, expect, it } from 'vitest';
import { parseGeometryDraft } from './parser';

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
});
