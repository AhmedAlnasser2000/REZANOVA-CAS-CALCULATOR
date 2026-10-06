import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';
import type { CanonicalResultMathResolver } from '../../result-contract/current/producer-draft';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';

export type CalculateOwnedMathJsonLeaf = {
  canonicalLatex: string;
  mathJson: unknown;
  source: string;
};

/** Exact lookup of native evidence. Missing leaves fail closed; no display reparsing. */
export function calculateMathResolver(
  routeId: Extract<MathJsonRouteId, `calculate.${string}`>,
  leaves: readonly CalculateOwnedMathJsonLeaf[],
): CanonicalResultMathResolver {
  return (canonicalLatex, path) => {
    const candidates = leaves.filter(leaf => leaf.canonicalLatex === canonicalLatex);
    if (!candidates.length) throw new Error(`Calculate is missing native mathematical evidence at ${path}: ${canonicalLatex}`);
    // Multiple routes may carry equivalent trees. Every selected proof is checked
    // against the producer's presentation; no missing/invalid proof is guessed.
    const leaf = candidates[0];
    try {
      return requireProvenCanonicalMathValueV2({
        canonicalLatex, mathJson: leaf.mathJson, owner: 'calculate', routeId, source: leaf.source,
      });
    } catch (cause) {
      throw new Error(`Calculate native mathematics failed at ${path} (${leaf.source}): ${canonicalLatex}`, { cause });
    }
  };
}
