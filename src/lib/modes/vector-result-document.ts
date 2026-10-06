import type { CurrentResultProducerDraft } from '../../types/calculator/canonical-result-runtime';
import type {
  ResultProducerDraft,
} from '../../types/calculator';
import type { LinearAlgebraCanonicalEvidence } from '../linear-algebra/canonical-evidence';
import {
  attachCurrentResultToDraft,
  buildCanonicalResultFromDraft,
  buildCanonicalResultDocument,
  type CanonicalResultProducerInput,
  type CanonicalResultMathResolver,
} from '../result-contract/current/producer-draft';
import {
  proveVectorCanonicalEvidence,
  type VectorMathJsonRouteId,
} from './vector-math-values';

type VectorResultProducerInput = Exclude<ResultProducerDraft, { kind: 'prompt' }>;

function vectorDetails(
  input: VectorResultProducerInput,
  routeId: VectorMathJsonRouteId,
  evidence: LinearAlgebraCanonicalEvidence,
): CanonicalResultProducerInput['details'] {
  let evidenceIndex = 0;
  const consume = (canonicalLatex: string, path: string) => {
    const candidate = evidence.details?.[evidenceIndex];
    if (!candidate || candidate.kind !== 'math') {
      throw new Error(`Vector producer is missing aligned math evidence at ${path}.`);
    }
    evidenceIndex += 1;
    if (candidate.value.canonicalLatex !== canonicalLatex) {
      throw new Error(
        `Vector detail evidence mismatch at ${path}: displayed ${canonicalLatex}, evidence ${candidate.value.canonicalLatex}.`,
      );
    }
    return {
      kind: 'math' as const,
      math: proveVectorCanonicalEvidence(routeId, candidate.value, path),
    };
  };
  const details = input.detailSections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) {
        return parts.map((part, partIndex) => part.kind === 'math'
          ? consume(
              part.latex,
              `details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math`,
            )
          : { kind: 'text' as const, text: part.text });
      }
      const lineKind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (lineKind === 'math') {
        return [consume(line, `details[${sectionIndex}].lines[${lineIndex}][0].math`)];
      }
      if (lineKind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Vector detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
  if (evidenceIndex !== (evidence.details?.length ?? 0)) {
    throw new Error('Vector canonical detail evidence was not fully consumed.');
  }
  return details;
}

function vectorDocument(input: VectorResultProducerInput, options: {
  routeId: VectorMathJsonRouteId;
  evidence: LinearAlgebraCanonicalEvidence;
  mathValue: CanonicalResultMathResolver;
}) {
  const success = input.kind === 'success' ? input : undefined;
  const semantic = options.evidence.semanticPrimary;
  const primary = semantic?.kind === 'linear-independence' && input.exactLatex
    ? {
        kind: 'linear-independence' as const,
        presentation: {
          primaryLatex: input.exactLatex,
          ...(success?.answerRows ? { answerRows: success.answerRows } : {}),
        },
        operandVectors: semantic.operandVectors.map((operand, index) =>
          proveVectorCanonicalEvidence(options.routeId, operand, `primary.operandVectors[${index}]`)),
        independent: semantic.independent,
      }
    : undefined;
  return buildCanonicalResultFromDraft({
    draft: input,
    mathValue: options.mathValue,
    ...(primary ? { primary, answerRows: null } : {}),
    details: vectorDetails(input, options.routeId, options.evidence),
  });
}

export function createVectorResultOutcome(
  input: VectorResultProducerInput,
  options: {
    routeId: VectorMathJsonRouteId;
    evidence: LinearAlgebraCanonicalEvidence;
    mathValue: CanonicalResultMathResolver;
  },
): CurrentResultProducerDraft {
  const canonicalResult = vectorDocument(input, options);
  return attachCurrentResultToDraft(canonicalResult, input);
}

export function createVectorAngleResultOutcome(
  input: VectorResultProducerInput,
  options: {
    routeId: VectorMathJsonRouteId;
    evidence: LinearAlgebraCanonicalEvidence;
    mathValue: CanonicalResultMathResolver;
  },
): CurrentResultProducerDraft {
  const semantic = options.evidence.semanticPrimary;
  if (semantic?.kind !== 'angle-quantity' || !input.exactLatex) {
    throw new Error('Vector gradian angle is missing aligned angle-quantity evidence.');
  }
  const magnitude = proveVectorCanonicalEvidence(
    options.routeId,
    semantic.magnitude,
    'primary.magnitude',
  );
  const inherited = vectorDocument(input, {
    ...options,
    mathValue: (canonicalLatex, path) => path === 'primary.value'
      ? magnitude
      : options.mathValue(canonicalLatex, path),
  });
  const { version: _version, primary: _primary, ...surface } = inherited;
  void _version;
  void _primary;
  const canonicalResult = buildCanonicalResultDocument({
    ...surface,
    primary: {
      kind: 'angle-quantity',
      presentation: { primaryLatex: input.exactLatex },
      magnitude,
      unit: semantic.unit,
    },
  } as CanonicalResultProducerInput);
  const { actions: _actions, ...producerDraft } = input;
  void _actions;
  return attachCurrentResultToDraft(canonicalResult, producerDraft);
}
