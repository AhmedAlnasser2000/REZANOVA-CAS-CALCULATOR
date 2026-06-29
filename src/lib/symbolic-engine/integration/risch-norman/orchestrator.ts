import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import type { IntegralStrategy } from '../types';
import { tryRischNormanAffineRationalCorrectionRule } from './affine-rational-correction';
import {
  solveRischNormanExponentialAnsatz,
  type RischNormanAnsatzFact,
} from './exponential-ansatz';
import { solveRischNormanExpSinCosAnsatz } from './exp-sincos-ansatz';
import { tryRischNormanHermiteReductionRule } from './hermite-reduction';
import { solveRischNormanLogCorrection } from './log-correction';
import { tryRischNormanLogDerivativeRule } from './log-derivative';
import { solveRischNormanLogRationalCorrection } from './log-rational-correction';
import { tryRischNormanLrtRationalIntegrationRule } from './lrt-log-part';
import { solveRischNormanSinCosAnsatz } from './sincos-ansatz';
import {
  generateRischNormanTowerBasis,
  type RischNormanTowerBasisFamily,
  type RischNormanTowerBasisItem,
  type RischNormanTowerBasisOptions,
  type RischNormanTowerBasisProfile,
} from './tower-basis-generator';

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

export type RischNormanOrchestratorOptions = RischNormanTowerBasisOptions;
export type RischNormanTowerAttemptFamily = RischNormanTowerBasisFamily;
export type RischNormanTowerAttempt = RischNormanTowerBasisItem;
export type RischNormanTowerProfile = RischNormanTowerBasisProfile;

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

export function profileRischNormanTowerCandidate(
  node: unknown,
  variable: string,
  options?: RischNormanOrchestratorOptions,
): RischNormanTowerProfile {
  return generateRischNormanTowerBasis(node, variable, options);
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
