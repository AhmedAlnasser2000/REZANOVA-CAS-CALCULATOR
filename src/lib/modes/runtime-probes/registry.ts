import type {
  ResultProducerDraft,
  LauncherLeafId,
} from '../../../types/calculator';
import type { OoeJobContextOptions } from '../../ooe/job-launch/job-contract';
import type { OoeRuntimeMetadata } from '../../ooe/runtime-control/runtime-envelope';
import type { OoeRuntimeShellEvidence } from '../../ooe/runtime-control/runtime-shell-contract';
import {
  buildCalculateRuntimeOoeSnapshot,
  runCalculateRuntimeWithOoePilot,
  type RunCalculateRuntimeRequest,
} from '../calculate';
import {
  buildEquationOoeSnapshot,
  runEquationModeWithOoePilot,
  type RunEquationModeRequest,
} from '../equation';
import {
  buildCalculusOoeSnapshot,
  runCalculusModeWithOoePilot,
  type RunCalculusModeRequest,
} from '../calculus';
import { runTrigonometryModeWithOoePilot } from '../trigonometry';
import { buildTrigonometryOoeSnapshot } from '../../trigonometry/runtime-input';
import type { RunTrigonometryRuntimeRequest } from '../../trigonometry/runtime-input';
import { runGeometryModeWithOoePilot } from '../geometry';
import { buildGeometryOoeSnapshot } from '../../geometry/runtime-input';
import type { RunGeometryRuntimeRequest } from '../../geometry/runtime-input';
import { runStatisticsModeWithOoePilot } from '../statistics';
import { buildStatisticsOoeSnapshot } from '../../statistics/runtime-input';
import type { RunStatisticsRuntimeRequest } from '../../statistics/runtime-input';
import {
  buildMatrixOoeSnapshot,
  runMatrixModeWithOoePilot,
  type RunMatrixModeRequest,
} from '../matrix';
import {
  buildVectorOoeSnapshot,
  runVectorModeWithOoePilot,
  type RunVectorModeRequest,
} from '../vector';
import {
  buildTableOoeSnapshot,
  runTableModeWithOoePilot,
  type RunTableModeRequest,
} from '../table';

export type RuntimeProbeWorkspaceId = Exclude<LauncherLeafId, 'labs'>;

export type RuntimeProbeExecution = {
  payload: unknown;
  ooe: OoeRuntimeMetadata & {
    runtimeShell?: OoeRuntimeShellEvidence;
  };
};

export type WorkspaceRuntimeProbe = {
  workspace: RuntimeProbeWorkspaceId;
  capabilityId: string;
  primaryHostId: string;
  fallbackHostId: string;
  shellId: string;
  request: object;
  requestSnapshot: object;
  execute: (options?: OoeJobContextOptions) => Promise<RuntimeProbeExecution>;
  outcome: (payload: unknown) => ResultProducerDraft;
};

function directOutcome(payload: unknown) {
  return payload as ResultProducerDraft;
}

function nestedOutcome(payload: unknown) {
  return (payload as { outcome: ResultProducerDraft }).outcome;
}

const calculateRequest: RunCalculateRuntimeRequest = {
  kind: 'standard',
  request: {
    action: 'evaluate',
    latex: '2+2',
    angleUnit: 'deg',
    outputStyle: 'exact',
    ansLatex: '0',
    calculateScreen: 'standard',
  },
};

const equationRequest: RunEquationModeRequest = {
  equationScreen: 'symbolic',
  equationLatex: 'x=1',
  equationAnswerMode: 'exact',
  equationDomainIntent: 'real',
  complexExactForm: 'rectangular',
  quadraticCoefficients: [1, 0, 0],
  cubicCoefficients: [1, 0, 0, 0],
  quarticCoefficients: [1, 0, 0, 0, 0],
  polynomialSystem2Latex: ['', ''],
  system2: [],
  system3: [],
  angleUnit: 'deg',
  outputStyle: 'exact',
  ansLatex: '0',
  storedVariables: [],
};

const calculusRequest: RunCalculusModeRequest = {
  screen: 'finiteLimit',
  indefiniteIntegral: { bodyLatex: '' },
  definiteIntegral: { bodyLatex: '', lower: '0', upper: '1' },
  improperIntegral: {
    bodyLatex: '',
    lowerKind: 'finite',
    lower: '1',
    upperKind: 'posInfinity',
    upper: '',
  },
  finiteLimit: { bodyLatex: 'x^2', target: '2', direction: 'two-sided' },
  infiniteLimit: { bodyLatex: '', targetKind: 'posInfinity' },
  limit: { requestLatex: '' },
  maclaurin: { bodyLatex: '', kind: 'maclaurin', center: '0', order: 3 },
  taylor: { bodyLatex: '', kind: 'taylor', center: '0', order: 3 },
  laplace: { bodyLatex: '' },
  partialDerivative: { bodyLatex: '', variable: 'x' },
  firstOrderOde: { lhsLatex: '', rhsLatex: '', classification: 'separable' },
  secondOrderOde: { a2: '1', a1: '0', a0: '1', forcingLatex: '0' },
  numericIvp: { bodyLatex: '', x0: '0', y0: '1', xEnd: '1', step: '0.1', method: 'rk4' },
};

const trigonometryRequest: RunTrigonometryRuntimeRequest = {
  inputLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
  screenHint: 'identitySimplify',
  angleUnit: 'deg',
};

const geometryRequest: RunGeometryRuntimeRequest = {
  inputLatex: 'distance(p1=(0,0), p2=(3,4))',
  screenHint: 'distance',
};

const statisticsRequest: RunStatisticsRuntimeRequest = {
  inputLatex: 'descriptive(values={1,2,3,4,5})',
  screenHint: 'descriptive',
  workingSourceHint: 'dataset',
};

const matrixRequest: RunMatrixModeRequest = {
  operation: 'detA',
  matrixA: [[1, 2], [3, 4]],
  matrixB: [[1, 0], [0, 1]],
};

const vectorRequest: RunVectorModeRequest = {
  operation: 'angle',
  vectorA: [1, 0],
  vectorB: [0, 1],
  angleUnit: 'deg',
};

const tableRequest: RunTableModeRequest = {
  primaryLatex: 'x^2',
  secondaryLatex: '',
  secondaryEnabled: false,
  start: -1,
  end: 1,
  step: 1,
};

export const WORKSPACE_RUNTIME_PROBES = [
  {
    workspace: 'calculate',
    capabilityId: 'expression.evaluate',
    primaryHostId: 'calculate-worker-runtime',
    fallbackHostId: 'calculate-runtime',
    shellId: 'calculate-worker-shell',
    request: calculateRequest,
    requestSnapshot: buildCalculateRuntimeOoeSnapshot(calculateRequest),
    execute: (options) => runCalculateRuntimeWithOoePilot(calculateRequest, options),
    outcome: directOutcome,
  },
  {
    workspace: 'equation',
    capabilityId: 'equation.solve',
    primaryHostId: 'equation-worker-runtime',
    fallbackHostId: 'equation-runtime',
    shellId: 'equation-worker-shell',
    request: equationRequest,
    requestSnapshot: buildEquationOoeSnapshot(equationRequest),
    execute: (options) => runEquationModeWithOoePilot(equationRequest, options),
    outcome: directOutcome,
  },
  {
    workspace: 'calculus',
    capabilityId: 'calculus.evaluate',
    primaryHostId: 'calculus-worker-runtime',
    fallbackHostId: 'calculus-runtime',
    shellId: 'calculus-worker-shell',
    request: calculusRequest,
    requestSnapshot: buildCalculusOoeSnapshot(calculusRequest),
    execute: (options) => runCalculusModeWithOoePilot(calculusRequest, options),
    outcome: directOutcome,
  },
  {
    workspace: 'trigonometry',
    capabilityId: 'trigonometry.evaluate',
    primaryHostId: 'trigonometry-worker-runtime',
    fallbackHostId: 'trigonometry-runtime',
    shellId: 'trigonometry-worker-shell',
    request: trigonometryRequest,
    requestSnapshot: buildTrigonometryOoeSnapshot(trigonometryRequest),
    execute: (options) => runTrigonometryModeWithOoePilot(trigonometryRequest, options),
    outcome: nestedOutcome,
  },
  {
    workspace: 'geometry',
    capabilityId: 'geometry.evaluate',
    primaryHostId: 'geometry-worker-runtime',
    fallbackHostId: 'geometry-runtime',
    shellId: 'geometry-worker-shell',
    request: geometryRequest,
    requestSnapshot: buildGeometryOoeSnapshot(geometryRequest),
    execute: (options) => runGeometryModeWithOoePilot(geometryRequest, options),
    outcome: nestedOutcome,
  },
  {
    workspace: 'statistics',
    capabilityId: 'statistics.evaluate',
    primaryHostId: 'statistics-worker-runtime',
    fallbackHostId: 'statistics-runtime',
    shellId: 'statistics-worker-shell',
    request: statisticsRequest,
    requestSnapshot: buildStatisticsOoeSnapshot(statisticsRequest),
    execute: (options) => runStatisticsModeWithOoePilot(statisticsRequest, options),
    outcome: nestedOutcome,
  },
  {
    workspace: 'matrix',
    capabilityId: 'linearAlgebra.matrix',
    primaryHostId: 'matrix-worker-runtime',
    fallbackHostId: 'matrix-runtime',
    shellId: 'matrix-worker-shell',
    request: matrixRequest,
    requestSnapshot: buildMatrixOoeSnapshot(matrixRequest),
    execute: (options) => runMatrixModeWithOoePilot(matrixRequest, options),
    outcome: directOutcome,
  },
  {
    workspace: 'vector',
    capabilityId: 'linearAlgebra.vector',
    primaryHostId: 'vector-worker-runtime',
    fallbackHostId: 'vector-runtime',
    shellId: 'vector-worker-shell',
    request: vectorRequest,
    requestSnapshot: buildVectorOoeSnapshot(vectorRequest),
    execute: (options) => runVectorModeWithOoePilot(vectorRequest, options),
    outcome: directOutcome,
  },
  {
    workspace: 'table',
    capabilityId: 'table.build',
    primaryHostId: 'table-worker-runtime',
    fallbackHostId: 'table-runtime',
    shellId: 'table-worker-shell',
    request: tableRequest,
    requestSnapshot: buildTableOoeSnapshot(tableRequest),
    execute: (options) => runTableModeWithOoePilot(tableRequest, options),
    outcome: nestedOutcome,
  },
] as const satisfies readonly WorkspaceRuntimeProbe[];
