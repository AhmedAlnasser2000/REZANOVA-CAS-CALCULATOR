import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearOoeJobRegistry,
  listActiveOoeJobs,
  startOoeJob,
} from '../../lib/ooe/active-job-registry';
import {
  buildOoeJobCommitContext,
  type OoeJobIdentityDefinition,
} from '../../lib/ooe/job-contract';
import {
  getCurrentEditorOoeCapabilityIds,
  requestCurrentEditorOoeCancellation,
  type EditorRuntimeControlSurface,
} from './editorRuntimeControl';

function definition(capabilityId: string): OoeJobIdentityDefinition {
  return {
    planId: `plan.${capabilityId}`,
    capabilityId,
    hostId: `${capabilityId.split('.')[0]}-runtime`,
    nodeId: `node.${capabilityId}`,
    phaseId: capabilityId,
  };
}

function startJob(capabilityId: string, snapshot: unknown = { capabilityId }) {
  const jobContext = buildOoeJobCommitContext(definition(capabilityId), snapshot);
  return startOoeJob({
    job: jobContext.job,
    routeLabel: capabilityId,
  });
}

const calculateSurface: EditorRuntimeControlSurface = {
  currentMode: 'calculate',
  calculateScreen: 'standard',
  equationScreen: 'symbolic',
};

describe('editor runtime control lane', () => {
  beforeEach(() => {
    clearOoeJobRegistry();
  });

  it('maps visible surfaces to their current OOE capability lane', () => {
    expect(getCurrentEditorOoeCapabilityIds(calculateSurface)).toEqual([
      'expression.evaluate',
      'expression.simplify',
      'expression.factor',
      'expression.expand',
      'calculate.algebraTransform',
      'calculate.workbench',
    ]);
    expect(getCurrentEditorOoeCapabilityIds({
      currentMode: 'equation',
      calculateScreen: 'standard',
      equationScreen: 'symbolic',
    })).toEqual(['equation.solve']);
    expect(getCurrentEditorOoeCapabilityIds({
      currentMode: 'table',
      calculateScreen: 'standard',
      equationScreen: 'home',
    })).toEqual(['table.build']);
    expect(getCurrentEditorOoeCapabilityIds({
      currentMode: 'geometry',
      calculateScreen: 'standard',
      equationScreen: 'home',
    })).toEqual([]);
  });

  it('requests cancellation for the latest active Calculate job', () => {
    const first = startJob('expression.evaluate', { latex: '1+1' });
    const second = startJob('calculate.algebraTransform', { latex: '\\frac{x^2-1}{x-1}' });
    startJob('equation.solve', { latex: 'x+1=2' });

    const requested = requestCurrentEditorOoeCancellation(calculateSurface, {
      requestedBy: 'test',
      reason: 'stop button',
    });

    expect(requested).toMatchObject({
      registryId: second.registryId,
      status: 'cancelRequested',
      cancellationRequest: {
        requestedBy: 'test',
        reason: 'stop button',
      },
    });
    expect(listActiveOoeJobs()).toMatchObject([
      { registryId: first.registryId, status: 'started' },
      { registryId: second.registryId, status: 'cancelRequested' },
      { capabilityId: 'equation.solve', status: 'started' },
    ]);
  });

  it('requests cancellation for Equation and Table lanes', () => {
    const equation = startJob('equation.solve', { latex: 'x+1=2' });
    const table = startJob('table.build', { latex: 'x^2' });

    expect(requestCurrentEditorOoeCancellation({
      currentMode: 'equation',
      calculateScreen: 'standard',
      equationScreen: 'symbolic',
    })).toMatchObject({ registryId: equation.registryId, status: 'cancelRequested' });

    expect(requestCurrentEditorOoeCancellation({
      currentMode: 'table',
      calculateScreen: 'standard',
      equationScreen: 'home',
    })).toMatchObject({ registryId: table.registryId, status: 'cancelRequested' });
  });

  it('does not request OOE cancellation on non-OOE surfaces', () => {
    startJob('expression.evaluate');

    expect(requestCurrentEditorOoeCancellation({
      currentMode: 'geometry',
      calculateScreen: 'standard',
      equationScreen: 'home',
    })).toBeNull();
  });
});
