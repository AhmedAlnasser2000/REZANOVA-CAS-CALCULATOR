import type {
  CanonicalResultDocumentV1,
  CanonicalResultDocumentV2,
  ResultProducerDraft,
} from '../../../types/calculator';
import {
  buildCanonicalResultDocumentV2FromProducerDraft,
  canonicalResultVersionForProducer,
  requireProvenCanonicalMathValueV2,
  type CanonicalResultProducerInputV2,
  type CanonicalResultV2MathResolver,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import type { EquationAnalysisEvidence } from '../analysis-evidence';
import {
  equationOwnedMathJsonLeavesFromDocument,
  inferEquationMathJsonRoute,
} from './math-values';

type EquationOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
type EquationV2RouteId = Extract<
  MathJsonRouteId,
  'equation.domain-boundary' | 'equation.rational-radical'
>;

function normalizedLatex(value: string) {
  return value.replace(/\s+/gu, '');
}

function equationV2Route(outcome: EquationOutcome): EquationV2RouteId | undefined {
  if (outcome.kind === 'error' && outcome.solveBadges?.includes('Range Guard')) {
    return 'equation.domain-boundary';
  }
  const routeId = inferEquationMathJsonRoute(outcome);
  return routeId === 'equation.domain-boundary' || routeId === 'equation.rational-radical'
    ? routeId
    : undefined;
}

function selectTypedSupplements(input: {
  outcome: EquationOutcome;
  document: CanonicalResultDocumentV1;
  analysisEvidence: readonly EquationAnalysisEvidence[];
}) {
  const presentations = input.outcome.exactSupplementLatex;
  if (!presentations?.length) return undefined;

  const provenLeaves = equationOwnedMathJsonLeavesFromDocument(
    input.document,
    'equation-v2-supplement-read',
  );
  const provenLatex = new Set(provenLeaves.map((leaf) => normalizedLatex(leaf.canonicalLatex)));
  const provenMathJson = new Set(provenLeaves.map((leaf) => JSON.stringify(leaf.mathJson)));
  const candidates = input.analysisEvidence
    .flatMap((entry) => entry.supplementEvidence ? [entry.supplementEvidence] : [])
    .filter((candidate, index, all) => all.findIndex((entry) =>
      entry.role === candidate.role
      && normalizedLatex(entry.canonicalLatex) === normalizedLatex(candidate.canonicalLatex)
      && JSON.stringify(entry.mathJson) === JSON.stringify(candidate.mathJson)) === index);
  const provenCandidates = candidates
    .map((candidate) => ({
      candidate,
      score: provenMathJson.has(JSON.stringify(candidate.mathJson))
        ? 3
        : provenLatex.has(normalizedLatex(candidate.canonicalLatex))
        ? 2
        : candidate.expressionLatex
          && provenLatex.has(normalizedLatex(candidate.expressionLatex))
          ? 1
          : 0,
    }))
    .filter((entry) => entry.score > 0)
    .map((entry) => entry.candidate);
  if (provenCandidates.length !== presentations.length) return undefined;
  return presentations.map((presentationLatex, index) => ({
    presentationLatex,
    evidence: provenCandidates[index],
  }));
}

export function buildEquationCanonicalResultDocumentForRuntime(input: {
  outcome: EquationOutcome;
  document: CanonicalResultDocumentV1;
  analysisEvidence: readonly EquationAnalysisEvidence[];
}): CanonicalResultDocumentV1 | CanonicalResultDocumentV2 {
  const routeId = equationV2Route(input.outcome);
  if (!routeId) return input.document;

  const typedSupplements = selectTypedSupplements(input);
  if (!typedSupplements) return input.document;

  if (canonicalResultVersionForProducer({
    routeId,
    selector: 'typedLabeledSupplement',
  }) !== 2) {
    return input.document;
  }

  const sourceLeaves = [
    ...equationOwnedMathJsonLeavesFromDocument(input.document, 'equation-v2-source-document'),
    ...typedSupplements.map(({ evidence }, index) => ({
      canonicalLatex: evidence.canonicalLatex,
      mathJson: evidence.mathJson,
      source: `equation-v2-typed-supplement:${index}`,
    })),
  ];
  const mathValue: CanonicalResultV2MathResolver = (canonicalLatex, path) => {
    const normalized = normalizedLatex(canonicalLatex);
    const leaf = sourceLeaves.find((candidate) =>
      normalizedLatex(candidate.canonicalLatex) === normalized);
    if (!leaf) {
      throw new Error(`Equation selected V2 without producer MathJSON for ${path}.`);
    }
    return requireProvenCanonicalMathValueV2({
      canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'equation',
      routeId,
      source: `${leaf.source}:${path}`,
    });
  };
  const supplements: NonNullable<CanonicalResultProducerInputV2['supplements']> =
    typedSupplements.map(({ presentationLatex, evidence }, index) => ({
      role: evidence.role,
      presentationLatex,
      math: mathValue(evidence.canonicalLatex, `supplements[${index}].math`),
    }));

  return buildCanonicalResultDocumentV2FromProducerDraft({
    draft: input.outcome,
    mathValue,
    supplements,
  });
}
