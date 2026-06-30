import { formatApproxNumber } from '../../display/format';
import {
  buildExtraneousSolutionsDetailSection,
  type ExtraneousCandidateEvidence,
} from '../../equation/candidate/extraneous';
import type { NumericDiagnostics } from '../../equation/numeric-interval/types';
import type {
  CandidateValidationResult,
  DisplayDetailSection,
} from '../../../types/calculator';
import type {
  EquationNumericDomainFact,
  EquationNumericShapeClassification,
} from './numeric-shape-classifier';

export type NumericSearchWindowDiagnostic = {
  label: string;
  roots: readonly number[];
  rejectedCandidates: readonly CandidateValidationResult[];
  diagnostics: NumericDiagnostics;
};

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function rejectedCandidates(rejected: readonly CandidateValidationResult[]) {
  return rejected.filter((candidate): candidate is Extract<CandidateValidationResult, { kind: 'rejected' }> =>
    candidate.kind === 'rejected');
}

function rejectedKey(candidate: Extract<CandidateValidationResult, { kind: 'rejected' }>) {
  return `${formatApproxNumber(candidate.value)}|${candidate.reason}`;
}

export function hardDomainFactLines(
  facts: readonly EquationNumericDomainFact[],
) {
  return uniqueLines(
    facts
      .filter((fact) => fact.kind !== 'sampled-discontinuity')
      .map((fact) => fact.message),
  );
}

function escapedRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function parseSimpleLowerBound(message: string, target: string) {
  const compact = message.replace(/\s+/gu, '');
  const match = compact.match(new RegExp(`^${escapedRegex(target)}([+-])(\\d+(?:\\.\\d+)?)>0$`, 'u'));
  if (!match) {
    return null;
  }
  const magnitude = Number(match[2]);
  if (!Number.isFinite(magnitude)) {
    return null;
  }
  return match[1] === '-' ? magnitude : -magnitude;
}

function parseSimpleExclusion(message: string, target: string) {
  const compact = message.replace(/\s+/gu, '');
  const match = compact.match(new RegExp(`^${escapedRegex(target)}\\\\ne(-?\\d+(?:\\.\\d+)?)$`, 'u'));
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function formatBoundary(value: number) {
  return Number.isInteger(value) ? String(value) : formatApproxNumber(value);
}

function derivedRealSearchRegions(classification: EquationNumericShapeClassification) {
  const target = classification.selectedTarget;
  if (!target) {
    return [];
  }
  const lowerBounds = classification.domainFacts
    .filter((fact) => fact.kind === 'log-domain' || fact.kind === 'root-domain')
    .map((fact) => parseSimpleLowerBound(fact.message, target))
    .filter((value): value is number => value !== null);
  if (lowerBounds.length === 0) {
    return [];
  }

  const lowerBound = Math.max(...lowerBounds);
  const exclusions = classification.domainFacts
    .filter((fact) => fact.kind === 'solved-denominator-exclusion')
    .map((fact) => parseSimpleExclusion(fact.message, target))
    .filter((value): value is number => value !== null && value > lowerBound)
    .sort((left, right) => left - right);

  const regions: string[] = [];
  let start = lowerBound;
  for (const exclusion of exclusions) {
    regions.push(`(${formatBoundary(start)}, ${formatBoundary(exclusion)})`);
    start = exclusion;
  }
  regions.push(`(${formatBoundary(start)}, \\infty)`);
  return regions;
}

export function buildDomainProbeSection(
  classification: EquationNumericShapeClassification,
): DisplayDetailSection | null {
  const probe = classification.sampleProbe;
  const target = classification.selectedTarget;
  if (!probe || !target || probe.undefinedSampleCount === 0) {
    return null;
  }

  const regions = derivedRealSearchRegions(classification);
  const lines = [
    `Probe set: ${probe.samplePoints.length} fixed numeric ${target} sample${probe.samplePoints.length === 1 ? '' : 's'}.`,
    `Undefined or non-real samples: ${probe.undefinedSampleCount}; finite samples: ${probe.finiteSampleCount}.`,
    ...(regions.length > 0 ? [`Derived real search regions: ${regions.join(', ')}.`] : []),
    ...probe.undefinedPoints.map((point) =>
      `Undefined/non-real sample: ${target}=${formatBoundary(point)}.`),
    ...probe.finitePoints.map((point) =>
      `Finite sample: ${target}=${formatBoundary(point)}.`),
    'Probe evidence guides segmentation; it is not a complete domain proof.',
  ];

  return {
    title: 'Domain Probe',
    lines,
  };
}

export function buildSearchDiagnosticsSection(input: {
  windows: readonly NumericSearchWindowDiagnostic[];
  stableStopped: boolean;
}): DisplayDetailSection {
  const totalAccepted = input.windows.reduce((total, window) => total + window.roots.length, 0);
  const totalRejected = input.windows.reduce((total, window) =>
    total + rejectedCandidates(window.rejectedCandidates).length, 0);
  const lines = [
    `Searched windows: ${input.windows.map((window) => window.label).join(', ')}.`,
    input.stableStopped
      ? 'Stopped after a wider window added no new validated roots or unique extraneous values.'
      : 'Used all configured bounded search windows.',
    `Search passes produced ${totalAccepted} accepted root attempt${totalAccepted === 1 ? '' : 's'} and ${totalRejected} extraneous candidate attempt${totalRejected === 1 ? '' : 's'}.`,
    ...input.windows.map((window) => {
      const rejectedCount = rejectedCandidates(window.rejectedCandidates).length;
      return `Window ${window.label}: accepted ${window.roots.length}, extraneous ${rejectedCount}, adaptive samples ${window.diagnostics.adaptiveSampleCount}, discontinuity cells ${window.diagnostics.discontinuityCellCount}.`;
    }),
  ];

  return {
    title: 'Search Diagnostics',
    lines,
  };
}

export function aggregateExtraneousEvidence(
  rejected: readonly CandidateValidationResult[],
): ExtraneousCandidateEvidence[] {
  const grouped = new Map<string, ExtraneousCandidateEvidence>();
  for (const candidate of rejectedCandidates(rejected)) {
    const key = rejectedKey(candidate);
    const existing = grouped.get(key);
    if (existing) {
      grouped.set(key, {
        ...existing,
        occurrenceCount: (existing.occurrenceCount ?? 1) + 1,
      });
      continue;
    }
    grouped.set(key, {
      approxValue: candidate.value,
      reason: candidate.reason
        .split(/(?<=\.)\s+/u)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0 && !sentence.startsWith('Trust:'))
        .join(' ')
        .replace(/\.$/u, ''),
      occurrenceCount: 1,
    });
  }
  return [...grouped.values()];
}

export function buildExtraneousDiagnosticsSection(
  rejected: readonly CandidateValidationResult[],
) {
  return buildExtraneousSolutionsDetailSection(aggregateExtraneousEvidence(rejected));
}
