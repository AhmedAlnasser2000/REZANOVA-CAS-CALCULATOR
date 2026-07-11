import { describe, expect, it } from 'vitest';
import {
  buildEquationOoeInputRevisionId,
  buildEquationOoeSnapshot,
  runEquationMode,
  runEquationModeWithOoePilot,
} from '../equation';
import { makeRequest } from './test-support';

describe('Equation mode OOE runtime', () => {
  it('builds stable OOE revisions for equivalent Equation requests and changes on meaningful input', () => {
    const first = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x+1=2',
      equationSolveTarget: 'x',
      numericInterval: { start: '-1', end: '3', subdivisions: 32 },
      storedVariables: [{ name: 'a', valueLatex: '4', numericValue: 4 }],
    };
    const second = {
      ...makeRequest(),
      storedVariables: [{ numericValue: 4, valueLatex: '4', name: 'a' }],
      numericInterval: { subdivisions: 32, end: '3', start: '-1' },
      equationSolveTarget: 'x',
      equationLatex: 'x+1=2',
      equationScreen: 'symbolic' as const,
    };
    const changed = {
      ...first,
      numericInterval: { start: '-1', end: '4', subdivisions: 32 },
    };
    const changedAnswerMode = {
      ...first,
      equationAnswerMode: 'isolate' as const,
    };
    const changedDomainIntent = {
      ...first,
      equationDomainIntent: 'complex' as const,
    };
    const complexRegion = {
      ...first,
      numericInterval: undefined,
      equationDomainIntent: 'complex' as const,
      complexRegion: { reMin: '-1', reMax: '1', imMin: '-1', imMax: '1', gridSize: 9 },
    };

    expect(buildEquationOoeSnapshot(first)).toEqual({
      route: 'numeric-interval',
      explicitImaginaryInput: false,
      request: first,
    });
    expect(buildEquationOoeSnapshot(complexRegion)).toEqual({
      route: 'complex-region',
      explicitImaginaryInput: false,
      request: complexRegion,
    });
    expect(buildEquationOoeSnapshot({
      ...first,
      equationLatex: 'x+\\imaginaryI=0',
    }).explicitImaginaryInput).toBe(true);
    expect(buildEquationOoeInputRevisionId(first)).toBe(buildEquationOoeInputRevisionId(second));
    expect(buildEquationOoeInputRevisionId({
      ...first,
      equationLatex: '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)',
    })).toBe(buildEquationOoeInputRevisionId({
      ...first,
      equationLatex: '\\ln(x+1)=\\ln(2x-3)',
    }));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changed));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(complexRegion));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changedAnswerMode));
    expect(buildEquationOoeInputRevisionId(first)).not.toBe(buildEquationOoeInputRevisionId(changedDomainIntent));
    expect(buildEquationOoeInputRevisionId(first)).toMatch(/^input\.equation\.solve\.[a-z0-9]+$/u);
  });

  it('keeps the OOE pilot wrapper fail-open and outcome-stable', async () => {
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^2-5x+6=0',
    };
    const direct = runEquationMode(request);
    const wrapped = await runEquationModeWithOoePilot(request);

    expect(direct.kind).toBe('success');
    if (direct.kind === 'success') {
      expect(direct.canonicalMath?.canonicalLatex).toBe(direct.exactLatex);
      expect(direct.canonicalMath?.mathJson).toBeDefined();
      expect(structuredClone(direct.canonicalMath)).toEqual(direct.canonicalMath);
    }
    expect(wrapped.payload).toEqual(direct);
    expect(wrapped.ooe.status.kind).toBe('unavailable');
    if (wrapped.ooe.guardedTrace) {
      expect(wrapped.ooe.guardedTrace.attempts.length).toBeGreaterThan(0);
    }
  });

  it('records stale Equation commit assessments as metadata without changing payloads', async () => {
    const request = {
      ...makeRequest(),
      equationScreen: 'symbolic' as const,
      equationLatex: 'x^2-5x+6=0',
    };
    const direct = runEquationMode(request);
    const wrapped = await runEquationModeWithOoePilot(request, {
      activeInputRevisionId: 'input.equation.solve.stale',
    });

    expect(wrapped.payload).toEqual(direct);
    expect(wrapped.ooe.commitAssessment).toMatchObject({
      activeInputRevisionId: 'input.equation.solve.stale',
      legality: 'staleDrop',
      commitDecision: 'staleDropped',
      resultStability: 'stale',
    });
  });
});
