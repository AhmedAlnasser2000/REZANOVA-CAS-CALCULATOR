import { ComputeEngine } from '@cortex-js/compute-engine';
import { solvePolynomialRoots, type PolynomialRootDiagnostics } from '../../algebra/polynomial-roots';
import {
  exactPolynomialCoefficientArray,
  exactScalarToNumber,
  parseExactPolynomial,
} from '../../algebra/polynomial-core';
import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { buildExtraneousSolutionsDetailSection } from '../../equation/candidate/extraneous';
import { equationTargetLatex } from '../../equation/equation-target';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import {
  complex,
  complexAbs,
  complexAdd,
  complexMul,
  complexToApproxText,
  complexToLatex,
  type ComplexValue,
} from '../../numeric/complex';
import type {
  AngleUnit,
  ComplexExactForm,
  DisplayDetailSection,
  DisplayOutcome,
} from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import {
  buildFactSection,
  hardDomainFactLines,
} from './numeric-search-diagnostics';
import {
  NUMERIC_FALLBACK_ELIGIBLE_ERRORS,
  polynomialFromZeroForm,
  type SolvableNumericPolynomial,
} from './numeric-polynomial-extraction';

const ce = new ComputeEngine();
const COMPLEX_RESIDUAL_TOLERANCE = 1e-8;
const DENOMINATOR_REJECTION_TOLERANCE = 1e-8;
const NUMERIC_METHOD_POLYNOMIAL = 'Complex numeric polynomial roots';
const NUMERIC_METHOD_RATIONAL = 'Complex numeric rational roots';

type DenominatorCheck = {
  coefficients: number[];
  latex: string;
};

type ComplexRootValidation = {
  accepted: ComplexValue[];
  rejected: Array<{
    value: ComplexValue;
    reason: string;
  }>;
};

function uniqueLines(lines: readonly string[]) {
  return [...new Set(lines.filter((line) => line.trim().length > 0))];
}

function formatDiagnosticNumber(value: number) {
  const magnitude = Math.abs(value);
  return magnitude > 0 && (magnitude < 1e-4 || magnitude >= 1e6)
    ? value.toExponential(2)
    : formatApproxNumber(value);
}

function evaluatePolynomialComplex(coefficients: readonly number[], value: ComplexValue) {
  return coefficients.reduce<ComplexValue>(
    (current, coefficient) => complexAdd(complexMul(current, value), complex(coefficient, 0)),
    complex(0, 0),
  );
}

function denominatorChecksFromFacts(
  classification: ReturnType<typeof classifyEquationNumericShape>,
): DenominatorCheck[] {
  const target = classification.selectedTarget;
  if (!target) {
    return [];
  }

  return classification.domainFacts
    .filter((fact) => fact.kind === 'denominator-exclusion' && fact.expressionLatex)
    .flatMap((fact): DenominatorCheck[] => {
      try {
        const polynomial = parseExactPolynomial(ce.parse(fact.expressionLatex as string).json, target, 64);
        if (!polynomial) {
          return [];
        }
        return [{
          coefficients: exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber),
          latex: fact.expressionLatex as string,
        }];
      } catch {
        return [];
      }
    });
}

function denominatorChecksFor(
  polynomial: SolvableNumericPolynomial,
  classification: ReturnType<typeof classifyEquationNumericShape>,
): DenominatorCheck[] {
  const checks = [
    ...(polynomial.denominatorCoefficients && polynomial.denominatorLatex
      ? [{ coefficients: polynomial.denominatorCoefficients, latex: polynomial.denominatorLatex }]
      : []),
    ...denominatorChecksFromFacts(classification),
  ];
  return [...new Map(checks.map((check) => [check.latex, check])).values()];
}

function formatComplexRootLatex(value: ComplexValue, form: ComplexExactForm) {
  if (form === 'rectangular' || value.im === 0) {
    return complexToLatex(value);
  }

  const magnitude = complexAbs(value);
  if (magnitude === 0) {
    return '0';
  }
  const magnitudeLatex = formatApproxNumber(magnitude);
  const angleLatex = formatApproxNumber(Math.atan2(value.im, value.re));
  if (form === 'cis') {
    const cisLatex = `\\operatorname{cis}\\left(${angleLatex}\\right)`;
    return magnitude === 1 ? cisLatex : `${magnitudeLatex}${cisLatex}`;
  }
  return `${magnitudeLatex}\\angle ${angleLatex}`;
}

function formatComplexRootText(value: ComplexValue, form: ComplexExactForm) {
  if (form === 'rectangular' || value.im === 0) {
    return complexToApproxText(value);
  }

  const magnitude = complexAbs(value);
  if (magnitude === 0) {
    return '0';
  }
  const magnitudeText = formatApproxNumber(magnitude);
  const angleText = formatApproxNumber(Math.atan2(value.im, value.re));
  return form === 'cis'
    ? `${magnitudeText} cis(${angleText})`
    : `${magnitudeText} angle ${angleText}`;
}

function approximateEquationLatex(
  targetLatex: string,
  roots: readonly ComplexValue[],
  complexExactForm: ComplexExactForm,
) {
  const formatted = roots.map((value) => formatComplexRootLatex(value, complexExactForm));
  return formatted.length === 1
    ? `${targetLatex}\\approx ${formatted[0]}`
    : `${targetLatex}\\approx\\left\\{${formatted.join(', ')}\\right\\}`;
}

function approximateText(
  target: string,
  roots: readonly ComplexValue[],
  complexExactForm: ComplexExactForm,
) {
  const formatted = roots.map((value) => formatComplexRootText(value, complexExactForm));
  return formatted.length === 1
    ? `${target} ~= ${formatted[0]}`
    : `${target} ~= ${formatted.join(', ')}`;
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

function multiplicityEstimateLines(
  diagnostics: PolynomialRootDiagnostics,
  complexExactForm: ComplexExactForm,
) {
  const repeated = diagnostics.multiplicityEstimates
    .filter((entry) => entry.estimatedMultiplicity > 1);
  if (repeated.length === 0) {
    return [];
  }

  return [
    ...repeated.map((entry) =>
      `Estimated multiplicity near ${formatComplexRootText(entry.root, complexExactForm)}: ${entry.estimatedMultiplicity}.`),
    'Multiplicity estimates are numeric cluster evidence, not certified disks.',
  ];
}

function validateComplexRoots(
  polynomial: SolvableNumericPolynomial,
  roots: readonly ComplexValue[],
  denominatorChecks: readonly DenominatorCheck[],
): ComplexRootValidation {
  const rejected: ComplexRootValidation['rejected'] = [];
  const accepted: ComplexValue[] = [];

  for (const root of roots) {
    const residual = complexAbs(evaluatePolynomialComplex(polynomial.coefficients, root));
    if (!Number.isFinite(residual) || residual > COMPLEX_RESIDUAL_TOLERANCE * 100) {
      rejected.push({
        value: root,
        reason: `polynomial residual ${formatDiagnosticNumber(residual)} exceeds tolerance`,
      });
      continue;
    }

    for (const denominator of denominatorChecks) {
      const denominatorMagnitude = complexAbs(evaluatePolynomialComplex(denominator.coefficients, root));
      if (!Number.isFinite(denominatorMagnitude) || denominatorMagnitude <= DENOMINATOR_REJECTION_TOLERANCE) {
        rejected.push({
          value: root,
          reason: `violates ${denominator.latex}\\ne0`,
        });
        continue;
      }
    }

    if (rejected.some((candidate) => candidate.value === root)) {
      continue;
    }

    accepted.push(root);
  }

  return { accepted, rejected };
}

function rootResidualLines(
  roots: readonly ComplexValue[],
  polynomial: SolvableNumericPolynomial,
  target: string,
  complexExactForm: ComplexExactForm,
) {
  return roots.map((root) => {
    const residual = complexAbs(evaluatePolynomialComplex(polynomial.coefficients, root));
    return `${target}≈${formatComplexRootText(root, complexExactForm)} residual ${formatDiagnosticNumber(residual)}.`;
  });
}

function detailSectionsFor(input: {
  classification: ReturnType<typeof classifyEquationNumericShape>;
  polynomial: SolvableNumericPolynomial;
  diagnostics?: PolynomialRootDiagnostics;
  accepted: readonly ComplexValue[];
  rejected: ReadonlyArray<ComplexRootValidation['rejected'][number]>;
  complexExactForm: ComplexExactForm;
}): DisplayDetailSection[] {
  const method = input.polynomial.kind === 'rational' ? NUMERIC_METHOD_RATIONAL : NUMERIC_METHOD_POLYNOMIAL;
  const factLines = uniqueLines(hardDomainFactLines(input.classification.domainFacts));
  const confidenceSection = buildNumericConfidenceSection([
    'Candidate roots validated against original equation.',
    ...(factLines.length > 0 ? ['Domain segmented around exclusions.'] : []),
    ...(input.diagnostics?.warningLines.some((line) => /higher precision/i.test(line))
      || input.diagnostics?.decimalRevalidation.performed
      ? ['Higher precision recommended.']
      : []),
  ]);
  const sections: DisplayDetailSection[] = [
    {
      title: 'Complex Numeric Method',
      lines: [
        'No supported exact form was found; showing validated approximate complex roots.',
        `Method: ${method}.`,
        `Polynomial degree: ${input.polynomial.degree}.`,
        input.polynomial.kind === 'rational'
          ? 'Cleared numeric polynomial denominators, then rejected pole candidates and validated residuals.'
          : 'Solved the numeric polynomial globally, preserving real and non-real roots for Complex On.',
        ...(input.polynomial.degree > 16
          ? ['Large-degree root lists use progressive/capped branch rendering; narrow or factor the equation when individual roots need inspection.']
          : []),
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

  if (input.diagnostics) {
    const diagnostics = input.diagnostics;
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
        ...multiplicityEstimateLines(diagnostics, input.complexExactForm),
        ...decimalRevalidationLines(diagnostics),
        ...diagnostics.warningLines,
      ],
    });
  }

  sections.push({
    title: 'Complex Numeric Validation',
    lines: [
      `Accepted ${input.accepted.length} validated complex root${input.accepted.length === 1 ? '' : 's'}.`,
      `Residual tolerance: ${COMPLEX_RESIDUAL_TOLERANCE}.`,
      ...rootResidualLines(
        input.accepted,
        input.polynomial,
        input.classification.selectedTarget ?? 'x',
        input.complexExactForm,
      ),
      ...(input.rejected.length > 0 ? [`Rejected ${input.rejected.length} candidate${input.rejected.length === 1 ? '' : 's'}.`] : []),
    ],
  });

  const extraneous = buildExtraneousSolutionsDetailSection(input.rejected.map((candidate) => ({
    candidateLatex: formatComplexRootLatex(candidate.value, input.complexExactForm),
    reason: candidate.reason,
  })));
  return extraneous ? [...sections, extraneous] : sections;
}

export function tryComplexNumericPolynomialFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  complexExactForm: ComplexExactForm;
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
  const denominatorChecks = denominatorChecksFor(polynomial, classification);
  const effectivePolynomial: SolvableNumericPolynomial = denominatorChecks.length > 0 && polynomial.kind === 'polynomial'
    ? { ...polynomial, kind: 'rational' }
    : polynomial;
  const method = effectivePolynomial.kind === 'rational' ? NUMERIC_METHOD_RATIONAL : NUMERIC_METHOD_POLYNOMIAL;
  const solveResult = solvePolynomialRoots({ coefficients: polynomial.coefficients });
  if (solveResult.kind === 'error') {
    return {
      kind: 'error',
      title: 'Solve',
      error: solveResult.error,
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'complex',
      solveBadges: effectivePolynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections: detailSectionsFor({
        classification,
        polynomial: effectivePolynomial,
        accepted: [],
        rejected: [],
        complexExactForm: input.complexExactForm,
      }),
    };
  }

  const validation = validateComplexRoots(effectivePolynomial, solveResult.roots, denominatorChecks);
  const detailSections = detailSectionsFor({
    classification,
    polynomial: effectivePolynomial,
    diagnostics: solveResult.diagnostics,
    accepted: validation.accepted,
    rejected: validation.rejected,
    complexExactForm: input.complexExactForm,
  });
  if (validation.accepted.length === 0) {
    return {
      kind: 'error',
      title: 'Solve',
      error: 'Numeric complex candidates were found but rejected after denominator and residual validation.',
      warnings: [],
      solutionKind: 'approximate-numeric',
      answerDomain: 'complex',
      rejectedCandidateCount: validation.rejected.length,
      solveBadges: effectivePolynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
      numericMethod: method,
      detailSections,
    };
  }

  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const branchesLatex = validation.accepted.map((root) => formatComplexRootLatex(root, input.complexExactForm));
  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, validation.accepted, input.complexExactForm),
    approxText: approximateText(classification.selectedTarget, validation.accepted, input.complexExactForm),
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\approx',
      branchesLatex,
      label: 'Numeric Complex Roots',
      source: 'equation-complex-numeric-polynomial',
    }),
    warnings: [],
    solutionKind: 'approximate-numeric',
    resultOrigin: 'numeric-fallback',
    answerDomain: 'complex',
    solveBadges: effectivePolynomial.kind === 'rational' ? ['LCD Clear', 'Candidate Checked'] : ['Candidate Checked'],
    solveSummaryText: `${method}. Accepted ${validation.accepted.length} validated complex root${validation.accepted.length === 1 ? '' : 's'}${validation.rejected.length > 0 ? `, rejected ${validation.rejected.length}.` : '.'}`,
    rejectedCandidateCount: validation.rejected.length > 0 ? validation.rejected.length : undefined,
    numericMethod: method,
    detailSections,
  };
}
