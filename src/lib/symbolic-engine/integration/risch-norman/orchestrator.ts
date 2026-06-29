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
import { solveRischNormanLogCorrection } from './log-correction';
import { tryRischNormanLogDerivativeRule } from './log-derivative';
import { solveRischNormanLogRationalCorrection } from './log-rational-correction';
import { solveRischNormanSinCosAnsatz } from './sincos-ansatz';

export type RischNormanOrchestratorFamily =
  | 'affine-exp'
  | 'positive-base-exp'
  | 'affine-sin-cos'
  | 'affine-exp-sin-cos'
  | 'affine-log-correction'
  | 'affine-log-rational-correction'
  | 'symbolic-log-derivative'
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

export function tryRischNormanOrchestrator(
  node: unknown,
  variable: string,
  options?: RischNormanOrchestratorOptions,
): RischNormanOrchestratorResult | undefined {
  if (allowsStrategy(options, 'integration-by-parts')) {
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
  }

  if (allowsStrategy(options, 'partial-fractions')) {
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

  return undefined;
}
