import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber } from '../../display/format';
import { readNumericNode } from '../domain-guards';
import type {
  CandidateValidationResult,
  DisplayDetailSection,
  DisplayDetailLinePart,
} from '../../../types/calculator';

const ce = new ComputeEngine();
const CANDIDATE_MATCH_TOLERANCE = 1e-6;

export type ExtraneousCandidateEvidence = {
  candidateLatex?: string;
  approxValue?: number;
  reason: string;
  occurrenceCount?: number;
};

function readLatexNumericValue(latex: string) {
  try {
    return readNumericNode(ce.parse(latex).N?.().json);
  } catch {
    return null;
  }
}

function exactLatexForValue(
  value: number,
  exactCandidates: readonly string[] = [],
  used: Set<number>,
) {
  for (const [index, latex] of exactCandidates.entries()) {
    if (used.has(index)) {
      continue;
    }
    const numeric = readLatexNumericValue(latex);
    if (numeric !== null && Math.abs(numeric - value) <= CANDIDATE_MATCH_TOLERANCE) {
      used.add(index);
      return latex;
    }
  }
  return undefined;
}

function formatReason(reason: string) {
  const sentences = reason
    .split(/(?<=\.)\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && !sentence.startsWith('Trust:'));
  return [...new Set(sentences)].join(' ').replace(/\.$/, '');
}

export function extraneousEvidenceFromRejectedCandidates(
  rejected: readonly CandidateValidationResult[] = [],
  options: {
    exactCandidatesLatex?: readonly string[];
  } = {},
) {
  const usedExactCandidates = new Set<number>();
  return rejected.flatMap((candidate): ExtraneousCandidateEvidence[] => {
    if (candidate.kind !== 'rejected') {
      return [];
    }
    return [{
      candidateLatex: exactLatexForValue(
        candidate.value,
        options.exactCandidatesLatex,
        usedExactCandidates,
      ),
      approxValue: candidate.value,
      reason: formatReason(candidate.reason),
    }];
  });
}

function evidenceKey(evidence: ExtraneousCandidateEvidence) {
  return JSON.stringify([
    evidence.candidateLatex ?? null,
    evidence.approxValue === undefined ? null : formatApproxNumber(evidence.approxValue),
    evidence.reason,
  ]);
}

function formatEvidenceLine(evidence: ExtraneousCandidateEvidence) {
  const pieces = ['Candidate'];
  if (evidence.candidateLatex) {
    pieces.push(evidence.candidateLatex);
  } else if (evidence.approxValue !== undefined) {
    pieces.push(`approximately ${formatApproxNumber(evidence.approxValue)}`);
  } else {
    pieces.push('unknown');
  }
  const occurrenceText = evidence.occurrenceCount && evidence.occurrenceCount > 1
    ? ` in ${evidence.occurrenceCount} search passes`
    : '';
  pieces.push(`rejected${occurrenceText}: ${evidence.reason}.`);
  return pieces.join(' ');
}

function formatEvidenceParts(evidence: ExtraneousCandidateEvidence): DisplayDetailLinePart[] {
  const parts: DisplayDetailLinePart[] = [{ kind: 'text', text: 'Candidate ' }];
  if (evidence.candidateLatex) {
    parts.push({ kind: 'math', latex: evidence.candidateLatex });
  } else if (evidence.approxValue !== undefined) {
    parts.push({ kind: 'text', text: `approximately ${formatApproxNumber(evidence.approxValue)}` });
  } else {
    parts.push({ kind: 'text', text: 'unknown' });
  }
  const occurrenceText = evidence.occurrenceCount && evidence.occurrenceCount > 1
    ? ` in ${evidence.occurrenceCount} search passes`
    : '';
  parts.push({ kind: 'text', text: ` rejected${occurrenceText}: ${evidence.reason}.` });
  return parts;
}

export function buildExtraneousSolutionsDetailSection(
  evidence: readonly ExtraneousCandidateEvidence[] = [],
): DisplayDetailSection | null {
  const deduped = [...new Map(evidence.map((entry) => [evidenceKey(entry), entry])).values()];
  if (deduped.length === 0) {
    return null;
  }
  return {
    title: 'Extraneous Solutions',
    lines: deduped.map(formatEvidenceLine),
    lineParts: deduped.map(formatEvidenceParts),
  };
}

export function appendExtraneousSolutionsDetailSection(
  detailSections: readonly DisplayDetailSection[] | undefined,
  evidence: readonly ExtraneousCandidateEvidence[] = [],
) {
  const section = buildExtraneousSolutionsDetailSection(evidence);
  if (!section) {
    return detailSections ? [...detailSections] : undefined;
  }
  const existingIndex = detailSections?.findIndex((detailSection) =>
    detailSection.title === 'Extraneous Solutions') ?? -1;
  if (!detailSections || existingIndex < 0) {
    return [...(detailSections ?? []), section];
  }
  return detailSections.map((detailSection, index) =>
    index === existingIndex
      ? {
        ...detailSection,
        lines: [...detailSection.lines, ...section.lines],
        lineParts: [
          ...(detailSection.lineParts ?? detailSection.lines.map((line) => [{ kind: 'text' as const, text: line }])),
          ...(section.lineParts ?? []),
        ],
      }
      : detailSection);
}
