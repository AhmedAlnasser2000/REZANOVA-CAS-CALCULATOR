import type {
  CanonicalResultDocumentV1,
  CanonicalResultDocumentV2,
  CanonicalMathValueV1,
  ResultProducerDraft,
  SerializableMathJson,
} from '../../../types/calculator';
import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  buildCanonicalResultDocumentV2FromProducerDraft,
  canonicalResultVersionForProducer,
  requireProvenCanonicalMathValueV2,
  type CanonicalResultV2MathResolver,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import type { EquationAnalysisEvidence } from '../analysis-evidence';
import { equationConstraintsFromLatex, type EquationConstraint } from '../solution/constraints';
import { equationOwnedMathJsonLeavesFromDocument } from './math-values';
import { buildEquationCanonicalResultDocumentForRuntime as buildExistingEquationV2Document } from './producer-v2';

type EquationOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
type RuntimeSelection = {
  routeId: Extract<MathJsonRouteId, 'equation.linear' | 'equation.polynomial' | 'equation.domain-boundary'>;
  selector: 'nativeSystem' | 'directPolynomialSystem' | 'directLocus';
};
type ProvenSupplementMath = {
  canonicalLatex: string;
  mathJson: SerializableMathJson;
};
const ce = new ComputeEngine();

function normalizedLatex(value: string) {
  return value.replace(/\s+/gu, '');
}

function selectionFor(outcome: EquationOutcome): RuntimeSelection | undefined {
  if (
    (outcome.kind === 'success' && outcome.systemReadback?.source?.startsWith('equation-linear-'))
    || (outcome.detailSections?.some((section) => section.title === 'System Evidence')
      && /^(?:2|3)x(?:2|3)$/u.test(outcome.title))
  ) return { routeId: 'equation.linear', selector: 'nativeSystem' };
  if (
    (outcome.kind === 'success' && outcome.systemReadback?.source?.startsWith('equation-polynomial-2x2-'))
    || (outcome.title === 'Polynomial 2x2' && outcome.detailSections?.some((section) => section.title === 'Square Substitution'))
  ) return { routeId: 'equation.polynomial', selector: 'directPolynomialSystem' };
  if (
    outcome.kind === 'success'
    && outcome.detailSections?.some((section) => section.title === 'Locus Meaning')
    && outcome.answerRows?.label !== 'Recognized locus'
  ) return { routeId: 'equation.domain-boundary', selector: 'directLocus' };
  return undefined;
}

function relationMathJson(constraint: EquationConstraint): SerializableMathJson | undefined {
  if (!constraint.expressionLatex || !constraint.relation) return undefined;
  const expression = ce.parse(constraint.expressionLatex).json as SerializableMathJson;
  switch (constraint.relation) {
    case '\\ne0':
      return ['NotEqual', expression, 0];
    case '\\ge0':
      return ['GreaterEqual', expression, 0];
    case '>0':
      return ['Greater', expression, 0];
    case '=0':
      return ['Equal', expression, 0];
    case '<0':
      return ['Less', expression, 0];
    default:
      return undefined;
  }
}

function splitLegacyGroupedSupplement(
  supplement: CanonicalMathValueV1,
): CanonicalMathValueV1[] {
  if (!/\\text\{(?:Conditions|Exclusions): \}/u.test(supplement.canonicalLatex)) {
    return [supplement];
  }
  const entries = equationConstraintsFromLatex([supplement.canonicalLatex])
    .map((constraint) => {
      const mathJson = relationMathJson(constraint);
      return constraint.expressionLatex && constraint.relation && mathJson
        ? {
            canonicalLatex: `${constraint.expressionLatex}${constraint.relation}`,
            mathJson,
        }
        : undefined;
    })
    .filter((entry): entry is ProvenSupplementMath => entry !== undefined);
  return entries.length > 0 ? entries : [supplement];
}

function normalizeLegacyGroupedSupplements(
  document: CanonicalResultDocumentV1 | CanonicalResultDocumentV2,
): CanonicalResultDocumentV1 | CanonicalResultDocumentV2 {
  if (document.version !== 1 || !document.supplements?.length) return document;
  const supplements = document.supplements.flatMap(splitLegacyGroupedSupplement);
  if (
    supplements.length === document.supplements.length
    && supplements.every((supplement, index) => supplement === document.supplements?.[index])
  ) {
    return document;
  }
  return {
    ...document,
    supplements,
  };
}

export function buildEquationRuntimeCanonicalResultDocument(input: {
  outcome: EquationOutcome;
  document: CanonicalResultDocumentV1;
  analysisEvidence: readonly EquationAnalysisEvidence[];
}): CanonicalResultDocumentV1 | CanonicalResultDocumentV2 {
  const selection = selectionFor(input.outcome);
  if (!selection || canonicalResultVersionForProducer(selection) !== 2) {
    return normalizeLegacyGroupedSupplements(buildExistingEquationV2Document(input));
  }
  const leaves = [
    ...(input.outcome.primaryMath?.mathJson === undefined ? [] : [{
      canonicalLatex: input.outcome.primaryMath.canonicalLatex,
      mathJson: input.outcome.primaryMath.mathJson,
      source: 'equation-runtime-v2-primary',
    }]),
    ...equationOwnedMathJsonLeavesFromDocument(input.document, 'equation-runtime-v2-document'),
  ];
  const mathValue: CanonicalResultV2MathResolver = (canonicalLatex, path) => {
    const leaf = leaves.find((candidate) => normalizedLatex(candidate.canonicalLatex) === normalizedLatex(canonicalLatex));
    if (!leaf) throw new Error(`Equation selected V2 without producer MathJSON for ${path}.`);
    return requireProvenCanonicalMathValueV2({
      canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'equation',
      routeId: selection.routeId,
      source: `${leaf.source}:${path}`,
    });
  };
  return buildCanonicalResultDocumentV2FromProducerDraft({
    draft: { ...input.outcome, resolvedInputLatex: undefined },
    mathValue,
  });
}
