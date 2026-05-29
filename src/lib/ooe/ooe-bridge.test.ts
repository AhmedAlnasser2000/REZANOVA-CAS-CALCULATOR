import { invoke } from '@tauri-apps/api/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBuiltinOoePlan,
  isOoeBridgeAvailable,
  listBuiltinOoePlanDescriptors,
  ooeBuiltinPlanDescriptorSchema,
  ooePlanSchema,
  ooeCommitAssessmentSchema,
  ooeJobIdentitySchema,
  ooeTraceEventSchema,
  ooeValidationReportSchema,
  validateOoePlan,
  type OoeBuiltinPlanDescriptor,
  type OoeCommitAssessment,
  type OoeJobIdentity,
  type OoePlan,
  type OoeTraceEvent,
  type OoeValidationReport,
} from './ooe-bridge';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const descriptor: OoeBuiltinPlanDescriptor = {
  category: 'equation',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  entrypoint: 'runEquationMode',
  description: 'Solve an Equation workflow through the guarded equation runtime.',
};

const editorDescriptor: OoeBuiltinPlanDescriptor = {
  category: 'editor',
  planId: 'plan.editor.variableHints',
  capabilityId: 'editor.variableHints',
  hostId: 'editor-analysis-runtime',
  entrypoint: 'runEditorAnalysis',
  description: 'Analyze editor input for variable hint metadata.',
};

const plan: OoePlan = {
  id: 'plan.equation.solve',
  schemaVersion: 1,
  nodes: [
    {
      id: 'node.equation.solve',
      capabilityId: 'equation.solve',
      hostId: 'equation-runtime',
      phaseId: 'equation.solve',
      taskClass: 'explicit',
      priorityClass: 'userBlocking',
      cancellationPolicy: 'staleDrop',
      commitPolicy: 'commitLatestOnly',
      threadSafety: 'mainThreadOnly',
      resultStability: 'draft',
      solverMode: 'classic',
      chunkingPolicy: 'none',
      checkpointPolicy: 'none',
      streamingPolicy: 'finalOnly',
      materializationPolicy: 'full',
      computeTopology: 'local',
      resourcePolicy: 'normal',
      dependsOn: [],
      isTerminalResult: true,
    },
  ],
};


const jobIdentity: OoeJobIdentity = {
  jobId: 'job.equation.solve.42',
  planId: 'plan.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  nodeId: 'node.equation.solve',
  phaseId: 'equation.solve',
  inputRevisionId: 'input.42',
};

const commitAssessment: OoeCommitAssessment = {
  job: jobIdentity,
  activeInputRevisionId: 'input.42',
  commitPolicy: 'commitLatestOnly',
  legality: 'commitAllowed',
  commitDecision: 'committed',
  resultStability: 'stable',
};

const invalidReport: OoeValidationReport = {
  ok: false,
  errors: [{ kind: 'missingTerminalResult' }],
};

const traceEvent: OoeTraceEvent = {
  traceId: 'trace.equation.solve.1',
  jobId: 'job.equation.solve.1',
  planId: 'plan.equation.solve',
  nodeId: 'node.equation.solve',
  capabilityId: 'equation.solve',
  hostId: 'equation-runtime',
  phaseId: 'equation.solve',
  stageId: 'direct-symbolic',
  inputRevisionId: 'input.42',
  status: 'provisionalReady',
  resultStability: 'provisional',
  durationMs: 12,
  commitDecision: 'committed',
  message: 'guarded stage returned an outcome',
};

function enableDesktopRuntime() {
  vi.stubGlobal('window', {
    __TAURI_INTERNALS__: {},
  });
}

describe('OOE TypeScript bridge schemas', () => {
  it('accepts Rust-shaped built-in descriptors, plans, and validation reports', () => {
    expect(ooeBuiltinPlanDescriptorSchema.parse(descriptor)).toEqual(descriptor);
    expect(ooeBuiltinPlanDescriptorSchema.parse(editorDescriptor)).toEqual(editorDescriptor);
    expect(ooePlanSchema.parse(plan)).toEqual(plan);
    expect(ooeJobIdentitySchema.parse(jobIdentity)).toEqual(jobIdentity);
    expect(ooeCommitAssessmentSchema.parse(commitAssessment)).toEqual(commitAssessment);
    expect(ooeTraceEventSchema.parse(traceEvent)).toEqual(traceEvent);
    expect(ooeValidationReportSchema.parse(invalidReport)).toEqual(invalidReport);
  });

  it('accepts legacy minimal Rust-shaped trace events without RS6 optional fields', () => {
    const legacyTraceEvent = {
      planId: 'plan.equation.solve',
      nodeId: null,
      phaseId: null,
      status: 'completed',
      resultStability: 'stable',
      durationMs: null,
      message: null,
    };

    expect(ooeTraceEventSchema.parse(legacyTraceEvent)).toEqual(legacyTraceEvent);
  });

  it('rejects malformed command payloads', () => {
    expect(() => ooeBuiltinPlanDescriptorSchema.parse({
      ...descriptor,
      category: 'solver',
    })).toThrow();
    expect(() => ooePlanSchema.parse({
      ...plan,
      nodes: [{ ...plan.nodes[0], priorityClass: 'urgent' }],
    })).toThrow();
    expect(() => ooePlanSchema.parse({
      ...plan,
      nodes: [{ ...plan.nodes[0], solverMode: 'atomic' }],
    })).toThrow();
    expect(() => ooePlanSchema.parse({
      ...plan,
      nodes: [{ ...plan.nodes[0], computeTopology: 'multiExternal' }],
    })).toThrow();
    expect(() => ooeTraceEventSchema.parse({
      ...traceEvent,
      status: 'done',
    })).toThrow();
    expect(() => ooeTraceEventSchema.parse({
      ...traceEvent,
      commitDecision: 'published',
    })).toThrow();
    expect(() => ooeJobIdentitySchema.parse({
      ...jobIdentity,
      inputRevisionId: null,
    })).toThrow();
    expect(() => ooeCommitAssessmentSchema.parse({
      ...commitAssessment,
      legality: 'allowed',
    })).toThrow();
    expect(() => ooeValidationReportSchema.parse({
      ok: false,
      errors: [{ kind: 'missingDependency', nodeId: 'solve' }],
    })).toThrow();
  });
});

describe('OOE TypeScript bridge commands', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports unavailable with safe data outside Tauri', async () => {
    expect(isOoeBridgeAvailable()).toBe(false);

    await expect(listBuiltinOoePlanDescriptors()).resolves.toEqual({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: [],
    });
    await expect(getBuiltinOoePlan('plan.equation.solve')).resolves.toEqual({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: null,
    });
    await expect(validateOoePlan(plan)).resolves.toEqual({
      kind: 'unavailable',
      reason: 'desktop-runtime-unavailable',
      data: { ok: false, errors: [] },
    });
  });

  it('invokes exact RS3 command names when Tauri is available', async () => {
    enableDesktopRuntime();
    vi.mocked(invoke)
      .mockResolvedValueOnce([descriptor])
      .mockResolvedValueOnce(plan)
      .mockResolvedValueOnce({ ok: true, errors: [] });

    await listBuiltinOoePlanDescriptors();
    await getBuiltinOoePlan('plan.equation.solve');
    await validateOoePlan(plan);

    expect(invoke).toHaveBeenNthCalledWith(1, 'ooe_list_builtin_plans', undefined);
    expect(invoke).toHaveBeenNthCalledWith(2, 'ooe_get_builtin_plan', {
      planId: 'plan.equation.solve',
    });
    expect(invoke).toHaveBeenNthCalledWith(3, 'ooe_validate_plan', { plan });
  });

  it('parses mocked ready responses', async () => {
    enableDesktopRuntime();
    vi.mocked(invoke)
      .mockResolvedValueOnce([descriptor])
      .mockResolvedValueOnce(plan)
      .mockResolvedValueOnce({ ok: true, errors: [] });

    await expect(listBuiltinOoePlanDescriptors()).resolves.toEqual({
      kind: 'ready',
      data: [descriptor],
    });
    await expect(getBuiltinOoePlan('plan.equation.solve')).resolves.toEqual({
      kind: 'ready',
      data: plan,
    });
    await expect(validateOoePlan(plan)).resolves.toEqual({
      kind: 'ready',
      data: { ok: true, errors: [] },
    });
  });

  it('preserves unknown plan null from Rust', async () => {
    enableDesktopRuntime();
    vi.mocked(invoke).mockResolvedValueOnce(null);

    await expect(getBuiltinOoePlan('plan.unknown')).resolves.toEqual({
      kind: 'ready',
      data: null,
    });
  });

  it('keeps invalid validation reports as data', async () => {
    enableDesktopRuntime();
    vi.mocked(invoke).mockResolvedValueOnce(invalidReport);

    await expect(validateOoePlan(plan)).resolves.toEqual({
      kind: 'ready',
      data: invalidReport,
    });
  });
});
