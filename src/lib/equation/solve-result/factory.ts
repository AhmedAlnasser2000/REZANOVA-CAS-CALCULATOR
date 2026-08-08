import type {
  CandidateValidationResult,
  CanonicalResultDocumentV1,
} from '../../../types/calculator';
import type { EquationAnalysisEvidence } from '../analysis-evidence';
import {
  EQUATION_SOLVE_RESULT_VERSION,
  type EquationControlledStopV1,
  type EquationSolveResultContractV1,
} from './contract';
import { validateEquationSolveResultContract } from './validation';

export type BuildEquationSolveResultContractInput = {
  document: CanonicalResultDocumentV1;
  candidateValidation?: CandidateValidationResult[];
  analysisEvidence?: EquationAnalysisEvidence[];
  controlledStop?: EquationControlledStopV1;
};

function compactAnalysisEvidence(entry: EquationAnalysisEvidence): EquationAnalysisEvidence {
  return {
    id: entry.id,
    target: entry.target,
    sourceRoute: entry.sourceRoute,
    category: entry.category,
    confidence: entry.confidence,
    ...(entry.classification !== undefined ? { classification: entry.classification } : {}),
    ...(entry.latex !== undefined ? { latex: entry.latex } : {}),
    ...(entry.text !== undefined ? { text: entry.text } : {}),
    ...(entry.interval
      ? {
          interval: {
            start: entry.interval.start,
            end: entry.interval.end,
            ...(entry.interval.subdivisions !== undefined
              ? { subdivisions: entry.interval.subdivisions }
              : {}),
            ...(entry.interval.local !== undefined ? { local: entry.interval.local } : {}),
          },
        }
      : {}),
    ...(entry.point
      ? {
          point: {
            value: entry.point.value,
            ...(entry.point.latex !== undefined ? { latex: entry.point.latex } : {}),
            ...(entry.point.role !== undefined ? { role: entry.point.role } : {}),
          },
        }
      : {}),
    ...(entry.supplementEvidence
      ? {
          supplementEvidence: {
            role: entry.supplementEvidence.role,
            ...(entry.supplementEvidence.expressionLatex !== undefined
              ? { expressionLatex: entry.supplementEvidence.expressionLatex }
              : {}),
            canonicalLatex: entry.supplementEvidence.canonicalLatex,
            mathJson: entry.supplementEvidence.mathJson,
          },
        }
      : {}),
  };
}

export function buildEquationSolveResultContract({
  document,
  candidateValidation,
  analysisEvidence = [],
  controlledStop,
}: BuildEquationSolveResultContractInput): EquationSolveResultContractV1 {
  const metadata = document.metadata;
  const hasCandidateEvidence = metadata?.candidateValues !== undefined
    || metadata?.rejectedCandidateCount !== undefined
    || candidateValidation !== undefined;
  const candidate = {
    version: EQUATION_SOLVE_RESULT_VERSION,
    status: document.outcomeKind === 'success' ? 'solved' as const : 'controlled-stop' as const,
    document,
    ...(hasCandidateEvidence
      ? {
          candidates: {
            ...(metadata?.candidateValues !== undefined
              ? { acceptedValues: [...metadata.candidateValues] }
              : {}),
            ...(metadata?.rejectedCandidateCount !== undefined
              ? { rejectedCount: metadata.rejectedCandidateCount }
              : {}),
            ...(candidateValidation !== undefined
              ? { validation: candidateValidation.map((entry) => ({ ...entry })) }
              : {}),
          },
        }
      : {}),
    ...(document.branchReadback ? { branchEvidence: document.branchReadback } : {}),
    badges: {
      planner: [...(metadata?.plannerBadges ?? [])],
      solve: [...(metadata?.solveBadges ?? [])],
    },
    diagnostics: {
      ...(metadata?.substitutionDiagnostics
        ? { substitutionDiagnostics: { ...metadata.substitutionDiagnostics } }
        : {}),
      ...(metadata?.numericMethod !== undefined ? { numericMethod: metadata.numericMethod } : {}),
      analysisEvidence: analysisEvidence.map(compactAnalysisEvidence),
    },
    ...(controlledStop ? { stop: { ...controlledStop } } : {}),
  };

  const validation = validateEquationSolveResultContract(candidate);
  if (!validation.ok) {
    throw new Error(
      `Invalid Equation solve result contract: ${validation.failure.reason}: ${validation.failure.message}`,
    );
  }
  return validation.validated.value;
}
