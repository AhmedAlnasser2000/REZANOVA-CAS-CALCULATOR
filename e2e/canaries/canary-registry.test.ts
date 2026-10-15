import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CANARY_EXEMPT_WORKSPACES,
  WORKSPACE_CANARIES,
  type ComputationalWorkspaceId,
  type WorkspaceCanary,
} from './canary-registry';
import { DEFAULT_LAUNCHER_CATEGORIES } from '../../src/types/calculator';

type CanaryFloor = {
  version: number;
  total: number;
  perWorkspace: Record<ComputationalWorkspaceId, number>;
};

const registry: readonly WorkspaceCanary[] = WORKSPACE_CANARIES;
const floorPath = path.resolve(process.cwd(), 'e2e/canaries/canary-floor.json');

function readFloor(text = readFileSync(floorPath, 'utf8')): CanaryFloor {
  return JSON.parse(text) as CanaryFloor;
}

function committedFloor() {
  try {
    return readFloor(execFileSync(
      'git',
      ['show', 'HEAD:e2e/canaries/canary-floor.json'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ));
  } catch {
    return undefined;
  }
}

describe('workspace canary registry', () => {
  it('covers every computational launcher leaf except Labs and the named exemptions', () => {
    const launcherLeaves = DEFAULT_LAUNCHER_CATEGORIES
      .flatMap((category) => category.entries)
      .map((entry) => entry.id)
      .filter((id): id is ComputationalWorkspaceId => id !== 'labs');
    const launcherWorkspaces = launcherLeaves.filter((id) => !(id in CANARY_EXEMPT_WORKSPACES)).sort();
    const registeredWorkspaces = registry.map((entry) => entry.workspace).sort();

    expect(registeredWorkspaces).toEqual(launcherWorkspaces);
    for (const [workspace, reason] of Object.entries(CANARY_EXEMPT_WORKSPACES)) {
      expect(launcherLeaves).toContain(workspace);
      expect(reason?.trim()).toBeTruthy();
    }
    expect(new Set(registeredWorkspaces).size).toBe(registeredWorkspaces.length);
  });

  it('keeps at least two cases per workspace and honors the committed floors', () => {
    const floor = readFloor();
    const total = registry.reduce((count, entry) => count + entry.cases.length, 0);

    expect(floor.version).toBe(1);
    expect(total).toBeGreaterThanOrEqual(floor.total);
    for (const entry of registry) {
      expect(entry.cases.length).toBeGreaterThanOrEqual(2);
      expect(entry.cases.length).toBeGreaterThanOrEqual(floor.perWorkspace[entry.workspace]);
    }

    const previous = committedFloor();
    if (previous) {
      expect(floor.total).toBeGreaterThanOrEqual(previous.total);
      for (const workspace of Object.keys(previous.perWorkspace) as ComputationalWorkspaceId[]) {
        expect(floor.perWorkspace[workspace]).toBeGreaterThanOrEqual(previous.perWorkspace[workspace]);
      }
    }
  });

  it('uses unique stable case ids and settings-explicit drivers', () => {
    const cases = registry.flatMap((entry) => entry.cases);
    const ids = cases.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of cases) {
      expect(entry.settings.angleUnit).toMatch(/^(deg|rad|grad)$/u);
      expect(entry.settings.outputStyle).toMatch(/^(exact|decimal|both)$/u);
    }
  });

  it('keeps derivative canaries on complete notation-owned requests', () => {
    const derivativeCases = registry
      .flatMap((entry) => entry.cases)
      .filter((entry) => entry.driver.kind === 'calculus' && entry.driver.tool === 'Derivative');

    expect(derivativeCases).not.toHaveLength(0);
    for (const entry of derivativeCases) {
      expect(entry.driver.inputLatex).toMatch(/^d\/d[A-Za-z]+\(.+\)$/u);
    }
  });
});
