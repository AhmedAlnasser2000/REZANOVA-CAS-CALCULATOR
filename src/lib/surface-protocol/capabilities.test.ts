import { describe, expect, it } from 'vitest';
import {
  buildSurfaceCapabilityManifest,
  getSurfaceWorkspaceCapability,
  isSurfaceWorkspaceKind,
  listSurfaceWorkspaceCapabilities,
} from './capabilities';
import { SURFACE_PROTOCOL_VERSION } from './dto';

describe('Surface Protocol capability manifest', () => {
  it('exposes only Calculate and Equation in the first manifest', () => {
    expect(listSurfaceWorkspaceCapabilities().map((entry) => entry.workspaceKind)).toEqual([
      'calculate',
      'equation',
    ]);
    expect(isSurfaceWorkspaceKind('calculate')).toBe(true);
    expect(isSurfaceWorkspaceKind('equation')).toBe(true);
    expect(isSurfaceWorkspaceKind('graphing')).toBe(false);
    expect(isSurfaceWorkspaceKind('history')).toBe(false);
  });

  it('keeps host commands, mounting, History, Variables, Graphing, and tabs disabled', () => {
    for (const capability of listSurfaceWorkspaceCapabilities()) {
      expect(capability.capabilities).toMatchObject({
        resultSummary: true,
        lifecycleEvents: true,
        currentResultQuery: true,
        commands: false,
        mount: false,
        history: false,
        variables: false,
        graphing: false,
        tabs: false,
      });
    }
  });

  it('returns defensive copies of manifest DTOs', () => {
    const calculate = getSurfaceWorkspaceCapability('calculate');
    calculate.capabilities.commands = true as never;

    expect(getSurfaceWorkspaceCapability('calculate').capabilities.commands).toBe(false);
    expect(buildSurfaceCapabilityManifest()).toEqual({
      protocolVersion: SURFACE_PROTOCOL_VERSION,
      workspaces: listSurfaceWorkspaceCapabilities(),
    });
  });
});
