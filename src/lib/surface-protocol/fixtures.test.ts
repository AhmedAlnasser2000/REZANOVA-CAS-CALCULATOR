import { describe, expect, it } from 'vitest';
import type { DisplayOutcome } from '../../types/calculator';
import type { OoeEventEnvelope } from '../ooe/events/event-outbox';
import {
  SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE,
  SURFACE_CONTRACT_FAILURE_FIXTURE,
  SURFACE_CONTRACT_FIXTURES,
  SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE,
  SURFACE_CONTRACT_MANIFEST_FIXTURE,
  SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE,
} from './fixtures';
import {
  buildSurfaceCapabilityManifest,
  getSurfaceFieldPolicy,
  mapOoeEventToSurfaceLifecycleEvent,
  querySurfaceSnapshot,
  surfaceFailure,
} from './index';

const resultFixtureOutcome: DisplayOutcome = {
  kind: 'success',
  title: 'Equation Result',
  exactLatex: 'x=2',
  approxText: 'x ≈ 2',
  exactSupplementLatex: ['x\\ne0'],
  answerDomain: 'real',
  solutionKind: 'exact-symbolic',
  solveSummaryText: 'Solved exactly.',
  solveSummaryParts: [[{ kind: 'text', text: 'Solved exactly.' }]],
  branchReadback: {
    targetLatex: 'x',
    relationLatex: '=',
    branchesLatex: ['2'],
    countLabel: 'roots',
  },
  warnings: ['Check denominator exclusions.'],
  rejectedCandidateCount: 1,
};

describe('Surface Protocol contract fixtures', () => {
  it('keeps contract fixtures JSON-serializable', () => {
    for (const fixture of SURFACE_CONTRACT_FIXTURES) {
      expect(JSON.parse(JSON.stringify(fixture))).toEqual(fixture);
    }
  });

  it('matches the live capability manifest helper', () => {
    expect(buildSurfaceCapabilityManifest()).toEqual(SURFACE_CONTRACT_MANIFEST_FIXTURE);
  });

  it('matches the live current-result query helper', () => {
    expect(querySurfaceSnapshot({
      protocolVersion: 1,
      workspaceKind: 'equation',
      queryKind: 'currentResult',
      displayOutcome: resultFixtureOutcome,
    })).toEqual(SURFACE_CONTRACT_CURRENT_RESULT_FIXTURE);
  });

  it('matches the live safe-settings query helper', () => {
    expect(querySurfaceSnapshot({
      protocolVersion: 1,
      workspaceKind: 'calculate',
      queryKind: 'safeSettings',
      settings: { angleUnit: 'rad' },
    })).toEqual(SURFACE_CONTRACT_SAFE_SETTINGS_FIXTURE);
  });

  it('matches the live lifecycle event mapper', () => {
    expect(mapOoeEventToSurfaceLifecycleEvent({
      type: 'ooe.result.committed',
      severity: 'info',
      sequence: 7,
      timestamp: 1234567890,
      workspaceId: 'equation',
      jobId: 'job.equation.1',
    } as OoeEventEnvelope)).toEqual(SURFACE_CONTRACT_LIFECYCLE_EVENT_FIXTURE);
  });

  it('matches the live structured failure helper', () => {
    expect(surfaceFailure('unsupported-query', 'Unsupported query.', 'queryKind')).toEqual(
      SURFACE_CONTRACT_FAILURE_FIXTURE,
    );
  });

  it('keeps fixture field families covered by the policy registry', () => {
    for (const fieldId of [
      'capability-manifest.protocolVersion',
      'current-result.summary',
      'safe-settings.angleUnit',
      'lifecycle-event.type',
      'failure.code',
    ]) {
      expect(getSurfaceFieldPolicy(fieldId)).toBeDefined();
    }
  });
});
