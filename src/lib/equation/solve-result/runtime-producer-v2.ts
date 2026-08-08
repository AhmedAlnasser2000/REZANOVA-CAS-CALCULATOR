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
import { buildEquationCanonicalResultDocumentForRuntime as buildExistingEquationV2Document } from './producer-v2';

type EquationOutcome = Exclude<ResultProducerDraft, { kind: 'prompt' }>;
type TypedSupplementRouteId = Extract<
  MathJsonRouteId,
  'equation.domain-boundary' | 'equation.rational-radical' | 'equation.trig-exp-log'
>;
type RuntimeSelection =
  | {
      routeId: Extract<MathJsonRouteId, 'equation.linear' | 'equation.polynomial' | 'equation.domain-boundary'>;
      selector: 'nativeSystem' | 'directPolynomialSystem' | 'directLocus';
    }
  | {
      routeId: TypedSupplementRouteId;
      selector: 'typedLabeledSupplement';
    };
type SupplementEvidence = NonNullable<EquationAnalysisEvidence['supplementEvidence']>;

function normalizedLatex(value: string) {
  return value.replace(/\s+/gu, '');
}

function typedSupplementRoute(outcome: EquationOutcome): TypedSupplementRouteId | undefined {
  if (!outcome.exactSupplementLatex?.length) return undefined;
  if (outcome.solveBadges?.some((badge) => badge === 'Log Combine' || badge === 'Log Quotient')) {
    return 'equation.trig-exp-log';
  }
  const routeId = inferEquationMathJsonRoute(outcome);
  return routeId === 'equation.domain-boundary' || routeId === 'equation.rational-radical'
    ? routeId
    : undefined;
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
  const supplementRoute = typedSupplementRoute(outcome);
  if (supplementRoute) {
    return { routeId: supplementRoute, selector: 'typedLabeledSupplement' };
  }
  return undefined;
}

function supplementEvidenceKey(evidence: SupplementEvidence) {
  return [
    evidence.role,
    normalizedLatex(evidence.canonicalLatex),
    JSON.stringify(evidence.mathJson),
  ].join(':');
}

function typedSupplements(input: {
  outcome: EquationOutcome;
  analysisEvidence: readonly EquationAnalysisEvidence[];
  routeId: TypedSupplementRouteId;
}) {
  const presentations = input.outcome.exactSupplementLatex ?? [];
  const candidates = input.analysisEvidence
    .flatMap((entry) => entry.supplementEvidence ? [{
      evidence: input.routeId === 'equation.trig-exp-log' && entry.latex
        ? { ...entry.supplementEvidence, canonicalLatex: entry.latex }
        : entry.supplementEvidence,
      sourceRoute: entry.sourceRoute,
    }] : []);
  const guardedCandidates = candidates.filter((entry) =>
    entry.sourceRoute === 'guarded-domain-constraint');
  const evidence = (guardedCandidates.length > 0 ? guardedCandidates : candidates)
    .map((entry) => entry.evidence)
    .filter((entry, index, all) => all.findIndex((candidate) =>
      supplementEvidenceKey(candidate) === supplementEvidenceKey(entry)) === index);
  if (evidence.length === 0) {
    throw new Error('Equation selected typed V2 supplements without producer-owned evidence.');
  }
  if (presentations.length !== 1 && presentations.length !== evidence.length) {
    throw new Error(
      `Equation typed V2 supplement presentation/evidence count mismatch (${presentations.length}/${evidence.length}).`,
    );
  }
  return evidence.map((entry, index) => ({
    evidence: entry,
    presentationLatex: presentations.length === evidence.length
      ? presentations[index]
      : entry.canonicalLatex,
  }));
}

export function buildEquationRuntimeCanonicalResultDocument(input: {
  outcome: EquationOutcome;
  document: CanonicalResultDocumentV1;
  analysisEvidence: readonly EquationAnalysisEvidence[];
}): CanonicalResultDocumentV1 | CanonicalResultDocumentV2 {
  const selection = selectionFor(input.outcome);
  if (!selection || canonicalResultVersionForProducer(selection) !== 2) {
    return buildExistingEquationV2Document(input);
  }
  const selectedSupplements = selection.selector === 'typedLabeledSupplement'
    ? typedSupplements({ ...input, routeId: selection.routeId })
    : undefined;
  const leaves = [
    ...(input.outcome.primaryMath?.mathJson === undefined ? [] : [{
      canonicalLatex: input.outcome.primaryMath.canonicalLatex,
      mathJson: input.outcome.primaryMath.mathJson,
      source: 'equation-runtime-v2-primary',
    }]),
    ...equationOwnedMathJsonLeavesFromDocument(input.document, 'equation-runtime-v2-document'),
    ...(selectedSupplements ?? []).map(({ evidence }, index) => ({
      canonicalLatex: evidence.canonicalLatex,
      mathJson: evidence.mathJson,
      source: `equation-runtime-v2-supplement:${index}`,
    })),
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
  const supplements: CanonicalResultProducerInputV2['supplements'] = selectedSupplements?.map(
    ({ evidence, presentationLatex }, index) => ({
      role: evidence.role,
      presentationLatex,
      math: mathValue(evidence.canonicalLatex, `supplements[${index}].math`),
    }),
  );
  return buildCanonicalResultDocumentV2FromProducerDraft({
    draft: selection.selector === 'typedLabeledSupplement'
      ? input.outcome
      : { ...input.outcome, resolvedInputLatex: undefined },
    mathValue,
    ...(supplements ? { supplements } : {}),
  });
}
