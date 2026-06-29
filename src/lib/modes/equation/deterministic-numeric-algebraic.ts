import { ComputeEngine } from '@cortex-js/compute-engine';
import { solvePolynomialRoots } from '../../algebra/polynomial-roots';
import {
  exactPolynomialCoefficientArray,
  exactPolynomialDegree,
  exactPolynomialIsZero,
  exactScalarToNumber,
  parseExactPolynomial,
} from '../../algebra/polynomial-core';
import { normalizeExactRationalFunctionNode } from '../../algebra/rational-function';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { dedupeNumericRoots, validateCandidateRoots } from '../../equation/candidate-validation';
import {
  appendExtraneousSolutionsDetailSection,
  extraneousEvidenceFromRejectedCandidates,
} from '../../equation/candidate/extraneous';
import { evaluateLatexAtTarget } from '../../equation/domain-guards';
import { equationTargetLatex } from '../../equation/equation-target';
import type { AngleUnit, DisplayDetailSection, DisplayOutcome } from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';

const ce = new ComputeEngine();
const MAX_DEGREE = 64;
const REAL_ROOT_IMAGINARY_TOLERANCE = 1e-7;
const NUMERIC_RESIDUAL_TOLERANCE = 1e-8;
const NUMERIC_METHOD_POLYNOMIAL = 'Deterministic numeric polynomial roots';
const NUMERIC_METHOD_RATIONAL = 'Deterministic numeric rational roots';

type SolvablePolynomial = {
  coefficients: number[];
  degree: number;
  kind: 'polynomial' | 'rational';
};

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

function residualLines(zeroFormLatex: string, target: string, roots: readonly number[]) {
  return roots.map((root) => {
    const evaluated = evaluateLatexAtTarget(zeroFormLatex, target, root);
    const residual = evaluated.value === null ? Number.NaN : Math.abs(evaluated.value);
    return `${target}≈${formatApproxNumber(root)} residual ${Number.isFinite(residual) ? formatApproxNumber(residual) : 'undefined'}.`;
  });
}

function detailSectionsFor(input: {
  classification: ReturnType<typeof classifyEquationNumericShape>;
  degree: number;
  kind: 'polynomial' | 'rational';
  roots: readonly number[];
  rejectedCount: number;
  zeroFormLatex: string;
}): DisplayDetailSection[] {
  const method = input.kind === 'rational' ? NUMERIC_METHOD_RATIONAL : NUMERIC_METHOD_POLYNOMIAL;
  const sections: DisplayDetailSection[] = [
    {
      title: 'Numeric Method',
      lines: [
        'No supported exact form was found; showing validated approximate roots.',
        `Method: ${method}.`,
        `Polynomial degree: ${input.degree}.`,
        input.kind === 'rational'
          ? 'Cleared numeric polynomial denominators, then validated candidates against the original equation.'
          : 'Solved the numeric polynomial globally, then validated candidates against the original equation.',
      ],
    },
  ];

  const factLines = uniqueLines(input.classification.domainFacts.map((fact) => fact.message));
  if (factLines.length > 0) {
    sections.push({
      title: 'Domain and Exclusions',
      lines: factLines,
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

function polynomialFromZeroForm(zeroFormLatex: string, target: string): SolvablePolynomial | null {
  const parsed = ce.parse(zeroFormLatex).json;
  const rational = normalizeExactRationalFunctionNode(parsed, {
    variable: target,
    maxDegree: MAX_DEGREE,
  });
  if (rational.kind === 'success') {
    if (exactPolynomialIsZero(rational.rational.numerator)) {
      return null;
    }
    const degree = exactPolynomialDegree(rational.rational.numerator);
    if (degree > MAX_DEGREE) {
      return null;
    }
    return {
      coefficients: exactPolynomialCoefficientArray(rational.rational.numerator).map(exactScalarToNumber),
      degree,
      kind: rational.denominatorLatex ? 'rational' : 'polynomial',
    };
  }

  const polynomial = parseExactPolynomial(parsed, target, MAX_DEGREE);
  if (!polynomial || exactPolynomialIsZero(polynomial)) {
    return null;
  }
  const degree = exactPolynomialDegree(polynomial);
  if (degree > MAX_DEGREE) {
    return null;
  }

  return {
    coefficients: exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber),
    degree,
    kind: 'polynomial',
  };
}

function realRootsFromPolynomial(coefficients: readonly number[]) {
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
    || input.sharedOutcome.error !== 'This equation is outside the supported exact symbolic solve families.'
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
    solveSummaryText: `${method}. Accepted ${accepted.length} validated real root${accepted.length === 1 ? '' : 's'}${validation.rejected.length > 0 ? `, rejected ${validation.rejected.length}.` : '.'}`,
    candidateValues: accepted,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
    numericMethod: method,
    detailSections,
  };
}
