import type { DisplayDetailSection } from '../../../types/calculator';
import { tryRischNormanHermiteReductionRule } from './risch-norman/hermite-reduction';
import { tryRischNormanLogDerivativeRule } from './risch-norman/log-derivative';
import { tryRischNormanLrtRationalIntegrationRule } from './risch-norman/lrt-log-part';
import {
  profileTranscendentalCertificateTower,
  type TranscendentalCertificateTowerProfile,
  type TranscendentalCertificateTowerStopReason,
} from './transcendental-certificate/profile';
import {
  buildLiouvilleRationalCertificateRde,
  solveTranscendentalRdeEquation,
  type TranscendentalRdeEquation,
  type TranscendentalRdeSolveResult,
  type TranscendentalRdeStopReason,
} from './transcendental-rde';

export type TranscendentalLiouvilleStopReason =
  | TranscendentalCertificateTowerStopReason
  | TranscendentalRdeStopReason
  | 'elementary-owned'
  | 'rational-residual-stop'
  | 'unsupported-liouville-candidate';

export type TranscendentalLiouvilleRationalPart =
  | { kind: 'none' }
  | {
    kind: 'rde-rational-certificate';
    equation: TranscendentalRdeEquation;
    solution?: Extract<TranscendentalRdeSolveResult, { kind: 'solution' }>;
  }
  | {
    kind: 'hermite-rational-correction';
    exactLatex: string;
    antiderivativeNode: unknown;
    proofReason: string;
  };

export type TranscendentalLiouvilleLogResidual = {
  kind: 'ordinary-log-derivative' | 'algebraic-log-lrt';
  exactLatex: string;
  antiderivativeNode: unknown;
  proofReason: string;
  exactSupplementLatex?: string[];
};

export type TranscendentalLiouvilleObstruction = {
  kind: 'rde-polynomial-degree';
  equationLatex: string;
  proofSummary: string;
  proofSteps: string[];
};

export type TranscendentalLiouvilleDecomposition = {
  kind: 'success';
  family:
    | 'exp-quadratic-certificate'
    | 'rational-log-derivative'
    | 'rational-hermite-correction'
    | 'rational-lrt-log-part';
  variable: string;
  rationalPart: TranscendentalLiouvilleRationalPart;
  logarithmicDerivativeResiduals: TranscendentalLiouvilleLogResidual[];
  obstruction?: TranscendentalLiouvilleObstruction;
  exactSupplementLatex?: string[];
  proofSummary: string;
  proofDetails: DisplayDetailSection[];
  profile?: TranscendentalCertificateTowerProfile;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLiouvilleStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalLiouvilleStopReason;
  detail: string;
  profile?: TranscendentalCertificateTowerProfile;
  proofMode: 'exact-symbolic-no-compute-engine';
};

export type TranscendentalLiouvilleResult =
  | TranscendentalLiouvilleDecomposition
  | TranscendentalLiouvilleStop;

function stop(
  variable: string,
  reason: TranscendentalLiouvilleStopReason,
  detail: string,
  profile?: TranscendentalCertificateTowerProfile,
): TranscendentalLiouvilleStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    profile,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function supplementLines(...groups: Array<string[] | undefined>) {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const group of groups) {
    for (const line of group ?? []) {
      if (seen.has(line)) {
        continue;
      }
      seen.add(line);
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines : undefined;
}

function rdeObstructionDetails(input: {
  variable: string;
  equation: TranscendentalRdeEquation;
  obstruction: Extract<TranscendentalRdeSolveResult, { kind: 'obstruction' }>;
  exponentLatex: string;
}): DisplayDetailSection[] {
  return [
    {
      title: 'Liouville Decomposition',
      lines: [
        `Field: K(${input.variable}, e^{${input.exponentLatex}}).`,
        'A Liouville-form elementary antiderivative would require a rational certificate part.',
        input.equation.equationLatex,
      ],
      lineKinds: ['text', 'text', 'math'],
    },
    {
      title: 'RDE Obstruction',
      lineKind: 'text',
      lines: [
        input.obstruction.proofSummary,
        ...input.obstruction.proofSteps,
      ],
    },
  ];
}

function rationalResidualDetails(input: {
  title: string;
  proofReason: string;
  exactLatex: string;
}): DisplayDetailSection[] {
  return [
    {
      title: input.title,
      lines: [
        input.proofReason,
        input.exactLatex,
      ],
      lineKinds: ['text', 'math'],
    },
  ];
}

function tryExpQuadraticLiouville(
  node: unknown,
  variable: string,
): TranscendentalLiouvilleResult | undefined {
  const profile = profileTranscendentalCertificateTower(node, variable);
  if (profile.kind === 'stop') {
    return stop(profile.variable, profile.reason, profile.detail, profile);
  }
  if (profile.kind === 'elementary-owned') {
    return stop(
      profile.variable,
      'elementary-owned',
      `The ${profile.owner} route already owns this elementary exponential family.`,
      profile,
    );
  }

  const built = buildLiouvilleRationalCertificateRde({
    variable: profile.variable,
    exponentNode: profile.exponentNode,
  });
  if (built.kind === 'stop') {
    return stop(built.variable, built.reason, built.detail, profile);
  }

  const solved = solveTranscendentalRdeEquation(built.equation);
  if (solved.kind === 'stop') {
    return stop(solved.variable, solved.reason, solved.detail, profile);
  }

  if (solved.kind === 'solution') {
    return {
      kind: 'success',
      family: 'exp-quadratic-certificate',
      variable: profile.variable,
      rationalPart: {
        kind: 'rde-rational-certificate',
        equation: built.equation,
        solution: solved,
      },
      logarithmicDerivativeResiduals: [],
      exactSupplementLatex: supplementLines(solved.exactSupplementLatex),
      proofSummary: 'Liouville decomposition found a rational certificate part for this exponential field.',
      proofDetails: rationalResidualDetails({
        title: 'Liouville Rational Certificate',
        proofReason: solved.proofSummary,
        exactLatex: solved.solutionLatex,
      }),
      profile,
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  return {
    kind: 'success',
    family: 'exp-quadratic-certificate',
    variable: profile.variable,
    rationalPart: {
      kind: 'rde-rational-certificate',
      equation: built.equation,
    },
    logarithmicDerivativeResiduals: [],
    obstruction: {
      kind: 'rde-polynomial-degree',
      equationLatex: built.equation.equationLatex,
      proofSummary: solved.proofSummary,
      proofSteps: solved.proofSteps,
    },
    exactSupplementLatex: supplementLines(solved.exactSupplementLatex),
    proofSummary: 'Liouville decomposition reduces the exponential-field question to an RDE obstruction.',
    proofDetails: rdeObstructionDetails({
      variable: profile.variable,
      equation: built.equation,
      obstruction: solved,
      exponentLatex: profile.exponentLatex,
    }),
    profile,
    proofMode: 'exact-symbolic-no-compute-engine',
  };
}

function tryRationalLiouville(
  node: unknown,
  variable: string,
): TranscendentalLiouvilleDecomposition | undefined {
  const logDerivative = tryRischNormanLogDerivativeRule(node, variable);
  if (logDerivative.kind === 'success') {
    const proofReason = logDerivative.verification.reason
      ?? 'verified by internal Risch-Norman log-derivative rule proof';
    const residual: TranscendentalLiouvilleLogResidual = {
      kind: 'ordinary-log-derivative',
      exactLatex: logDerivative.exactLatex,
      antiderivativeNode: logDerivative.antiderivativeNode,
      proofReason,
      exactSupplementLatex: logDerivative.exactSupplementLatex,
    };
    return {
      kind: 'success',
      family: 'rational-log-derivative',
      variable,
      rationalPart: { kind: 'none' },
      logarithmicDerivativeResiduals: [residual],
      exactSupplementLatex: supplementLines(logDerivative.exactSupplementLatex),
      proofSummary: 'Liouville decomposition recognized the rational residual as a logarithmic derivative.',
      proofDetails: rationalResidualDetails({
        title: 'Log-Derivative Residual',
        proofReason,
        exactLatex: logDerivative.exactLatex,
      }),
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const hermite = tryRischNormanHermiteReductionRule(node, variable);
  if (hermite.kind === 'success') {
    const proofReason = hermite.verification.reason
      ?? 'verified by internal Risch-Norman Hermite rational-correction rule proof';
    return {
      kind: 'success',
      family: 'rational-hermite-correction',
      variable,
      rationalPart: {
        kind: 'hermite-rational-correction',
        exactLatex: hermite.exactLatex,
        antiderivativeNode: hermite.antiderivativeNode,
        proofReason,
      },
      logarithmicDerivativeResiduals: [],
      exactSupplementLatex: supplementLines(hermite.exactSupplementLatex),
      proofSummary: 'Liouville decomposition reused the bounded Hermite rational-correction proof.',
      proofDetails: rationalResidualDetails({
        title: 'Hermite Rational Correction',
        proofReason,
        exactLatex: hermite.exactLatex,
      }),
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  const lrt = tryRischNormanLrtRationalIntegrationRule(node, variable);
  if (lrt.kind === 'success') {
    const proofReason = lrt.verification.reason
      ?? 'verified by internal Risch-Norman LRT logarithmic-part rule proof';
    const residual: TranscendentalLiouvilleLogResidual = {
      kind: 'algebraic-log-lrt',
      exactLatex: lrt.exactLatex,
      antiderivativeNode: lrt.antiderivativeNode,
      proofReason,
      exactSupplementLatex: lrt.exactSupplementLatex,
    };
    return {
      kind: 'success',
      family: 'rational-lrt-log-part',
      variable,
      rationalPart: { kind: 'none' },
      logarithmicDerivativeResiduals: [residual],
      exactSupplementLatex: supplementLines(lrt.exactSupplementLatex),
      proofSummary: 'Liouville decomposition reused the bounded LRT logarithmic-part proof.',
      proofDetails: rationalResidualDetails({
        title: 'LRT Algebraic Log Residual',
        proofReason,
        exactLatex: lrt.exactLatex,
      }),
      proofMode: 'exact-symbolic-no-compute-engine',
    };
  }

  return undefined;
}

export function decomposeTranscendentalLiouvilleCandidate(
  node: unknown,
  variable = 'x',
): TranscendentalLiouvilleResult {
  const exp = tryExpQuadraticLiouville(node, variable);
  if (exp?.kind === 'success') {
    return exp;
  }

  const rational = tryRationalLiouville(node, variable);
  if (rational) {
    return rational;
  }

  return exp ?? stop(
    variable,
    'unsupported-liouville-candidate',
    'No bounded Liouville decomposition route recognized this candidate.',
  );
}
