import { solvePolynomialRoots, type PolynomialRootDiagnostics } from '../../algebra/polynomial-roots';
import {
  certifyRealPolynomialRootsSturm,
  rootInSturmIntervals,
  type SturmRealRootCertification,
} from '../../algebra/sturm-real-roots';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { dedupeNumericRoots, validateCandidateRoots } from '../../equation/candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../../equation/candidate/extraneous';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import { evaluateLatexAtTarget } from '../../equation/domain-guards';
import { equationTargetLatex } from '../../equation/equation-target';
import type { AngleUnit, DisplayDetailSection, DisplayOutcome } from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import {
  buildFactSection,
  hardDomainFactLines,
  piecewiseBreakpointLines,
} from './numeric-search-diagnostics';
import {
  NUMERIC_FALLBACK_ELIGIBLE_ERRORS,
  polynomialFromZeroForm,
} from './numeric-polynomial-extraction';

const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const NUMERIC_RESIDUAL_TOLERANCE = 1e-8;
const NUMERIC_METHOD_POLYNOMIAL = 'Deterministic numeric polynomial roots';
const NUMERIC_METHOD_RATIONAL = 'Deterministic numeric rational roots';

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function approximateEquationLatex(targetLatex: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${targetLatex}\\approx ${formatted[0]}`
    : `${targetLatex}\\approx\\left\\{${formatted.join(', ')}\\right\\}`;
}

function approximateText(target: string, roots: readonly number[]) {
  const formatted = roots.map((value) => formatApproxNumber(value));
  return formatted.length === 1
    ? `${target} ~= ${formatted[0]}`
    : `${target} ~= ${formatted.join(', ')}`;
}

function formatDiagnosticNumber(value: number) {
  const magnitude = Math.abs(value);
  return magnitude > 0 && (magnitude < 1e-4 || magnitude >= 1e6)
    ? value.toExponential(2)
    : formatApproxNumber(value);
}

function residualLines(zeroFormLatex: string, target: string, roots: readonly number[]) {
  return roots.map((root) => {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, root);
    const residual = evaluated.value === null ? Number.NaN : Math.abs(evaluated.value);
    return `${target}≈${formatApproxNumber(root)} residual ${Number.isFinite(residual) ? formatApproxNumber(residual) : 'undefined'}.`;
  });
}

function decimalRevalidationLines(diagnostics: PolynomialRootDiagnostics) {
  const revalidation = diagnostics.decimalRevalidation;
  if (!revalidation.performed) {
    return [];
  }

  return [
    `Precision escalation backend: ${revalidation.backend}.`,
    `Decimal precision escalation: checked ${revalidation.rootsChecked} root${revalidation.rootsChecked === 1 ? '' : 's'} at ${revalidation.precisionDigits} digits.`,
    `Decimal residual check: ${formatDiagnosticNumber(revalidation.maxResidual)}.`,
    `Decimal root polish: ${revalidation.rootsPolished} supported root${revalidation.rootsPolished === 1 ? '' : 's'}; max shift ${formatDiagnosticNumber(revalidation.maxRootShift)}.`,
    `Precision risk triggers: ${revalidation.triggeredBy.join(', ')}.`,
  ];
}

function detailSectionsFor(input: {
  classification: ReturnType<typeof classifyEquationNumericShape>;
  degree: number;
  kind: 'polynomial' | 'rational';
  rootDiagnostics?: PolynomialRootDiagnostics;
  sturmCertification?: SturmRealRootCertification;
  roots: readonly number[];
  rejectedCount: number;
  zeroFormLatex: string;
}): DisplayDetailSection[] {
  const method = input.kind === 'rational' ? NUMERIC_METHOD_RATIONAL : NUMERIC_METHOD_POLYNOMIAL;
  const factLines = uniqueLines(hardDomainFactLines(input.classification.domainFacts));
  const breakpointLines = uniqueLines(piecewiseBreakpointLines(input.classification.domainFacts));
  const certificationMatches = input.sturmCertification?.kind === 'certified'
    && input.roots.length === input.sturmCertification.distinctRealRootCount
    && input.roots.every((root) => rootInSturmIntervals(root, input.sturmCertification?.intervals ?? []));
  const confidenceSection = buildNumericConfidenceSection([
    ...(certificationMatches ? ['All real polynomial roots certified.'] : []),
    ...(factLines.length > 0 ? ['Domain segmented around exclusions.'] : []),
    'Candidate roots validated against original equation.',
    ...(input.rootDiagnostics?.warningLines.some((line) => /higher precision/i.test(line))
      || input.rootDiagnostics?.decimalRevalidation.performed
      ? ['Higher precision recommended.']
      : []),
  ]);
  const sections: DisplayDetailSection[] = [
    {
      title: 'Numeric Method',
      lines: [
        'No supported exact form was found; showing validated approximate real roots.',
        `Method: ${method}.`,
        `Polynomial degree: ${input.degree}.`,
        input.kind === 'rational'
          ? 'Cleared numeric polynomial denominators, then validated candidates against the original equation.'
          : 'Solved the numeric polynomial globally, then validated candidates against the original equation.',
      ],
    },
  ];
  if (confidenceSection) {
    sections.push(confidenceSection);
  }

  if (factLines.length > 0) {
    const section = buildFactSection('Domain and Exclusions', factLines);
    if (section) {
      sections.push(section);
    }
  }

  const breakpointSection = buildFactSection('Piecewise Breakpoints', breakpointLines);
  if (breakpointSection) {
    sections.push(breakpointSection);
  }

  if (input.rootDiagnostics) {
    const diagnostics = input.rootDiagnostics;
    sections.push({
      title: 'Polynomial Diagnostics',
      lines: [
        `Root engine: ${diagnostics.method}.`,
        `Iterations: ${diagnostics.iterations}.`,
        `Conditioning passes: ${diagnostics.conditioningPasses}.`,
        `Largest polynomial residual after polishing: ${formatApproxNumber(diagnostics.maxResidual)}.`,
        `Coefficient scale ratio: ${diagnostics.coefficientScaleRatio.toExponential(2)}.`,
        diagnostics.minimumRootSeparation === null
          ? 'Nearest root separation: not applicable.'
          : `Nearest root separation: ${formatDiagnosticNumber(diagnostics.minimumRootSeparation)}.`,
        `Roots before dedupe: ${diagnostics.rootCountBeforeDedupe}; after dedupe: ${diagnostics.rootCountAfterDedupe}.`,
        ...(diagnostics.clusteredRootCount > 0
          ? [`Clustered/repeated root signals: ${diagnostics.clusteredRootCount}.`]
          : []),
        ...(diagnostics.closeRootSeparationCount > 0
          ? [`Close root-separation pairs: ${diagnostics.closeRootSeparationCount}.`]
          : []),
        ...decimalRevalidationLines(diagnostics),
        ...diagnostics.warningLines,
      ],
    });
  }

  if (input.sturmCertification) {
    const certification = input.sturmCertification;
    sections.push({
      title: 'Real Root Certification',
      lines: certification.kind === 'certified'
        ? [
            `Sturm sequence certified ${certification.distinctRealRootCount} distinct real root${certification.distinctRealRootCount === 1 ? '' : 's'}.`,
            `Isolated intervals: ${certification.intervals.length}.`,
            ...(input.roots.length === certification.distinctRealRootCount
              ? ['All real polynomial roots certified and validated against the original equation.']
              : [`Validated ${input.roots.length} accepted root${input.roots.length === 1 ? '' : 's'} after original-equation checks.`]),
          ]
        : [
            `Sturm certification inconclusive: ${certification.reason ?? 'unknown reason'}.`,
            `Sturm counted ${certification.distinctRealRootCount} distinct real root${certification.distinctRealRootCount === 1 ? '' : 's'} before isolation stopped.`,
          ],
    });
  }

  sections.push({
    title: 'Numeric Validation',
    lines: [
      `Accepted ${input.roots.length} validated real root${input.roots.length === 1 ? '' : 's'}.`,
      `Residual tolerance: ${NUMERIC_RESIDUAL_TOLERANCE}.`,
      ...residualLines(input.zeroFormLatex, input.classification.selectedTarget ?? 'x', input.roots),
      ...(input.rejectedCount > 0 ? [`Rejected ${input.rejectedCount} candidate${input.rejectedCount === 1 ? '' : 's'}.`] : []),
    ],
  });

  return sections;
}

function realRootsFromPolynomial(coefficients: readonly number[]) {
  const sturmCertification = certifyRealPolynomialRootsSturm(coefficients);
  const roots = solvePolynomialRoots({ coefficients: [...coefficients] });
  if (roots.kind === 'error') {
    return roots;
  }

  return {
    kind: 'success' as const,
    roots: dedupeNumericRoots(
      roots.roots
        .filter((root) => Math.abs(root.im) <= REAL_ROOT_IMAGINARY_TOLERANCE)
        .map((root) => root.re),
    ),
    diagnostics: roots.diagnostics,
    sturmCertification,
  };
}

export function tryDeterministicNumericAlgebraicFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  sharedOutcome: DisplayOutcome;
}): DisplayOutcome | undefined {
  if (
    input.sharedOutcome.kind !== 'error'
    || !NUMERIC_FALLBACK_ELIGIBLE_ERRORS.has(input.sharedOutcome.error)
  ) {
    return undefined;
  }

  const classification = classifyEquationNumericShape({
    equationLatex: input.equationLatex,
    equationSolveTarget: input.equationSolveTarget,
    angleUnit: input.angleUnit,
  });
  if (
    !classification.numericReady
    || !classification.selectedTarget
    || !classification.zeroFormLatex
    || !['deterministic-algebraic', 'rational-algebraic', 'discontinuity-heavy'].includes(classification.route)
  ) {
    return undefined;
  }

  const polynomial = polynomialFromZeroForm(classification.zeroFormLatex, classification.selectedTarget);
  if (!polynomial) {
    return undefined;
  }

  const method = polynomial.kind === 'rational' ? NUMERIC_METHOD_RATIONAL : NUMERIC_METHOD_POLYNOMIAL;
  if (polynomial.degree === 0) {
    return {
      kind: 'error',
      title: 'Solve',
      error: 'No validated real numeric roots were found.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      solveBadges: polynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections: detailSectionsFor({
        classification,
        degree: polynomial.degree,
        kind: polynomial.kind,
        rootDiagnostics: undefined,
        sturmCertification: undefined,
        roots: [],
        rejectedCount: 0,
        zeroFormLatex: classification.zeroFormLatex,
      }),
    };
  }

  const roots = realRootsFromPolynomial(polynomial.coefficients);
  if (roots.kind === 'error') {
    return {
      kind: 'error',
      title: 'Solve',
      error: roots.error,
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      solveBadges: polynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections: detailSectionsFor({
        classification,
        degree: polynomial.degree,
        kind: polynomial.kind,
        rootDiagnostics: undefined,
        sturmCertification: undefined,
        roots: [],
        rejectedCount: 0,
        zeroFormLatex: classification.zeroFormLatex,
      }),
    };
  }

  if (roots.roots.length === 0) {
    return {
      kind: 'error',
      title: 'Solve',
      error: 'No validated real numeric roots were found. Complex numeric root display is deferred for this Equation numeric milestone.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      solveBadges: polynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections: detailSectionsFor({
        classification,
        degree: polynomial.degree,
        kind: polynomial.kind,
        rootDiagnostics: roots.diagnostics,
        sturmCertification: roots.sturmCertification,
        roots: [],
        rejectedCount: 0,
        zeroFormLatex: classification.zeroFormLatex,
      }),
    };
  }

  const validation = validateCandidateRoots(
    input.equationLatex,
    roots.roots,
    [],
    'numeric-interval',
    input.angleUnit,
    classification.selectedTarget,
  );
  if (validation.accepted.length === 0) {
    const detailSections = appendExtraneousSolutionsDetailSection(
      detailSectionsFor({
        classification,
        degree: polynomial.degree,
        kind: polynomial.kind,
        rootDiagnostics: roots.diagnostics,
        sturmCertification: roots.sturmCertification,
        roots: [],
        rejectedCount: validation.rejected.length,
        zeroFormLatex: classification.zeroFormLatex,
      }),
      extraneousEvidenceFromRejectedCandidates(validation.rejected),
    );
    return {
      kind: 'error',
      title: 'Solve',
      error: 'Numeric candidates were found but rejected after substitution back into the original equation.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'real',
      rejectedCandidateCount: validation.rejected.length,
      solveBadges: polynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections,
    };
  }

  const accepted = dedupeNumericRoots(validation.accepted);
  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const formattedRoots = accepted.map((value) => formatApproxNumber(value));
  const detailSections = appendExtraneousSolutionsDetailSection(
    detailSectionsFor({
      classification,
      degree: polynomial.degree,
      kind: polynomial.kind,
      rootDiagnostics: roots.diagnostics,
      sturmCertification: roots.sturmCertification,
      roots: accepted,
      rejectedCount: validation.rejected.length,
      zeroFormLatex: classification.zeroFormLatex,
    }),
    extraneousEvidenceFromRejectedCandidates(validation.rejected),
  );

  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, accepted),
    approxText: approximateText(classification.selectedTarget, accepted),
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\approx',
      branchesLatex: formattedRoots,
      source: 'equation-deterministic-numeric-algebraic',
    }),
    warnings: [],
    solutionKind: 'approximate-numeric',
    resultOrigin: 'numeric-fallback',
    answerDomain: 'real',
    solveBadges: polynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
    solveSummaryText: `${method}. Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}${roots.sturmCertification.kind === 'certified' && accepted.every((root) => rootInSturmIntervals(root, roots.sturmCertification.intervals)) ? ' with Sturm certification' : ''}${validation.rejected.length > 0 ? `, rejected ${validation.rejected.length}.` : '.'}`,
    candidateValues: accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
    numericMethod: method,
    detailSections,
  };
}
