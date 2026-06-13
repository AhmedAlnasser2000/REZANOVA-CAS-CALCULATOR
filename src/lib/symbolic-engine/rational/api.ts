import { ComputeEngine } from '@cortex-js/compute-engine';
import { assumptionFactsFromRationalExclusions } from '../../algebra/assumption-adapters';
import { normalizeAst } from '../normalize';
import { boxLatex, flattenAdd, termKey } from '../patterns';
import {
  buildCombinedDenominator,
  buildCombinedNumerator,
  buildExclusionMetadata,
  cancelCommonFactors,
  factorForMode,
  factorMapMaximum,
} from './assembly';
import { compactRepeatedVariableLatex } from './latex';
import { detectSingleVariable, parseRationalTerm } from './parsing';
import { lcm } from './scalars';
import type { RationalNormalizationMode, RationalNormalizationResult, RationalTerm } from './types';

const ce = new ComputeEngine();

export function normalizeExactRationalNode(
  node: unknown,
  mode: RationalNormalizationMode,
): RationalNormalizationResult | null {
  const normalizedInput = normalizeAst(node);
  const variable = detectSingleVariable(normalizedInput);
  if (variable === null) {
    return null;
  }

  const terms = flattenAdd(normalizedInput).map((term) => parseRationalTerm(term, variable ?? undefined));
  if (terms.some((term) => term === null)) {
    return null;
  }

  const validTerms = terms as RationalTerm[];
  const denominatorLcm = validTerms.reduce((current, term) => lcm(current, term.scalar.denominator), 1);
  const lcdFactors = factorMapMaximum(validTerms);
  const rawNumerator = buildCombinedNumerator(validTerms, denominatorLcm, lcdFactors);
  const rawDenominator = buildCombinedDenominator(denominatorLcm, lcdFactors);

  let numeratorNode = mode === 'factor' ? factorForMode(rawNumerator) : rawNumerator;
  let denominatorNode = rawDenominator
    ? mode === 'factor'
      ? factorForMode(rawDenominator)
      : factorForMode(rawDenominator)
    : undefined;

  if (mode === 'simplify') {
    const cancelled = cancelCommonFactors(rawNumerator, rawDenominator);
    numeratorNode = cancelled.numeratorNode;
    denominatorNode = cancelled.denominatorNode;
  }

  const normalizedNode = denominatorNode
    ? normalizeAst(['Divide', numeratorNode, denominatorNode])
    : normalizeAst(numeratorNode);
  const exclusionMetadata = buildExclusionMetadata(validTerms);
  const normalizedLatex = compactRepeatedVariableLatex(boxLatex(normalizedNode), variable ?? undefined);

  return {
    changed: termKey(normalizedNode) !== termKey(normalizedInput),
    normalizedNode,
    normalizedLatex,
    numeratorNode,
    numeratorLatex: compactRepeatedVariableLatex(boxLatex(numeratorNode), variable ?? undefined),
    denominatorNode,
    denominatorLatex: denominatorNode
      ? compactRepeatedVariableLatex(boxLatex(denominatorNode), variable ?? undefined)
      : undefined,
    exclusionConstraints: exclusionMetadata.exclusionConstraints,
    exactSupplementLatex: exclusionMetadata.exactSupplementLatex,
    assumptionFacts: assumptionFactsFromRationalExclusions(exclusionMetadata.exclusionConstraints),
    variable: variable ?? undefined,
  };
}

export function normalizeExactRationalLatex(
  latex: string,
  mode: RationalNormalizationMode,
) {
  try {
    const parsed = ce.parse(latex);
    return normalizeExactRationalNode(parsed.json, mode);
  } catch {
    return null;
  }
}
