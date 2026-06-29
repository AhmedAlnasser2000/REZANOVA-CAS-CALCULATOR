import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import { readExactScalarNode } from '../../../algebra/polynomial-core';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import type { IntegralStrategy } from '../types';
import { tryRischNormanAffineRationalCorrectionRule } from './affine-rational-correction';
import {
  solveRischNormanExponentialAnsatz,
  type RischNormanAnsatzFact,
} from './exponential-ansatz';
import { solveRischNormanExpSinCosAnsatz } from './exp-sincos-ansatz';
import { tryRischNormanHermiteReductionRule } from './hermite-reduction';
import { profileRischNormanCandidate, type RischNormanProfile } from './index';
import { solveRischNormanLogCorrection } from './log-correction';
import { tryRischNormanLogDerivativeRule } from './log-derivative';
import { solveRischNormanLogRationalCorrection } from './log-rational-correction';
import { tryRischNormanLrtRationalIntegrationRule } from './lrt-log-part';
import { solveRischNormanSinCosAnsatz } from './sincos-ansatz';

export type RischNormanOrchestratorFamily =
  | 'affine-exp'
  | 'positive-base-exp'
  | 'affine-sin-cos'
  | 'affine-exp-sin-cos'
  | 'affine-log-correction'
  | 'affine-log-rational-correction'
  | 'symbolic-log-derivative'
  | 'symbolic-hermite-rational-correction'
  | 'symbolic-lrt-rational'
  | 'affine-rational-correction';

export type RischNormanOrchestratorResult = {
  family: RischNormanOrchestratorFamily;
  publicStrategy: Extract<IntegralStrategy, 'integration-by-parts' | 'partial-fractions'>;
  proofReason: string;
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
  antiderivativeNode: unknown;
};

export type RischNormanOrchestratorOptions = {
  publicStrategies?: readonly IntegralStrategy[];
};

export type RischNormanTowerAttemptFamily =
  | 'exponential'
  | 'sine-cosine'
  | 'exp-sine-cosine'
  | 'affine-log'
  | 'affine-log-rational'
  | 'symbolic-log-derivative'
  | 'symbolic-hermite-rational-correction'
  | 'symbolic-lrt-rational'
  | 'affine-rational-correction';

export type RischNormanTowerAttempt = {
  family: RischNormanTowerAttemptFamily;
  publicStrategy: Extract<IntegralStrategy, 'integration-by-parts' | 'partial-fractions'>;
};

export type RischNormanTowerProfile =
  | {
    kind: 'ready';
    variable: string;
    attempts: RischNormanTowerAttempt[];
    extensionProfile: RischNormanProfile;
  }
  | {
    kind: 'stop';
    variable: string;
    reason: 'no-supported-family' | 'route-filtered';
    extensionProfile: RischNormanProfile;
  };

function factToEntry(fact: RischNormanAnsatzFact): ExactSupplementEntry {
  if (fact.kind === 'positive') {
    return {
      kind: 'condition',
      expressionLatex: fact.expressionLatex,
      relation: '>0',
      source: 'candidate-validation',
    };
  }

  if (fact.kind === 'nonunit') {
    return {
      kind: 'exclusion',
      expressionLatex: `${fact.expressionLatex}-1`,
      relation: '\\ne0',
      source: 'candidate-validation',
    };
  }

  return {
    kind: 'exclusion',
    expressionLatex: fact.expressionLatex,
    relation: '\\ne0',
    source: 'candidate-validation',
  };
}

function supplementLatexForFacts(facts: RischNormanAnsatzFact[]) {
  const entries = facts.map(factToEntry);
  const lines = mergeExactSupplementLatex({
    entries,
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

function proofVerification(reason: string): AntiderivativeBackcheck {
  return {
    status: 'verified-exact',
    reason,
  };
}

function allowsStrategy(
  options: RischNormanOrchestratorOptions | undefined,
  strategy: RischNormanOrchestratorResult['publicStrategy'],
) {
  return !options?.publicStrategies || options.publicStrategies.includes(strategy);
}

function hasNegativeIntegerPower(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return false;
  }

  const scalar = readExactScalarNode(node[2]);
  return Boolean(scalar && scalar.denominator === 1 && scalar.numerator < 0);
}

function containsRationalShape(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Divide' || hasNegativeIntegerPower(node)) {
    return true;
  }

  return node.slice(1).some(containsRationalShape);
}

function containsLog(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Ln' || node[0] === 'Log') {
    return true;
  }

  return node.slice(1).some(containsLog);
}

function containsSinCos(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Sin' || node[0] === 'Cos') {
    return true;
  }

  return node.slice(1).some(containsSinCos);
}

function containsExponential(node: unknown, variable: string): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Power' && node.length === 3 && dependsOnVariable(node[2], variable)) {
    return true;
  }

  return node.slice(1).some((child) => containsExponential(child, variable));
}

function topLevelFactors(node: unknown) {
  return isNodeArray(node) && node[0] === 'Multiply' ? flattenMultiply(node) : [node];
}

function hasTopLevelExpSinCosShape(node: unknown, variable: string) {
  const factors = topLevelFactors(node);
  return factors.some((factor) => containsExponential(factor, variable))
    && factors.some(containsSinCos);
}

function pushAttempt(
  attempts: RischNormanTowerAttempt[],
  options: RischNormanOrchestratorOptions | undefined,
  attempt: RischNormanTowerAttempt,
) {
  if (allowsStrategy(options, attempt.publicStrategy)) {
    attempts.push(attempt);
  }
}

export function profileRischNormanTowerCandidate(
  node: unknown,
  variable: string,
  options?: RischNormanOrchestratorOptions,
): RischNormanTowerProfile {
  const extensionProfile = profileRischNormanCandidate(node, variable);
  const attempts: RischNormanTowerAttempt[] = [];
  const hasExp = containsExponential(node, variable);
  const hasTrigPair = containsSinCos(node);
  const hasExpTrig = hasTopLevelExpSinCosShape(node, variable);
  const hasLogHead = containsLog(node);
  const hasRational = containsRationalShape(node);

  if (hasExpTrig) {
    pushAttempt(attempts, options, {
      family: 'exp-sine-cosine',
      publicStrategy: 'integration-by-parts',
    });
  } else if (extensionProfile.kind === 'ready') {
    if (extensionProfile.family === 'affine-exp' || extensionProfile.family === 'positive-base-exp') {
      pushAttempt(attempts, options, {
        family: 'exponential',
        publicStrategy: 'integration-by-parts',
      });
    }
    if (extensionProfile.family === 'affine-sin-cos') {
      pushAttempt(attempts, options, {
        family: 'sine-cosine',
        publicStrategy: 'integration-by-parts',
      });
    }
    if (extensionProfile.family === 'affine-log') {
      pushAttempt(attempts, options, {
        family: 'affine-log',
        publicStrategy: 'integration-by-parts',
      });
    }
  } else {
    if (hasExp && !hasTrigPair) {
      pushAttempt(attempts, options, {
        family: 'exponential',
        publicStrategy: 'integration-by-parts',
      });
    }
    if (hasTrigPair && !hasExp) {
      pushAttempt(attempts, options, {
        family: 'sine-cosine',
        publicStrategy: 'integration-by-parts',
      });
    }
  }

  if (hasLogHead) {
    pushAttempt(attempts, options, {
      family: 'affine-log',
      publicStrategy: 'integration-by-parts',
    });
    if (hasRational) {
      pushAttempt(attempts, options, {
        family: 'affine-log-rational',
        publicStrategy: 'integration-by-parts',
      });
    }
  }

  if (hasRational) {
    pushAttempt(attempts, options, {
      family: 'symbolic-log-derivative',
      publicStrategy: 'partial-fractions',
    });
    pushAttempt(attempts, options, {
      family: 'symbolic-hermite-rational-correction',
      publicStrategy: 'partial-fractions',
    });
    pushAttempt(attempts, options, {
      family: 'symbolic-lrt-rational',
      publicStrategy: 'partial-fractions',
    });
    pushAttempt(attempts, options, {
      family: 'affine-rational-correction',
      publicStrategy: 'partial-fractions',
    });
  }

  const dedupedAttempts = attempts.filter((attempt, index) =>
    attempts.findIndex((candidate) =>
      candidate.family === attempt.family && candidate.publicStrategy === attempt.publicStrategy) === index);

  if (dedupedAttempts.length === 0) {
    return {
      kind: 'stop',
      variable,
      reason: options?.publicStrategies ? 'route-filtered' : 'no-supported-family',
      extensionProfile,
    };
  }

  return {
    kind: 'ready',
    variable,
    attempts: dedupedAttempts,
    extensionProfile,
  };
}

function byPartsResult(input: {
  family: Exclude<RischNormanOrchestratorFamily, 'affine-rational-correction'>;
  proofReason: string;
  exactLatex: string;
  facts: RischNormanAnsatzFact[];
  antiderivativeNode: unknown;
}): RischNormanOrchestratorResult {
  return {
    family: input.family,
    publicStrategy: 'integration-by-parts',
    proofReason: input.proofReason,
    exactLatex: input.exactLatex,
    verification: proofVerification(input.proofReason),
    exactSupplementLatex: supplementLatexForFacts(input.facts),
    antiderivativeNode: input.antiderivativeNode,
  };
}

function runAttempt(
  node: unknown,
  variable: string,
  attempt: RischNormanTowerAttempt,
): RischNormanOrchestratorResult | undefined {
  if (attempt.family === 'exponential') {
    const exponential = solveRischNormanExponentialAnsatz(node, variable);
    if (exponential.kind === 'success') {
      const proofReason = 'verified by internal Risch-Norman exponential ansatz rule proof';
      return byPartsResult({
        family: exponential.family,
        proofReason,
        exactLatex: exponential.exactLatex,
        facts: exponential.facts,
        antiderivativeNode: exponential.antiderivativeNode,
      });
    }
    return undefined;
  }

  if (attempt.family === 'sine-cosine') {
    const sinCos = solveRischNormanSinCosAnsatz(node, variable);
    if (sinCos.kind === 'success') {
      const proofReason = 'verified by internal Risch-Norman sine-cosine ansatz rule proof';
      return byPartsResult({
        family: sinCos.family,
        proofReason,
        exactLatex: sinCos.exactLatex,
        facts: sinCos.facts,
        antiderivativeNode: sinCos.antiderivativeNode,
      });
    }
    return undefined;
  }

  if (attempt.family === 'exp-sine-cosine') {
    const expSinCos = solveRischNormanExpSinCosAnsatz(node, variable);
    if (expSinCos.kind === 'success') {
      const proofReason = 'verified by internal Risch-Norman exponential-sine-cosine ansatz rule proof';
      return byPartsResult({
        family: expSinCos.family,
        proofReason,
        exactLatex: expSinCos.exactLatex,
        facts: expSinCos.facts,
        antiderivativeNode: expSinCos.antiderivativeNode,
      });
    }
    return undefined;
  }

  if (attempt.family === 'affine-log') {
    const logCorrection = solveRischNormanLogCorrection(node, variable);
    if (logCorrection.kind === 'success') {
      const proofReason = 'verified by internal Risch-Norman affine-log correction rule proof';
      return byPartsResult({
        family: logCorrection.family,
        proofReason,
        exactLatex: logCorrection.exactLatex,
        facts: logCorrection.facts,
        antiderivativeNode: logCorrection.antiderivativeNode,
      });
    }
    return undefined;
  }

  if (attempt.family === 'affine-log-rational') {
    const logRationalCorrection = solveRischNormanLogRationalCorrection(node, variable);
    if (logRationalCorrection?.kind === 'success') {
      const proofReason = 'verified by internal Risch-Norman affine-log rational-correction rule proof';
      return byPartsResult({
        family: logRationalCorrection.family,
        proofReason,
        exactLatex: logRationalCorrection.exactLatex,
        facts: logRationalCorrection.facts,
        antiderivativeNode: logRationalCorrection.antiderivativeNode,
      });
    }
    return undefined;
  }

  if (attempt.family === 'symbolic-log-derivative') {
    const logDerivative = tryRischNormanLogDerivativeRule(node, variable);
    if (logDerivative.kind === 'success') {
      const proofReason = logDerivative.verification.reason
        ?? 'verified by internal Risch-Norman log-derivative rule proof';
      return {
        family: 'symbolic-log-derivative',
        publicStrategy: 'partial-fractions',
        proofReason,
        exactLatex: logDerivative.exactLatex,
        verification: logDerivative.verification,
        exactSupplementLatex: logDerivative.exactSupplementLatex,
        antiderivativeNode: logDerivative.antiderivativeNode,
      };
    }
    return undefined;
  }

  if (attempt.family === 'symbolic-hermite-rational-correction') {
    const hermite = tryRischNormanHermiteReductionRule(node, variable);
    if (hermite.kind === 'success') {
      const proofReason = hermite.verification.reason
        ?? 'verified by internal Risch-Norman Hermite rational-correction rule proof';
      return {
        family: 'symbolic-hermite-rational-correction',
        publicStrategy: 'partial-fractions',
        proofReason,
        exactLatex: hermite.exactLatex,
        verification: hermite.verification,
        exactSupplementLatex: hermite.exactSupplementLatex,
        antiderivativeNode: hermite.antiderivativeNode,
      };
    }
    return undefined;
  }

  if (attempt.family === 'affine-rational-correction') {
    const affineCorrection = tryRischNormanAffineRationalCorrectionRule(node, variable);
    if (affineCorrection?.kind === 'success') {
      const proofReason = affineCorrection.verification.reason
        ?? 'verified by internal Risch-Norman affine rational-correction rule proof';
      return {
        family: 'affine-rational-correction',
        publicStrategy: 'partial-fractions',
        proofReason,
        exactLatex: affineCorrection.exactLatex,
        verification: affineCorrection.verification,
        exactSupplementLatex: affineCorrection.exactSupplementLatex,
        antiderivativeNode: affineCorrection.antiderivativeNode,
      };
    }
  }

  if (attempt.family === 'symbolic-lrt-rational') {
    const lrt = tryRischNormanLrtRationalIntegrationRule(node, variable);
    if (lrt.kind === 'success') {
      const proofReason = lrt.verification.reason
        ?? 'verified by internal Risch-Norman LRT logarithmic-part rule proof';
      return {
        family: 'symbolic-lrt-rational',
        publicStrategy: 'partial-fractions',
        proofReason,
        exactLatex: lrt.exactLatex,
        verification: lrt.verification,
        exactSupplementLatex: lrt.exactSupplementLatex,
        antiderivativeNode: lrt.antiderivativeNode,
      };
    }
  }

  return undefined;
}

export function tryRischNormanOrchestrator(
  node: unknown,
  variable: string,
  options?: RischNormanOrchestratorOptions,
): RischNormanOrchestratorResult | undefined {
  const profile = profileRischNormanTowerCandidate(node, variable, options);
  if (profile.kind === 'stop') {
    return undefined;
  }

  for (const attempt of profile.attempts) {
    const result = runAttempt(node, variable, attempt);
    if (result) {
      return result;
    }
  }

  return undefined;
}
