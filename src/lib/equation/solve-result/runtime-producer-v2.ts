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

const SUPPLEMENT_PRESENTATION_PREFIXES = {
  condition: '\\text{Conditions: } ',
  exclusion: '\\text{Exclusions: } ',
} as const;

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

function labeledSupplementPresentationRole(presentationLatex: string) {
  if (presentationLatex.startsWith(SUPPLEMENT_PRESENTATION_PREFIXES.condition)) {
    return 'condition' as const;
  }
  if (presentationLatex.startsWith(SUPPLEMENT_PRESENTATION_PREFIXES.exclusion)) {
    return 'exclusion' as const;
  }
  return undefined;
}

function containsTarget(node: unknown, target = 'x'): boolean {
  if (node === target) return true;
  return Array.isArray(node) && node.slice(1).some((child) => containsTarget(child, target));
}

function evidenceIdentity(input: {
  evidence: SupplementEvidence;
  presentationLatex?: string;
}) {
  return [
    input.evidence.role,
    normalizedLatex(
      input.presentationLatex
      ?? input.evidence.expressionLatex
      ?? input.evidence.canonicalLatex,
    ),
  ].join(':');
}

function typedSupplements(input: {
  outcome: EquationOutcome;
  analysisEvidence: readonly EquationAnalysisEvidence[];
  routeId: TypedSupplementRouteId;
}) {
  const presentations = input.outcome.exactSupplementLatex ?? [];
  const candidates = input.analysisEvidence
    .flatMap((entry) => entry.supplementEvidence && containsTarget(entry.supplementEvidence.mathJson) ? [{
      evidence: entry.supplementEvidence,
      presentationLatex: entry.latex,
      sourceRoute: entry.sourceRoute,
    }] : []);
  const guardedCandidates = candidates.filter((entry) =>
    entry.sourceRoute === 'guarded-domain-constraint');
  const eligible = guardedCandidates.length > 0 ? guardedCandidates : candidates;
  const identities = new Map<string, string>();
  for (const entry of eligible) {
    const identity = evidenceIdentity(entry);
    const tree = JSON.stringify(entry.evidence.mathJson);
    const existing = identities.get(identity);
    if (existing && existing !== tree) {
      throw new Error(`Equation selected conflicting typed V2 supplement evidence for ${identity}.`);
    }
    identities.set(identity, tree);
  }
  const selected = eligible.filter((entry, index, all) => all.findIndex((candidate) =>
    supplementEvidenceKey(candidate.evidence) === supplementEvidenceKey(entry.evidence)) === index);
  if (selected.length === 0) {
    throw new Error('Equation selected typed V2 supplements without producer-owned evidence.');
  }
  const labeledRoles = new Set(presentations.flatMap((presentation) => {
    const role = labeledSupplementPresentationRole(presentation);
    return role ? [role] : [];
  }));
  if (labeledRoles.size === 0 && presentations.length !== selected.length) {
    throw new Error(
      `Equation typed V2 supplement presentation/evidence count mismatch (${presentations.length}/${selected.length}).`,
    );
  }
  const roleCounts = new Map<SupplementEvidence['role'], number>();
  for (const entry of selected) {
    roleCounts.set(entry.evidence.role, (roleCounts.get(entry.evidence.role) ?? 0) + 1);
  }
  return selected.map((entry, index) => {
    const cleanPresentation = entry.presentationLatex ?? entry.evidence.canonicalLatex;
    const onlyEvidence = selected.length === 1 && presentations.length === 1;
    const presentationLatex = onlyEvidence
      ? presentations[0]
      : roleCounts.get(entry.evidence.role) === 1 && labeledRoles.has(entry.evidence.role)
        ? `${SUPPLEMENT_PRESENTATION_PREFIXES[entry.evidence.role]}${cleanPresentation}`
        : cleanPresentation;
    return {
      evidence: entry.evidence,
      canonicalLatex: cleanPresentation,
      presentationLatex,
      source: `equation-runtime-v2-supplement:${index}`,
    };
  });
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
    ...(selectedSupplements ?? []).map(({ canonicalLatex, evidence, source }) => ({
      canonicalLatex,
      mathJson: evidence.mathJson,
      source,
    })),
  ];
  const mathValue: CanonicalResultV2MathResolver = (canonicalLatex, path) => {
    const matching = leaves.filter((candidate) =>
      normalizedLatex(candidate.canonicalLatex) === normalizedLatex(canonicalLatex));
    const distinctTrees = new Set(matching.map((candidate) => JSON.stringify(candidate.mathJson)));
    if (distinctTrees.size > 1) {
      throw new Error(`Equation selected V2 with conflicting producer MathJSON for ${path}.`);
    }
    const leaf = matching[0];
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
    ({ canonicalLatex, evidence, presentationLatex }, index) => ({
      role: evidence.role,
      presentationLatex,
      math: mathValue(canonicalLatex, `supplements[${index}].math`),
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
