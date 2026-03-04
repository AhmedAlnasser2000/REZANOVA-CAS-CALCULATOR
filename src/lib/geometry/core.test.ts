import { describe, expect, it } from 'vitest';
import { runGeometryCoreDraft } from './core';

describe('geometry core draft runner', () => {
  it('evaluates structured square drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('square(side=2+3)', 'square');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('A=25');
      expect(outcome.exactLatex).toContain('P=20');
    }
  });

  it('keeps shorthand coordinate drafts working on migrated screens', () => {
    const { outcome } = runGeometryCoreDraft('P_1=(0,0), P_2=(3,4)', 'distance');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('d=5');
    }
  });

  it('offers an explicit send-to-equation action for line equations', () => {
    const { outcome } = runGeometryCoreDraft(
      'lineEquation(p1=(1,2), p2=(3,6), form=standard)',
      'lineEquation',
    );
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.actions).toEqual([
        {
          kind: 'send',
          target: 'equation',
          latex: outcome.exactLatex,
        },
      ]);
    }
  });

  it('evaluates 3D solid drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('cylinder(radius=3, height=8)', 'cylinder');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('V=');
      expect(outcome.exactLatex).toContain('TSA=');
    }
  });

  it('evaluates triangle drafts through the shared core', () => {
    const { outcome } = runGeometryCoreDraft('triangleArea(base=10, height=6)', 'triangleArea');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.exactLatex).toContain('A=30');
    }
  });

  it('preserves cone validation in the shared core', () => {
    const { outcome } = runGeometryCoreDraft(
      'cone(radius=3, height=4, slantHeight=6)',
      'cone',
    );
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.error).toContain('must satisfy');
    }
  });

  it('returns a clear numeric error for non-resolved scalar math', () => {
    const { outcome } = runGeometryCoreDraft('circle(radius=2a)', 'circle');
    expect(outcome.kind).toBe('error');
    if (outcome.kind === 'error') {
      expect(outcome.error).toContain('finite numeric value');
    }
  });
});
