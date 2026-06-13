import { exactPolynomialToNode } from '../../algebra/polynomial-core';
import { factorBoundedPolynomialAst } from '../../algebra/polynomial-factor-solve';
import { normalizeAst } from '../normalize';
import { compactRepeatedProductFactors, termKey } from '../patterns';
import {
  collectVariableSymbols,
  expandOnce,
  findCandidatePowers,
  mapCarrierVariable,
} from './carriers';
import {
  factorLowDegreeCarrierPolynomial,
  refineCarrierFactorizationNode,
} from './factorization';
import {
  buildCarrierPolynomial,
  isRecognizedMixedFamily,
} from './polynomial';
import type { MixedCarrierFactorization } from './types';

export function factorMixedCarrierAst(ast: unknown): MixedCarrierFactorization | null {
  const variables = [...collectVariableSymbols(ast)];
  if (variables.length !== 1) {
    return null;
  }

  const variable = variables[0];
  const expanded = expandOnce(ast);
  const candidates = findCandidatePowers(expanded, variable);
  if (candidates.length === 0) {
    return null;
  }

  for (const candidate of candidates) {
    const polynomial = buildCarrierPolynomial(expanded, candidate);
    if (!polynomial || !isRecognizedMixedFamily(polynomial, candidate)) {
      continue;
    }

    const polynomialNode = exactPolynomialToNode(polynomial);
    const lowDegreeFactorization = factorLowDegreeCarrierPolynomial(polynomial);
    const factorizedPolynomialNode = lowDegreeFactorization
      ?? (() => {
        const bounded = factorBoundedPolynomialAst(polynomialNode, 'u');
        return bounded ? refineCarrierFactorizationNode(bounded.factorizedNode, 'u') : null;
      })();
    if (!factorizedPolynomialNode) {
      continue;
    }

    const mapped = mapCarrierVariable(factorizedPolynomialNode, candidate);
    const compacted = compactRepeatedProductFactors(normalizeAst(mapped));
    if (termKey(compacted) === termKey(normalizeAst(ast))) {
      continue;
    }

    return {
      node: compacted,
      strategy: 'mixed-carrier-factorization',
      carrierNode: candidate.carrierNode,
      polynomialNode,
    };
  }

  return null;
}
