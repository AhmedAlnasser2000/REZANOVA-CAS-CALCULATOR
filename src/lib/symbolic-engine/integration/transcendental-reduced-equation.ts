import type { DisplayDetailSection } from '../../../types/calculator';
import {
  type TranscendentalFieldTowerProfile,
  type TranscendentalFieldTowerReadiness,
  type TranscendentalFieldTowerStopReason,
  profileTranscendentalFieldTower,
} from './transcendental-field-tower';
import {
  decomposeTranscendentalLiouvilleCandidate,
  type TranscendentalLiouvilleDecomposition,
  type TranscendentalLiouvilleStopReason,
} from './transcendental-liouville';

export type TranscendentalReducedEquationFamily =
  | 'liouville-rde-obstruction'
  | 'liouville-rde-solution'
  | 'ordinary-log-derivative'
  | 'hermite-rational-correction'
  | 'lrt-algebraic-log';

export type TranscendentalReducedEquationStopReason =
  | TranscendentalFieldTowerStopReason
  | TranscendentalLiouvilleStopReason
  | 'depth2-reduced-equation-deferred'
  | 'empty-reduced-equation'
  | 'unsupported-reduced-equation';

export type TranscendentalReducedEquationProofObligation = {
  kind:
    | 'rational-certificate-rde'
    | 'ordinary-logarithmic-derivative'
    | 'hermite-rational-correction'
    | 'lrt-algebraic-logarithmic-part';
  equationLatex?: string;
  proofSummary: string;
  proofSteps: string[];
};

export type TranscendentalReducedEquationSuccess = {
  kind: 'success';
  variable: string;
  family: TranscendentalReducedEquationFamily;
  towerDepth: number;
  readiness: TranscendentalFieldTowerReadiness[];
  decomposition: TranscendentalLiouvilleDecomposition;
  proofObligations: TranscendentalReducedEquationProofObligation[];
  exactSupplementLatex?: string[];
  proofSummary: string;
  proofDetails: DisplayDetailSection[];
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalReducedEquationStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalReducedEquationStopReason;
  detail: string;
  towerProfile?: TranscendentalFieldTowerProfile;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalReducedEquationResult =
  | TranscendentalReducedEquationSuccess
  | TranscendentalReducedEquationStop;

function stop(
  variable: string,
  reason: TranscendentalReducedEquationStopReason,
  detail: string,
  towerProfile?: TranscendentalFieldTowerProfile,
): TranscendentalReducedEquationStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    towerProfile,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function proofStepsFromDetails(details: DisplayDetailSection[]) {
  return details.flatMap((section) => section.lines ?? []).filter((line): line is string => Boolean(line));
}

function familyForDecomposition(
  decomposition: TranscendentalLiouvilleDecomposition,
): TranscendentalReducedEquationFamily | undefined {
  if (decomposition.family === 'exp-quadratic-certificate') {
    return decomposition.obstruction ? 'liouville-rde-obstruction' : 'liouville-rde-solution';
  }
  if (decomposition.family === 'rational-log-derivative') {
    return 'ordinary-log-derivative';
  }
  if (decomposition.family === 'rational-hermite-correction') {
    return 'hermite-rational-correction';
  }
  if (decomposition.family === 'rational-lrt-log-part') {
    return 'lrt-algebraic-log';
  }
  return undefined;
}

function obligationsForDecomposition(
  decomposition: TranscendentalLiouvilleDecomposition,
): TranscendentalReducedEquationProofObligation[] {
  if (decomposition.family === 'exp-quadratic-certificate') {
    const rational = decomposition.rationalPart;
    if (rational.kind !== 'rde-rational-certificate') {
      return [];
    }
    return [{
      kind: 'rational-certificate-rde',
      equationLatex: rational.equation.equationLatex,
      proofSummary: decomposition.obstruction?.proofSummary
        ?? rational.solution?.proofSummary
        ?? decomposition.proofSummary,
      proofSteps: decomposition.obstruction?.proofSteps
        ?? rational.solution?.proofSteps
        ?? proofStepsFromDetails(decomposition.proofDetails),
    }];
  }

  if (decomposition.family === 'rational-log-derivative') {
    return decomposition.logarithmicDerivativeResiduals.map((residual) => ({
      kind: 'ordinary-logarithmic-derivative',
      proofSummary: residual.proofReason,
      proofSteps: [residual.exactLatex],
    }));
  }

  if (decomposition.family === 'rational-hermite-correction') {
    const rational = decomposition.rationalPart;
    if (rational.kind !== 'hermite-rational-correction') {
      return [];
    }
    return [{
      kind: 'hermite-rational-correction',
      proofSummary: rational.proofReason,
      proofSteps: [rational.exactLatex],
    }];
  }

  if (decomposition.family === 'rational-lrt-log-part') {
    return decomposition.logarithmicDerivativeResiduals.map((residual) => ({
      kind: 'lrt-algebraic-logarithmic-part',
      proofSummary: residual.proofReason,
      proofSteps: [residual.exactLatex],
    }));
  }

  return [];
}

function depth2DeferredStop(
  variable: string,
  profile: Extract<TranscendentalFieldTowerProfile, { kind: 'ready' }>,
) {
  const readiness = profile.readiness.join(', ');
  return stop(
    variable,
    'depth2-reduced-equation-deferred',
    `The bounded tower profiler recognized a depth-2 tower (${readiness}), but the reduced-equation solver for that tower is deferred to a later milestone.`,
    profile,
  );
}

export function reduceTranscendentalRischEquationCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalReducedEquationResult {
  const towerProfile = profileTranscendentalFieldTower(node, variable);
  if (towerProfile.kind === 'stop') {
    return stop(
      towerProfile.variable,
      towerProfile.reason,
      towerProfile.detail,
      towerProfile,
    );
  }

  const decomposition = decomposeTranscendentalLiouvilleCandidate(node, variable);
  if (decomposition.kind === 'stop') {
    if (
      towerProfile.depth === 2
      && decomposition.reason !== 'elementary-owned'
      && decomposition.reason !== 'rational-residual-stop'
    ) {
      return depth2DeferredStop(towerProfile.variable, towerProfile);
    }

    return stop(
      decomposition.variable,
      decomposition.reason,
      decomposition.detail,
      towerProfile,
    );
  }

  const family = familyForDecomposition(decomposition);
  if (!family) {
    return stop(
      variable,
      'unsupported-reduced-equation',
      'The Liouville decomposition succeeded, but no reduced-equation family is registered for it.',
      towerProfile,
    );
  }

  const proofObligations = obligationsForDecomposition(decomposition);
  if (proofObligations.length === 0) {
    return stop(
      variable,
      'empty-reduced-equation',
      'The Liouville decomposition did not expose any proof obligation for the reduced-equation layer.',
      towerProfile,
    );
  }

  return {
    kind: 'success',
    variable: decomposition.variable,
    family,
    towerDepth: towerProfile.depth,
    readiness: towerProfile.readiness,
    decomposition,
    proofObligations,
    exactSupplementLatex: decomposition.exactSupplementLatex,
    proofSummary: `Reduced Risch equation layer accepted ${decomposition.family}.`,
    proofDetails: decomposition.proofDetails,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}
