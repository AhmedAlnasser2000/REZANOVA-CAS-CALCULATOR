import { describe, expect, it } from 'vitest';
import {
  SURFACE_SUPPORTED_PROTOCOL_VERSIONS,
  SURFACE_SUPPORTED_QUERY_KINDS,
  surfaceError,
  validateSurfaceProtocolVersion,
  validateSurfaceQueryKind,
  validateSurfaceRequest,
  validateSurfaceWorkspaceKind,
} from './errors';
import { SURFACE_PROTOCOL_VERSION } from './dto';

describe('Surface Protocol versioning and errors', () => {
  it('accepts only supported protocol versions', () => {
    expect(SURFACE_SUPPORTED_PROTOCOL_VERSIONS).toEqual([SURFACE_PROTOCOL_VERSION]);
    expect(validateSurfaceProtocolVersion(SURFACE_PROTOCOL_VERSION)).toMatchObject({
      ok: true,
      value: SURFACE_PROTOCOL_VERSION,
    });
    expect(validateSurfaceProtocolVersion(2)).toMatchObject({
      ok: false,
      error: {
        code: 'unsupported-version',
        field: 'protocolVersion',
      },
    });
  });

  it('accepts only the first hostless workspace and query set', () => {
    expect(SURFACE_SUPPORTED_QUERY_KINDS).toEqual([
      'currentResult',
      'workspaceInfo',
      'safeSettings',
    ]);
    expect(validateSurfaceWorkspaceKind('calculate')).toMatchObject({ ok: true, value: 'calculate' });
    expect(validateSurfaceWorkspaceKind('graphing')).toMatchObject({
      ok: false,
      error: { code: 'unsupported-workspace', field: 'workspaceKind' },
    });
    expect(validateSurfaceQueryKind('currentResult')).toMatchObject({ ok: true, value: 'currentResult' });
    expect(validateSurfaceQueryKind('history')).toMatchObject({
      ok: false,
      error: { code: 'unsupported-query', field: 'queryKind' },
    });
  });

  it('validates request envelopes without throwing', () => {
    expect(validateSurfaceRequest({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'equation',
      queryKind: 'safeSettings',
    })).toEqual({
      ok: true,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      value: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        workspaceKind: 'equation',
        queryKind: 'safeSettings',
      },
    });

    expect(validateSurfaceRequest({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaceKind: 'statistics',
      queryKind: 'currentResult',
    })).toMatchObject({
      ok: false,
      error: { code: 'unsupported-workspace' },
    });
  });

  it('creates typed structured errors', () => {
    expect(surfaceError('unsupported-field', 'Field is not supported.', 'history')).toEqual({
      ok: false,
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      error: {
        protocolVersion: SURFACE_PROTOCOL_VERSION,
        code: 'unsupported-field',
        message: 'Field is not supported.',
        field: 'history',
      },
    });
  });
});
