import { mergeExactSupplementLatex } from '../../../algebra/exact-supplements';
import type { AntiderivativeBackcheck } from '../../../calculus/engine/verification';
import type { ExactSupplementEntry } from '../../../../types/calculator/exact-supplement-types';
import {
  solveRischNormanExponentialAnsatz,
  type RischNormanAnsatzFact,
} from './exponential-ansatz';
import { solveRischNormanExpSinCosAnsatz } from './exp-sincos-ansatz';
import { solveRischNormanLogCorrection } from './log-correction';
import { solveRischNormanSinCosAnsatz } from './sincos-ansatz';

type RischNormanDispatchProbeResult = {
  exactLatex: string;
  verification: AntiderivativeBackcheck;
  exactSupplementLatex?: string[];
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

export function tryRischNormanDispatchProbe(
  node: unknown,
  variable: string,
): RischNormanDispatchProbeResult | undefined {
  const exponential = solveRischNormanExponentialAnsatz(node, variable);
  if (exponential.kind === 'success') {
    return {
      exactLatex: exponential.exactLatex,
      verification: proofVerification('verified by internal Risch-Norman exponential ansatz rule proof'),
      exactSupplementLatex: supplementLatexForFacts(exponential.facts),
    };
  }

  const sinCos = solveRischNormanSinCosAnsatz(node, variable);
  if (sinCos.kind === 'success') {
    return {
      exactLatex: sinCos.exactLatex,
      verification: proofVerification('verified by internal Risch-Norman sine-cosine ansatz rule proof'),
      exactSupplementLatex: supplementLatexForFacts(sinCos.facts),
    };
  }

  const expSinCos = solveRischNormanExpSinCosAnsatz(node, variable);
  if (expSinCos.kind === 'success') {
    return {
      exactLatex: expSinCos.exactLatex,
      verification: proofVerification('verified by internal Risch-Norman exponential-sine-cosine ansatz rule proof'),
      exactSupplementLatex: supplementLatexForFacts(expSinCos.facts),
    };
  }

  const logCorrection = solveRischNormanLogCorrection(node, variable);
  if (logCorrection.kind === 'success') {
    return {
      exactLatex: logCorrection.exactLatex,
      verification: proofVerification('verified by internal Risch-Norman affine-log correction rule proof'),
      exactSupplementLatex: supplementLatexForFacts(logCorrection.facts),
    };
  }

  return undefined;
}
