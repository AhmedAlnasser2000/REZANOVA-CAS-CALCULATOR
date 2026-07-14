import { describe, expect, it } from 'vitest';
import type { CanonicalRuntimeOutcome } from '../../types/calculator';
import {
  buildCanonicalResultDocumentFromProducer,
  canonicalMathValue,
} from '../result-contract';
import { SURFACE_PROTOCOL_VERSION } from './dto';
import {
  querySurfaceCurrentResult,
  querySurfaceSafeSettings,
  querySurfaceSnapshot,
  querySurfaceWorkspaceInfo,
} from './queries';

describe('Surface Protocol snapshot queries', () => {
  it('returns a compact current-result summary from an explicit Display snapshot', () => {
    const outcome = {
      kind: 'success',
      runtimeAdvisories: { advisories: [{ code: 'internal', message: 'hidden advisory' }] },
      history: { entries: ['hidden history'] },
      variables: { x: 2 },
      nonSerializable: () => 'hidden',
      canonicalResult: buildCanonicalResultDocumentFromProducer({
        outcomeKind: 'success',
        title: 'Equation Result',
        primaryMath: canonicalMathValue('x=2'),
        detailSections: [{
          title: 'Internal details',
          lines: ['solver object should stay hidden'],
          lineKind: 'text',
        }],
        warnings: [],
      }),
    } as unknown as CanonicalRuntimeOutcome;

    const result = querySurfaceCurrentResult({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      displayOutcome: outcome,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'equation',
        queryKind: 'currentResult',
        summary: {
          status: 'success',
          title: 'Equation Result',
          primaryLatex: 'x=2',
        },
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('detailSections');
    expect(serialized).not.toContain('runtimeAdvisories');
    expect(serialized).not.toContain('solver object');
    expect(serialized).not.toContain('hidden history');
    expect(serialized).not.toContain('variables');
    expect(serialized).not.toContain('nonSerializable');
  });

  it('returns an explicit empty result when no display snapshot is committed', () => {
    expect(querySurfaceCurrentResult({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'calculate',
      displayOutcome: null,
    })).toMatchObject({
      ok: true,
      value: {
        queryKind: 'currentResult',
        summary: {
          workspaceKind: 'calculate',
          status: 'empty',
          title: 'No committed result',
        },
      },
    });
  });

  it('returns workspace info without enabling unavailable Surface areas', () => {
    expect(querySurfaceWorkspaceInfo({
      workspaceKind: 'calculate',
    })).toEqual({
      ok: true,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      value: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'calculate',
        queryKind: 'workspaceInfo',
        label: 'Calculate',
        summary: 'Compact committed-result summaries and lifecycle/query infrastructure for Calculate.',
        capabilities: {
          resultSummary: true,
          lifecycleEvents: true,
          currentResultQuery: true,
          commands: false,
          mount: false,
          history: false,
          variables: false,
          graphing: false,
          tabs: false,
        },
      },
    });
  });

  it('returns only safe settings and rejects invalid angle units without throwing', () => {
    const result = querySurfaceSafeSettings({
      workspaceKind: 'equation',
      settings: {
        angleUnit: 'grad',
        outputStyle: 'decimal',
        history: ['hidden'],
        variables: { x: 2 },
        callback: () => 'hidden',
      },
    });

    expect(result).toEqual({
      ok: true,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      value: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'equation',
        queryKind: 'safeSettings',
        angleUnit: 'grad',
      },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('outputStyle');
    expect(serialized).not.toContain('history');
    expect(serialized).not.toContain('variables');
    expect(serialized).not.toContain('callback');

    expect(querySurfaceSafeSettings({
      workspaceKind: 'equation',
      settings: { angleUnit: 'turn' },
    })).toMatchObject({
      ok: false,
      error: {
        code: 'unsupported-field',
        field: 'settings.angleUnit',
      },
    });
  });

  it('validates snapshot query envelopes for unsupported versions, workspaces, and queries', () => {
    expect(querySurfaceSnapshot({
      protocolVersion: 2,
      workspaceKind: 'equation',
      queryKind: 'currentResult',
    })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-version', field: 'protocolVersion' },
    });

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
      queryKind: 'workspaceInfo',
    })).toMatchObject({
      ok: true,
      value: {
        workspaceKind: 'equation',
        queryKind: 'workspaceInfo',
      },
    });
  });
});
