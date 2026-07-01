import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import { equationTargetLatex } from '../../equation/equation-target';
import {
  diagnosePrincipalBranchPolicyForLatex,
} from '../../equation/complex/branch-cut-policy';
import {
  verifyComplexContourWinding,
  type ComplexContourWindingResult,
} from '../../equation/complex/contour-winding';
import {
  createComplexNumericEvaluator,
  type ComplexNumericEvaluator,
} from '../../equation/complex/numeric-evaluator';
import {
  findComplexNewtonCandidates,
  type ComplexNewtonCandidate,
  type ComplexRectangularRegion,
} from '../../equation/complex/seed-grid-newton';
import {
  complexAbs,
  complexToApproxText,
  complexToLatex,
  type ComplexValue,
} from '../../numeric/complex';
import type {
  AngleUnit,
  ComplexExactForm,
  ComplexSolveRegion,
  DisplayDetailSection,
  DisplayOutcome,
} from '../../../types/calculator';
import { classifyEquationNumericShape } from './numeric-shape-classifier';
import { NUMERIC_FALLBACK_ELIGIBLE_ERRORS } from './numeric-polynomial-extraction';

const COMPLEX_REGION_RESIDUAL_TOLERANCE = 1e-8;
const DEFAULT_GRID_SIZE = 7;
const DEFAULT_RANDOM_SEED_COUNT = 0;
const DEFAULT_SAMPLES_PER_EDGE = 96;
const METHOD_LABEL = 'Complex region nonlinear solve';

function numericRegionFromRequest(region: ComplexSolveRegion): ComplexRectangularRegion | null {
  const parsed = {
    reMin: Number(region.reMin),
    reMax: Number(region.reMax),
    imMin: Number(region.imMin),
    imMax: Number(region.imMax),
  };
  return Number.isFinite(parsed.reMin)
    && Number.isFinite(parsed.reMax)
    && Number.isFinite(parsed.imMin)
    && Number.isFinite(parsed.imMax)
    && parsed.reMin < parsed.reMax
    && parsed.imMin < parsed.imMax
    ? parsed
    : null;
}

function formatDiagnosticNumber(value: number) {
  const magnitude = Math.abs(value);
  return magnitude > 0 && (magnitude < 1e-4 || magnitude >= 1e6)
    ? value.toExponential(2)
    : formatApproxNumber(value);
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

function regionLines(region: ComplexRectangularRegion) {
  return [
    `Real bounds: [${formatApproxNumber(region.reMin)}, ${formatApproxNumber(region.reMax)}].`,
    `Imaginary bounds: [${formatApproxNumber(region.imMin)}, ${formatApproxNumber(region.imMax)}].`,
  ];
}

function contourLines(contour: ComplexContourWindingResult) {
  if (contour.kind === 'verified') {
    return [
      `Contour count verified: ${contour.rootCount} root${contour.rootCount === 1 ? '' : 's'} in this region.`,
      `Candidate count: ${contour.candidateCount}.`,
      `Winding number: ${contour.windingNumber}.`,
      `Boundary samples: ${contour.boundarySampleCount}.`,
      `Minimum boundary residual: ${formatDiagnosticNumber(contour.minimumBoundaryResidual)}.`,
    ];
  }
  if (contour.kind === 'inconclusive') {
    return [
      `Region evidence incomplete: ${contour.reason}`,
      contour.rootCount === null
        ? 'Contour root count: unavailable.'
        : `Contour root count estimate: ${contour.rootCount}.`,
      `Candidate count: ${contour.candidateCount}.`,
      contour.windingNumber === null
        ? 'Winding number: unavailable.'
        : `Winding number: ${contour.windingNumber}.`,
      `Boundary samples: ${contour.boundarySampleCount}.`,
      contour.minimumBoundaryResidual === null
        ? 'Minimum boundary residual: unavailable.'
        : `Minimum boundary residual: ${formatDiagnosticNumber(contour.minimumBoundaryResidual)}.`,
    ];
  }
  return [
    `Region evidence incomplete: ${contour.reason}`,
    `Boundary samples: ${contour.boundarySampleCount}.`,
    contour.minimumBoundaryResidual === null
      ? 'Minimum boundary residual: unavailable.'
      : `Minimum boundary residual: ${formatDiagnosticNumber(contour.minimumBoundaryResidual)}.`,
  ];
}

function validationLines(input: {
  target: string;
  accepted: readonly ComplexNewtonCandidate[];
  complexExactForm: ComplexExactForm;
}) {
  return [
    `Accepted ${input.accepted.length} validated complex root${input.accepted.length === 1 ? '' : 's'} in the selected region.`,
    `Residual tolerance: ${COMPLEX_REGION_RESIDUAL_TOLERANCE}.`,
    ...input.accepted.map((candidate) =>
      `${input.target}≈${formatComplexRootText(candidate.value, input.complexExactForm)} residual ${formatDiagnosticNumber(candidate.residualNorm)} (${candidate.source}, ${candidate.iterations} iteration${candidate.iterations === 1 ? '' : 's'}).`),
  ];
}

function diagnosticsSections(input: {
  region: ComplexRectangularRegion;
  gridSize: number;
  randomSeedCount: number;
  samplesPerEdge: number;
  newton: ReturnType<typeof findComplexNewtonCandidates>;
  contour: ComplexContourWindingResult;
  accepted: readonly ComplexNewtonCandidate[];
  branchPolicyLines: readonly string[];
  target: string;
  complexExactForm: ComplexExactForm;
}) {
  const confidence = buildNumericConfidenceSection([
    'roots found in this complex region.',
    input.contour.kind === 'verified'
      ? 'contour count verified.'
      : 'region evidence incomplete.',
    'Candidate roots validated against original equation.',
  ]);
  const sections: DisplayDetailSection[] = [
    {
      title: 'Complex Region Method',
      lines: [
        'No supported exact form was found; showing validated approximate complex roots in the selected region.',
        `Method: ${METHOD_LABEL}.`,
        'Complex nonlinear solving uses principal branches only in this milestone.',
        'This is local to the supplied rectangular region and does not claim global Complex completeness.',
      ],
    },
  ];
  if (confidence) {
    sections.push(confidence);
  }
  sections.push(
    {
      title: 'Complex Region',
      lines: [
        ...regionLines(input.region),
        `Deterministic grid size: ${input.gridSize} by ${input.gridSize}.`,
        `Supplemental random seeds: ${input.randomSeedCount}.`,
        `Contour samples per edge: ${input.samplesPerEdge}.`,
      ],
    },
    {
      title: 'Complex Branch-Cut Policy',
      lines: [...input.branchPolicyLines],
    },
    {
      title: 'Complex Search Diagnostics',
      lines: [
        `Deterministic seeds: ${input.newton.diagnostics.deterministicSeedCount}.`,
        `Supplemental random seeds: ${input.newton.diagnostics.randomSeedCount}.`,
        `Attempted seeds: ${input.newton.diagnostics.attemptedSeedCount}.`,
        `Converged seeds: ${input.newton.diagnostics.convergedSeedCount}.`,
        `Rejected seeds: ${input.newton.diagnostics.rejectedSeedCount}.`,
        `Duplicate roots merged: ${input.newton.diagnostics.duplicateCount}.`,
        `Max-iteration exits: ${input.newton.diagnostics.maxIterationsReached}.`,
        `Total evaluator calls: ${input.newton.diagnostics.totalEvaluations}.`,
      ],
    },
    {
      title: 'Complex Region Validation',
      lines: validationLines({
        target: input.target,
        accepted: input.accepted,
        complexExactForm: input.complexExactForm,
      }),
    },
    {
      title: 'Complex Contour Verification',
      lines: contourLines(input.contour),
    },
  );
  return sections;
}

function validateCandidates(
  evaluator: ComplexNumericEvaluator,
  candidates: readonly ComplexNewtonCandidate[],
) {
  return candidates.filter((candidate) => {
    const evaluated = evaluator.evaluateAt(candidate.value);
    return evaluated.status === 'finite'
      && evaluated.residualNorm !== null
      && evaluated.residualNorm <= COMPLEX_REGION_RESIDUAL_TOLERANCE;
  });
}

function unsupportedRegionOutcome(input: {
  error: string;
  detailSections: DisplayDetailSection[];
}): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Solve',
    error: input.error,
    warnings: [],
    solutionKind: 'approximate-numeric',
    answerDomain: 'complex',
    numericMethod: METHOD_LABEL,
    detailSections: input.detailSections,
  };
}

export function tryComplexRegionNonlinearSolveFallback(input: {
  equationLatex: string;
  equationSolveTarget: string;
  angleUnit: AngleUnit;
  complexExactForm: ComplexExactForm;
  complexRegion?: ComplexSolveRegion;
  sharedOutcome: DisplayOutcome;
}): DisplayOutcome | undefined {
  if (
    !input.complexRegion
    || input.sharedOutcome.kind !== 'error'
    || !NUMERIC_FALLBACK_ELIGIBLE_ERRORS.has(input.sharedOutcome.error)
  ) {
    return undefined;
  }

  const region = numericRegionFromRequest(input.complexRegion);
  if (!region) {
    return unsupportedRegionOutcome({
      error: 'Complex region solving needs finite rectangular bounds with reMin < reMax and imMin < imMax.',
      detailSections: [{
        title: 'Complex Region',
        lines: ['Provide finite real and imaginary bounds for the bounded Complex region solve.'],
      }],
    });
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
  ) {
    return undefined;
  }

  const branchPolicy = diagnosePrincipalBranchPolicyForLatex(input.equationLatex, {
    target: classification.selectedTarget,
    region,
  });
  if (branchPolicy.shouldStop) {
    return unsupportedRegionOutcome({
      error: 'Complex region crosses an unsupported principal branch cut.',
      detailSections: [{
        title: 'Complex Branch-Cut Policy',
        lines: branchPolicy.detailLines,
      }],
    });
  }

  const evaluator = createComplexNumericEvaluator({
    expressionLatex: input.equationLatex,
    target: classification.selectedTarget,
  });
  const gridSize = input.complexRegion.gridSize ?? DEFAULT_GRID_SIZE;
  const randomSeedCount = input.complexRegion.randomSeedCount ?? DEFAULT_RANDOM_SEED_COUNT;
  const samplesPerEdge = input.complexRegion.samplesPerEdge ?? DEFAULT_SAMPLES_PER_EDGE;
  const newton = findComplexNewtonCandidates({
    evaluator,
    region,
    gridSize,
    randomSeedCount,
    tolerance: COMPLEX_REGION_RESIDUAL_TOLERANCE,
  });
  const accepted = validateCandidates(evaluator, newton.candidates);
  const contour = verifyComplexContourWinding({
    evaluator,
    region,
    candidates: accepted,
    samplesPerEdge,
  });
  if (contour.kind === 'unsafe') {
    return unsupportedRegionOutcome({
      error: 'Complex region contour is unsafe for verified nonlinear solving.',
      detailSections: diagnosticsSections({
        region,
        gridSize,
        randomSeedCount,
        samplesPerEdge,
        newton,
        contour,
        accepted,
        branchPolicyLines: branchPolicy.detailLines,
        target: classification.selectedTarget,
        complexExactForm: input.complexExactForm,
      }),
    });
  }

  if (accepted.length === 0) {
    return unsupportedRegionOutcome({
      error: contour.kind === 'verified' && contour.rootCount === 0
        ? 'No validated complex roots were found in this region.'
        : 'Complex region search did not find validated roots with enough evidence.',
      detailSections: diagnosticsSections({
        region,
        gridSize,
        randomSeedCount,
        samplesPerEdge,
        newton,
        contour,
        accepted,
        branchPolicyLines: branchPolicy.detailLines,
        target: classification.selectedTarget,
        complexExactForm: input.complexExactForm,
      }),
    });
  }

  const roots = accepted.map((candidate) => candidate.value);
  const targetLatex = equationTargetLatex(classification.selectedTarget);
  const branchesLatex = roots.map((root) => formatComplexRootLatex(root, input.complexExactForm));
  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, roots, input.complexExactForm),
    approxText: approximateText(classification.selectedTarget, roots, input.complexExactForm),
    branchReadback: finiteBranchReadbackMetadata({
      targetLatex,
      relationLatex: '\\approx',
      branchesLatex,
      label: 'Complex Region Roots',
      source: 'equation-complex-region-nonlinear',
    }),
    warnings: [],
    solutionKind: 'approximate-numeric',
    resultOrigin: 'numeric-fallback',
    answerDomain: 'complex',
    solveBadges: ['Candidate Checked'],
    solveSummaryText: `${METHOD_LABEL}. Accepted ${accepted.length} validated complex root${accepted.length === 1 ? '' : 's'} in the selected region.`,
    numericMethod: METHOD_LABEL,
    detailSections: diagnosticsSections({
      region,
      gridSize,
      randomSeedCount,
      samplesPerEdge,
      newton,
      contour,
      accepted,
      branchPolicyLines: branchPolicy.detailLines,
      target: classification.selectedTarget,
      complexExactForm: input.complexExactForm,
    }),
  };
}
