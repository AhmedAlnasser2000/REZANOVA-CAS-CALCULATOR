import { runExpressionAction } from '../math-engine';
import { solutionsToLatex } from '../format';
import { matchBoundedTrigEquation } from '../trigonometry/equation-match';
import { solveTrigEquation } from '../trigonometry/equations';
import { matchTrigEquationRewriteForSolve } from '../trigonometry/rewrite-solve';
import { validateCandidateRoots } from './candidate-validation';
import { runNumericIntervalSolve } from './numeric-interval-solve';
import { matchSubstitutionSolve } from './substitution-solve';
import type {
  DisplayOutcome,
  GuardedSolveRequest,
  PlannerBadge,
  SolveBadge,
} from '../../types/calculator';

const MAX_RECURSION_DEPTH = 2;

type SolveLike = ReturnType<typeof solveTrigEquation>;

function successOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
): DisplayOutcome {
  return {
    kind: 'success',
    title,
    exactLatex,
    approxText,
    warnings,
    resultOrigin: approxText && !exactLatex ? 'numeric-fallback' : 'symbolic',
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
  };
}

function errorOutcome(
  title: string,
  error: string,
  warnings: string[] = [],
  plannerBadges: PlannerBadge[] = [],
  solveBadges: SolveBadge[] = [],
  solveSummaryText?: string,
  rejectedCandidateCount?: number,
): DisplayOutcome {
  return {
    kind: 'error',
    title,
    error,
    warnings,
    plannerBadges,
    solveBadges,
    solveSummaryText,
    rejectedCandidateCount,
  };
}

function isTrigSolveSuccess(outcome: SolveLike) {
  return !outcome.error && Boolean(outcome.exactLatex);
}

function extractExactSolutions(exactLatex?: string) {
  if (!exactLatex) {
    return [];
  }

  if (exactLatex.startsWith('x=')) {
    return [exactLatex.slice(2)];
  }

  const prefix = 'x\\in\\left\\{';
  const suffix = '\\right\\}';
  if (exactLatex.startsWith(prefix) && exactLatex.endsWith(suffix)) {
    return exactLatex
      .slice(prefix.length, -suffix.length)
      .split(/,\s*/)
      .filter(Boolean);
  }

  return [exactLatex];
}

function extractApproxSolutions(approxText?: string) {
  if (!approxText) {
    return [];
  }

  const prefix = 'x ~= ';
  if (approxText.startsWith(prefix)) {
    return approxText.slice(prefix.length).split(/,\s*/).filter(Boolean);
  }

  return [approxText];
}

function dedupe<T>(values: T[]) {
  return [...new Set(values)];
}

function mergeDisplayOutcomes(
  outcomes: DisplayOutcome[],
  solveBadges: SolveBadge[],
  solveSummaryText: string,
): DisplayOutcome {
  const successes = outcomes.filter((outcome) => outcome.kind === 'success');
  if (successes.length === 0) {
    const firstError = outcomes.find((outcome) => outcome.kind === 'error');
    if (firstError?.kind === 'error') {
      return errorOutcome(
        'Solve',
        firstError.error,
        firstError.warnings,
        firstError.plannerBadges ?? [],
        dedupe([...(firstError.solveBadges ?? []), ...solveBadges]),
        solveSummaryText,
        firstError.rejectedCandidateCount,
      );
    }

    return errorOutcome(
      'Solve',
      'This equation is outside the supported symbolic solve families for this milestone.',
      [],
      [],
      solveBadges,
      solveSummaryText,
    );
  }

  const exactValues = dedupe(successes.flatMap((outcome) => extractExactSolutions(outcome.exactLatex)));
  const approxValues = dedupe(successes.flatMap((outcome) => extractApproxSolutions(outcome.approxText)));
  const warnings = dedupe(successes.flatMap((outcome) => outcome.warnings));
  const plannerBadges = dedupe(successes.flatMap((outcome) => outcome.plannerBadges ?? []));
  const badgeSet = dedupe(successes.flatMap((outcome) => outcome.solveBadges ?? []).concat(solveBadges));
  const rejectedCandidateCount = successes.reduce((total, outcome) => total + (outcome.rejectedCandidateCount ?? 0), 0);

  return successOutcome(
    'Solve',
    exactValues.length > 0 ? solutionsToLatex('x', exactValues) : undefined,
    approxValues.length > 0 ? `x ~= ${approxValues.join(', ')}` : undefined,
    warnings,
    plannerBadges,
    badgeSet,
    solveSummaryText,
    rejectedCandidateCount > 0 ? rejectedCandidateCount : undefined,
  );
}

function directTrigSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  const directMatch = matchBoundedTrigEquation(request.resolvedLatex);
  if (!directMatch) {
    return null;
  }

  const trig = solveTrigEquation({
    equationLatex: request.resolvedLatex,
    variable: 'x',
    angleUnit: request.angleUnit,
  });

  if (isTrigSolveSuccess(trig)) {
    return successOutcome(
      'Solve',
      trig.exactLatex,
      trig.approxText,
      trig.warnings,
      ['Trig Solve Backend'],
    );
  }

  return errorOutcome(
    'Solve',
    trig.error ?? 'No symbolic solution was found for x.',
    trig.warnings,
    ['Trig Solve Backend'],
  );
}

function rewriteTrigSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  const rewriteMatch = matchTrigEquationRewriteForSolve(request.resolvedLatex, request.angleUnit);
  if (rewriteMatch.kind === 'none') {
    return null;
  }

  if (rewriteMatch.kind === 'blocked') {
    return errorOutcome('Solve', rewriteMatch.error);
  }

  if (rewriteMatch.candidate.kind === 'single-call') {
    const trig = solveTrigEquation({
      equationLatex: rewriteMatch.candidate.solvedLatex,
      variable: 'x',
      angleUnit: request.angleUnit,
    });

    if (isTrigSolveSuccess(trig)) {
      return successOutcome(
        'Solve',
        trig.exactLatex,
        trig.approxText,
        trig.warnings,
        ['Trig Solve Backend'],
        ['Trig Rewrite'],
        rewriteMatch.candidate.summaryText,
      );
    }

    return errorOutcome(
      'Solve',
      trig.error ?? 'No symbolic solution was found for x.',
      trig.warnings,
      ['Trig Solve Backend'],
      ['Trig Rewrite'],
      rewriteMatch.candidate.summaryText,
    );
  }

  const outcomes = rewriteMatch.candidate.branchLatex.map((equationLatex) => {
    const trig = solveTrigEquation({
      equationLatex,
      variable: 'x',
      angleUnit: request.angleUnit,
    });

    if (isTrigSolveSuccess(trig)) {
      return successOutcome(
        'Solve',
        trig.exactLatex,
        trig.approxText,
        trig.warnings,
        ['Trig Solve Backend'],
      );
    }

    return errorOutcome(
      'Solve',
      trig.error ?? 'No symbolic solution was found for x.',
      trig.warnings,
      ['Trig Solve Backend'],
    );
  });

  return mergeDisplayOutcomes(
    outcomes,
    ['Trig Rewrite', 'Trig Square Split'],
    rewriteMatch.candidate.summaryText,
  );
}

function substitutionSolve(request: GuardedSolveRequest, depth: number): DisplayOutcome | null {
  const substitution = matchSubstitutionSolve(request.resolvedLatex, request.angleUnit);
  if (substitution.kind === 'none') {
    return null;
  }

  if (substitution.kind === 'blocked') {
    return errorOutcome('Solve', substitution.error);
  }

  if (depth >= MAX_RECURSION_DEPTH) {
    return errorOutcome(
      'Solve',
      'This equation exceeded the supported guarded-solve recursion depth for this milestone.',
      [],
      [],
      substitution.solveBadges,
      substitution.solveSummaryText,
    );
  }

  const outcomes = substitution.equations.map((equationLatex) =>
    runGuardedEquationSolve({
      ...request,
      originalLatex: equationLatex,
      resolvedLatex: equationLatex,
      numericInterval: undefined,
    }, depth + 1));

  return mergeDisplayOutcomes(
    outcomes,
    substitution.solveBadges,
    substitution.solveSummaryText,
  );
}

function numericIntervalSolve(request: GuardedSolveRequest): DisplayOutcome | null {
  if (!request.numericInterval) {
    return null;
  }

  const numeric = runNumericIntervalSolve(request.resolvedLatex, request.numericInterval);
  if (numeric.kind === 'error') {
    return errorOutcome(
      'Solve',
      numeric.error,
      [],
      [],
      ['Numeric Interval', 'Candidate Checked'],
      numeric.rejectedCandidateCount
        ? `${numeric.rejectedCandidateCount} candidate roots were rejected after validation`
        : undefined,
      numeric.rejectedCandidateCount,
    );
  }

  const validation = validateCandidateRoots(request.resolvedLatex, numeric.roots, [], 'numeric-interval');
  return successOutcome(
    'Solve',
    undefined,
    `x ~= ${validation.accepted.map((value) => value.toFixed(6).replace(/0+$/,'').replace(/\.$/, '')).join(', ')}`,
    [],
    [],
    ['Numeric Interval', 'Candidate Checked'],
    numeric.rejectedCandidateCount > 0
      ? `${numeric.summaryText}. ${numeric.rejectedCandidateCount} candidate roots were rejected after validation.`
      : numeric.summaryText,
    numeric.rejectedCandidateCount,
  );
}

export function runGuardedEquationSolve(request: GuardedSolveRequest, depth = 0): DisplayOutcome {
  const symbolic = runExpressionAction(
    {
      mode: 'equation',
      document: { latex: request.resolvedLatex },
      angleUnit: request.angleUnit,
      outputStyle: request.outputStyle,
      variables: { Ans: request.ansLatex },
    },
    'solve',
  );

  if (!symbolic.error && symbolic.exactLatex) {
    return successOutcome(
      'Solve',
      symbolic.exactLatex,
      symbolic.approxText,
      symbolic.warnings,
    );
  }

  const directTrig = directTrigSolve(request);
  if (directTrig?.kind === 'success') {
    return directTrig;
  }

  const rewriteTrig = rewriteTrigSolve(request);
  if (rewriteTrig?.kind === 'success') {
    return rewriteTrig;
  }
  if (rewriteTrig?.kind === 'error') {
    return rewriteTrig;
  }

  const substituted = substitutionSolve(request, depth);
  if (substituted?.kind === 'success') {
    return substituted;
  }
  if (substituted?.kind === 'error') {
    return substituted;
  }

  const numeric = numericIntervalSolve(request);
  if (numeric) {
    return numeric;
  }

  return errorOutcome(
    'Solve',
    'This equation is outside the supported symbolic solve families for this milestone.',
    symbolic.warnings,
  );
}
