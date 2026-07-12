import type { ModeId } from '../../types/calculator';
import { canonicalizeMathInput } from '../input/input-canonicalization';
import type {
  NotebookInlineMathSpan,
  NotebookTextBlock,
  NotebookTextMark,
  NotebookTextMarkKind,
  NotebookWorkspaceTarget,
} from './types';

type NotebookMathDetectionOptions = {
  mode?: NotebookWorkspaceTarget;
  screenHint?: string;
};

type CandidateRange = {
  start: number;
  end: number;
  sourceText: string;
  confidence: NotebookInlineMathSpan['confidence'];
};

const MATH_KEYWORD_PATTERN =
  /\b(?:lim|limit|sin|cos|tan|csc|sec|cot|ln|log|sqrt|abs|integral|int|sum|product|prod|solve|factor|expand)\b/i;
const MATH_SYMBOL_PATTERN = /(?:\\[A-Za-z]+|[=<>^*/]|->|<=|>=|!=|≈|≤|≥|∞|π)/;
const WORD_BOUNDARY_PATTERN = /[\n.;]/g;
const DELIMITED_MATH_PATTERN = /(?:\$([^$]+)\$|\\\(([^)]+)\\\))/g;
const EMBEDDED_SPLIT_PATTERN =
  /\b(?:and|or|before|after|then|because|where|with|checking|roots?)\b|,/gi;
const LEADING_PROSE_PATTERN =
  /^(?:(?:solve|use|try|compute|evaluate|show|prove|check|simplify|factor|expand)\s+)+/i;
const EXAMPLE_LEAD_PATTERN = /\b(?:such as|like|including)\b\s*/i;

function normalizeCandidateSource(sourceText: string) {
  return sourceText
    .trim()
    .replace(/^\$/, '')
    .replace(/\$$/, '')
    .replace(/^\\\(/, '')
    .replace(/\\\)$/, '')
    .replace(/→/g, '\\to ')
    .replace(/\s+/g, ' ');
}

function hasMathSignal(sourceText: string) {
  const trimmed = sourceText.trim();
  if (trimmed.length < 2 || trimmed.length > 180) {
    return false;
  }

  const hasLetterOrDigit = /[A-Za-z0-9]/.test(trimmed);
  return hasLetterOrDigit && (MATH_SYMBOL_PATTERN.test(trimmed) || MATH_KEYWORD_PATTERN.test(trimmed));
}

function trimmedRange(sourceText: string, start: number): CandidateRange | null {
  const leading = sourceText.search(/\S/);
  if (leading < 0) {
    return null;
  }
  const rightTrimmedLength = sourceText.trimEnd().length;
  const raw = sourceText.slice(leading, rightTrimmedLength);
  const proseLead = raw.match(LEADING_PROSE_PATTERN)?.[0] ?? '';
  const candidate = raw.slice(proseLead.length).trim();
  const candidateLeading = raw.slice(proseLead.length).search(/\S/);
  if (candidateLeading < 0 || !hasMathSignal(candidate)) {
    return null;
  }

  return {
    start: start + leading + proseLead.length + candidateLeading,
    end: start + leading + proseLead.length + candidateLeading + candidate.length,
    sourceText: candidate,
    confidence: MATH_KEYWORD_PATTERN.test(candidate) ? 'high' : 'medium',
  };
}

function collectEmbeddedRanges(sourceText: string, sourceStart: number): CandidateRange[] {
  const ranges: CandidateRange[] = [];
  const exampleLead = sourceText.match(EXAMPLE_LEAD_PATTERN);
  let segmentStart = exampleLead?.index == null
    ? 0
    : exampleLead.index + exampleLead[0].length;

  for (const separator of sourceText.matchAll(EMBEDDED_SPLIT_PATTERN)) {
    const separatorStart = separator.index ?? sourceText.length;
    const segment = sourceText.slice(segmentStart, separatorStart);
    const range = trimmedRange(segment, sourceStart + segmentStart);
    if (range) {
      ranges.push(range);
    }
    segmentStart = separatorStart + separator[0].length;
  }

  const tail = sourceText.slice(segmentStart);
  const tailRange = trimmedRange(tail, sourceStart + segmentStart);
  if (tailRange) {
    ranges.push(tailRange);
  }

  return ranges;
}

function collectDelimitedRanges(text: string): CandidateRange[] {
  return [...text.matchAll(DELIMITED_MATH_PATTERN)].flatMap((match) => {
    const raw = match[1] ?? match[2] ?? '';
    if (!raw.trim() || match.index == null) {
      return [];
    }
    const delimiterOffset = match[0].startsWith('$') ? 1 : 2;
    return [{
      start: match.index + delimiterOffset,
      end: match.index + delimiterOffset + raw.length,
      sourceText: raw,
      confidence: 'high' as const,
    }];
  });
}

function collectSentenceRanges(text: string): CandidateRange[] {
  const ranges: CandidateRange[] = [];
  let start = 0;
  const separators = [...text.matchAll(WORD_BOUNDARY_PATTERN)];

  for (const separator of separators) {
    const end = separator.index ?? text.length;
    const sourceText = text.slice(start, end).trim();
    const leading = text.slice(start, end).search(/\S/);
    if (leading >= 0 && hasMathSignal(sourceText)) {
      const embeddedRanges = collectEmbeddedRanges(sourceText, start + leading);
      ranges.push(...(embeddedRanges.length > 0
        ? embeddedRanges
        : [{
            start: start + leading,
            end: start + leading + sourceText.length,
            sourceText,
            confidence: MATH_KEYWORD_PATTERN.test(sourceText) ? 'high' as const : 'medium' as const,
          }]));
    }
    start = end + separator[0].length;
  }

  const sourceText = text.slice(start).trim();
  const leading = text.slice(start).search(/\S/);
  if (leading >= 0 && hasMathSignal(sourceText)) {
    const embeddedRanges = collectEmbeddedRanges(sourceText, start + leading);
    ranges.push(...(embeddedRanges.length > 0
      ? embeddedRanges
      : [{
          start: start + leading,
          end: start + leading + sourceText.length,
          sourceText,
          confidence: MATH_KEYWORD_PATTERN.test(sourceText) ? 'high' as const : 'medium' as const,
        }]));
  }

  return ranges;
}

function rangesOverlap(left: CandidateRange, right: CandidateRange) {
  return left.start < right.end && right.start < left.end;
}

function mergeCandidateRanges(ranges: CandidateRange[]) {
  const merged: CandidateRange[] = [];
  for (const range of [...ranges].sort((left, right) => left.start - right.start)) {
    if (merged.some((candidate) => rangesOverlap(candidate, range))) {
      continue;
    }
    merged.push(range);
  }
  return merged;
}

function normalizeMode(mode: NotebookWorkspaceTarget | undefined): NotebookWorkspaceTarget {
  return mode ?? 'calculate';
}

export function normalizeNotebookMathSource(
  sourceText: string,
  options: NotebookMathDetectionOptions = {},
) {
  const mode = normalizeMode(options.mode);
  const preservedSource = normalizeCandidateSource(sourceText);
  const canonicalized = canonicalizeMathInput(preservedSource, {
    mode: mode as ModeId,
    screenHint: options.screenHint,
    liveAssist: true,
  });
  return {
    sourceText: preservedSource,
    latex: canonicalized.ok ? canonicalized.canonicalLatex : preservedSource,
    workspaceTarget: mode,
    recognized: canonicalized.ok,
  };
}

export function detectNotebookMathCandidates(
  text: string,
  options: NotebookMathDetectionOptions = {},
): NotebookInlineMathSpan[] {
  const mode = normalizeMode(options.mode);
  return mergeCandidateRanges([
    ...collectDelimitedRanges(text),
    ...collectSentenceRanges(text),
  ]).map((range, index) => {
    const normalized = normalizeNotebookMathSource(range.sourceText, options);

    return {
      id: `candidate.${range.start}.${range.end}.${index}`,
      status: 'pending' as const,
      start: range.start,
      end: range.end,
      sourceText: normalized.sourceText,
      normalizedLatex: normalized.latex,
      parser: 'canonicalizeMathInput',
      mode,
      confidence: normalized.recognized ? range.confidence : 'medium',
    };
  });
}

export function acceptNotebookMathCandidate(
  block: NotebookTextBlock,
  candidate: NotebookInlineMathSpan,
): NotebookTextBlock {
  const existing = block.mathSpans.some((span) =>
    span.start === candidate.start
      && span.end === candidate.end
      && span.sourceText === candidate.sourceText);
  if (existing) {
    return block;
  }

  return {
    ...block,
    mathSpans: [
      ...block.mathSpans,
      {
        ...candidate,
        id: `math.${candidate.start}.${candidate.end}.${block.mathSpans.length + 1}`,
        status: 'accepted' as const,
      },
    ].sort((left, right) => left.start - right.start),
  };
}

export function updateNotebookMathSpanLatex(
  block: NotebookTextBlock,
  spanId: string,
  normalizedLatex: string,
): NotebookTextBlock {
  return {
    ...block,
    mathSpans: block.mathSpans.map((span) =>
      span.id === spanId ? { ...span, normalizedLatex } : span),
  };
}

export function revertNotebookMathSpan(
  block: NotebookTextBlock,
  spanId: string,
): NotebookTextBlock {
  return {
    ...block,
    mathSpans: block.mathSpans.filter((span) => span.id !== spanId),
  };
}

export function applyNotebookTextMark(
  block: NotebookTextBlock,
  kind: NotebookTextMarkKind,
  options: {
    color?: string;
    end?: number;
    start?: number;
  } = {},
): NotebookTextBlock {
  const start = Math.max(0, options.start ?? 0);
  const end = Math.min(block.text.length, options.end ?? block.text.length);
  if (end <= start) {
    return block;
  }

  const mark: NotebookTextMark = {
    id: `mark.${kind}.${start}.${end}.${block.marks.length + 1}`,
    kind,
    start,
    end,
    color: options.color,
  };

  return {
    ...block,
    marks: [...block.marks, mark],
  };
}

export function availableNotebookMathCandidates(
  block: NotebookTextBlock,
  options: NotebookMathDetectionOptions = {},
) {
  const accepted = block.mathSpans.filter((span) => span.status === 'accepted');
  return detectNotebookMathCandidates(block.text, options).filter((candidate) =>
    !accepted.some((span) =>
      span.start === candidate.start
        && span.end === candidate.end
        && span.sourceText === candidate.sourceText));
}
