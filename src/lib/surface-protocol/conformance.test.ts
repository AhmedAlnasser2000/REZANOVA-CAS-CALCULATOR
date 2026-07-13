import { beforeEach, describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../result-contract';
import {
  recordOoeEvent,
  resetOoeEventOutboxForTests,
} from '../ooe/events/event-outbox';
import {
  SURFACE_PROTOCOL_VERSION,
  buildSurfaceCapabilityManifest,
  displayOutcomeToSurfaceResultSummary,
  emptySurfaceResultSummary,
  listSurfaceLifecycleEvents,
  querySurfaceSnapshot,
  surfaceFailure,
  surfaceOk,
} from './index';

function expectJsonSerializable<TValue>(value: TValue) {
  expect(JSON.parse(JSON.stringify(value))).toEqual(value);
}

function expectSerializedToOmit(value: unknown, forbidden: readonly string[]) {
  const serialized = JSON.stringify(value);
  for (const token of forbidden) {
    expect(serialized).not.toContain(token);
  }
}

describe('Surface Protocol conformance', () => {
  beforeEach(() => {
    resetOoeEventOutboxForTests();
  });

  it('keeps public DTOs JSON-serializable', () => {
    const values = [
      buildSurfaceCapabilityManifest(),
      emptySurfaceResultSummary('calculate'),
      surfaceOk({ protocolVersion: SURFACE_PROTOCOL_VERSION, value: 'ok' }),
      surfaceFailure('unsupported-query', 'Unsupported query.', 'queryKind'),
      querySurfaceSnapshot({
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'equation',
        queryKind: 'workspaceInfo',
      }),
      querySurfaceSnapshot({
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'calculate',
        queryKind: 'safeSettings',
        settings: { angleUnit: 'rad', ignored: () => 'hidden' },
      }),
    ];

    for (const value of values) {
      expectJsonSerializable(value);
    }
  });

  it('strips raw Order of Execution envelopes, diagnostics, and host internals', () => {
    recordOoeEvent({
      type: 'ooe.result.committed',
      severity: 'info',
      jobId: 'job.equation.1',
      planId: 'plan.secret',
      hostId: 'equation-worker-runtime',
      capabilityId: 'equation.solve',
      payload: {
        diagnostics: 'raw diagnostics',
        solverObject: { localPath: '/home/ahmed/secret' },
      },
      message: 'host internal message',
    });

    const events = listSurfaceLifecycleEvents();
    expect(events).toHaveLength(1);
    expectJsonSerializable(events[0]);
    expectSerializedToOmit(events[0], [
      'plan.secret',
      'equation-worker-runtime',
      'payload',
      'diagnostics',
      'solverObject',
      '/home/ahmed',
      'host internal message',
    ]);
  });

  it('maps DisplayOutcome snapshots without leaking Display blocks, solver objects, MathJSON, or app-state payloads', () => {
    const outcome = {
      kind: 'success',
      title: 'Equation Result',
      exactLatex: 'x=2',
      warnings: [],
      detailSections: [{
        title: 'DisplayBlock',
        lines: ['MathJSON tree', 'solver object', '/home/ahmed/local'],
        lineKind: 'text',
      }],
      runtimeAdvisories: { advisories: [{ code: 'diagnostics', message: 'raw diagnostics' }] },
      appStateSchema: { HistoryEntry: 'hidden' },
      variableSubstitutions: [{ name: 'x', valueLatex: '2', numericValue: 2 }],
      mathJsonTree: ['Add', 'x', 2],
      nonSerializable: () => 'hidden',
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Equation Result',
        primaryMath: canonicalMathValue('x=2'),
        detailSections: [{
          title: 'DisplayBlock',
          lines: ['MathJSON tree', 'solver object', '/home/ahmed/local'],
          lineKind: 'text',
        }],
        warnings: [],
        metadata: {
          variableSubstitutions: [{
            name: 'x',
            value: canonicalMathValue('2'),
            numericValue: 2,
          }],
        },
      }),
    } as unknown as DisplayOutcome;

    const summary = displayOutcomeToSurfaceResultSummary('equation', outcome);
    const queried = querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      queryKind: 'currentResult',
      displayOutcome: outcome,
    });

    expectJsonSerializable(summary);
    expectJsonSerializable(queried);
    expectSerializedToOmit({ summary, queried }, [
      'DisplayBlock',
      'detailSections',
      'MathJSON',
      'solver object',
      '/home/ahmed',
      'runtimeAdvisories',
      'diagnostics',
      'appStateSchema',
      'HistoryEntry',
      'variableSubstitutions',
      'mathJsonTree',
      'nonSerializable',
    ]);
  });

  it('does not expose History or Variables payloads through safe settings', () => {
    const result = querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'calculate',
      queryKind: 'safeSettings',
      settings: {
        angleUnit: 'deg',
        history: ['hidden history payload'],
        variables: { answer: 42 },
        localPath: '/home/ahmed/hidden',
        nonSerializable: () => 'hidden',
      },
    });

    expect(result).toEqual({
      ok: true,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      value: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'calculate',
        queryKind: 'safeSettings',
        angleUnit: 'deg',
      },
    });
    expectSerializedToOmit(result, [
      'hidden history payload',
      'variables',
      '/home/ahmed',
      'nonSerializable',
    ]);
  });

  it('fails closed for unsupported workspace, query, and field requests', () => {
    expect(querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'graphing',
      queryKind: 'currentResult',
    })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-workspace', field: 'workspaceKind' },
    });

    expect(querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      queryKind: 'history',
    })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-query', field: 'queryKind' },
    });

    expect(querySurfaceSnapshot({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      queryKind: 'safeSettings',
      settings: { angleUnit: 'turn' },
    })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-field', field: 'settings.angleUnit' },
    });
  });

  it('keeps unavailable Surface areas as disabled capability flags only', () => {
    for (const workspace of buildSurfaceCapabilityManifest().workspaces) {
      expect(workspace.capabilities).toMatchObject({
        commands: false,
        mount: false,
        history: false,
        variables: false,
        graphing: false,
        tabs: false,
      });
      expectJsonSerializable(workspace);
    }
  });
});
