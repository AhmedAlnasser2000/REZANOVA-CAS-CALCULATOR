import { finiteBranchReadbackMetadata } from '../../display/branch-readback';
import { formatApproxNumber } from '../../display/format';
import { buildNumericConfidenceSection } from '../../equation/numeric-confidence-readback';
import { equationTargetLatex } from '../../equation/equation-target';
import {
  diagnosePrincipalBranchPolicyForLatex,
} from '../../equation/complex/branch-cut-policy';
import {
  diagnoseMeromorphicPolicyForLatex,
} from '../../equation/complex/meromorphic-policy';
import {
  diagnoseComplexInfiniteFamilyPolicyForLatex,
} from '../../equation/complex/infinite-family-policy';
import {
  diagnoseComplexLocusPolicyForLatex,
} from '../../equation/complex/locus-policy';
import type { ComplexContourWindingResult } from '../../equation/complex/contour-winding';
import {
  createComplexNumericEvaluator,
} from '../../equation/complex/numeric-evaluator';
import {
  validateComplexRootBoxes,
  type ComplexLocalBoxValidation,
} from '../../equation/complex/local-box-validation';
import type { ComplexNewtonCandidate, ComplexRectangularRegion } from '../../equation/complex/seed-grid-newton';
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
import {
  searchComplexRegionWithSubdivision,
  type ComplexRegionSubdivisionDiagnostics,
} from './complex-region-subdivision';
import { unsupportedComplexLocusOutcome } from './outcomes';

const COMPLEX_REGION_RESIDUAL_TOLERANCE = 1e-8;
const DEFAULT_GRID_SIZE = 7;
const DEFAULT_RANDOM_SEED_COUNT = 0;
const DEFAULT_SAMPLES_PER_EDGE = 96;
const DEFAULT_SUBDIVISION_DEPTH = 0;
const DEFAULT_CELL_BUDGET = 1;
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
      `Zeros minus known poles: ${contour.zerosMinusPoles}.`,
      `Known pole count: ${contour.knownPoleCount}.`,
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
      contour.zerosMinusPoles === null
        ? 'Zeros minus known poles: unavailable.'
        : `Zeros minus known poles: ${contour.zerosMinusPoles}.`,
      `Known pole count: ${contour.knownPoleCount}.`,
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
    `Known pole count: ${contour.knownPoleCount}.`,
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

function localBoxValidationLines(input: {
  target: string;
  complexExactForm: ComplexExactForm;
  boxes: readonly ComplexLocalBoxValidation[];
}) {
  const validated = input.boxes.filter((box) => box.status === 'validated');
  const inconclusive = input.boxes.filter((box) => box.status !== 'validated');
  return [
    `Validated local boxes: ${validated.length}.`,
    `Inconclusive local boxes: ${inconclusive.length}.`,
    ...input.boxes.map((box) => {
      const rootText = `${input.target}≈${formatComplexRootText(box.center, input.complexExactForm)}`;
      const radiusText = `box radius ${formatDiagnosticNumber(box.boxRadius)}`;
      const derivativeText = box.derivativeMagnitude === null
        ? 'derivative unavailable'
        : `derivative |f'| ${formatDiagnosticNumber(box.derivativeMagnitude)}`;
      const contractionText = box.contractionRadius === null
        ? 'contraction unavailable'
        : `contraction ${formatDiagnosticNumber(box.contractionRadius)}`;
      return box.status === 'validated'
        ? `${rootText}: Krawczyk contraction stayed inside the local box (${radiusText}, ${contractionText}, ${derivativeText}).`
        : `${rootText}: local box inconclusive (${radiusText}, ${contractionText}, ${derivativeText}); ${box.reason}.`;
    }),
  ];
}

function diagnosticsSections(input: {
  region: ComplexRectangularRegion;
  gridSize: number;
  randomSeedCount: number;
  samplesPerEdge: number;
  subdivisionDepth: number;
  cellBudget: number;
  newton: ReturnType<typeof searchComplexRegionWithSubdivision>['newton'];
  moments: ReturnType<typeof searchComplexRegionWithSubdivision>['moments'];
  contour: ComplexContourWindingResult;
  accepted: readonly ComplexNewtonCandidate[];
  localBoxes: readonly ComplexLocalBoxValidation[];
  branchPolicyLines: readonly string[];
  meromorphicPolicyLines: readonly string[];
  infiniteFamilyPolicyLines: readonly string[];
  target: string;
  complexExactForm: ComplexExactForm;
  subdivision: ComplexRegionSubdivisionDiagnostics;
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
        `Subdivision depth limit: ${input.subdivisionDepth}.`,
        `Cell budget: ${input.cellBudget}.`,
      ],
    },
    {
      title: 'Complex Subdivision',
      lines: [
        input.subdivision.enabled
          ? 'Adaptive subdivision: enabled.'
          : 'Adaptive subdivision: not enabled for this run.',
        `Processed cells: ${input.subdivision.processedCellCount}.`,
        `Split cells: ${input.subdivision.splitCellCount}.`,
        `Verified cells: ${input.subdivision.verifiedCellCount}.`,
        `Inconclusive terminal cells: ${input.subdivision.inconclusiveCellCount}.`,
        `Unsafe terminal cells: ${input.subdivision.unsafeCellCount}.`,
        `Maximum depth reached: ${input.subdivision.maxDepthReached}.`,
        input.subdivision.exhaustedCellBudget
          ? 'Cell budget exhausted before all cells were verified.'
          : 'Cell budget was sufficient for the processed cells.',
        ...input.subdivision.terminalReasons.slice(0, 3).map((reason) => `Terminal reason: ${reason}`),
      ],
    },
    {
      title: 'Complex Branch-Cut Policy',
      lines: [...input.branchPolicyLines],
    },
    {
      title: 'Complex Pole Policy',
      lines: [...input.meromorphicPolicyLines],
    },
    {
      title: 'Complex Infinite-Family Policy',
      lines: [...input.infiniteFamilyPolicyLines],
    },
    {
      title: 'Complex Search Diagnostics',
      lines: [
        `Deterministic seeds: ${input.newton.diagnostics.deterministicSeedCount}.`,
        `Adaptive midpoint seeds: ${input.newton.diagnostics.adaptiveSeedCount}.`,
        `Contour moment seeds: ${input.newton.diagnostics.contourMomentSeedCount}.`,
        `Low-discrepancy seeds: ${input.newton.diagnostics.lowDiscrepancySeedCount}.`,
        `Supplemental random seeds: ${input.newton.diagnostics.randomSeedCount}.`,
        `Attempted seeds: ${input.newton.diagnostics.attemptedSeedCount}.`,
        `Converged seeds: ${input.newton.diagnostics.convergedSeedCount}.`,
        `Rejected seeds: ${input.newton.diagnostics.rejectedSeedCount}.`,
        `Duplicate roots merged: ${input.newton.diagnostics.duplicateCount}.`,
        `Cluster polish seeds: ${input.newton.diagnostics.clusterPolishSeedCount}.`,
        `Analytic derivative steps: ${input.newton.diagnostics.analyticDerivativeCount}.`,
        `Finite-difference derivative steps: ${input.newton.diagnostics.finiteDifferenceDerivativeCount}.`,
        `Damping retries: ${input.newton.diagnostics.dampingRetryCount}.`,
        `Max-iteration exits: ${input.newton.diagnostics.maxIterationsReached}.`,
        `Total evaluator calls: ${input.newton.diagnostics.totalEvaluations}.`,
      ],
    },
    {
      title: 'Complex Contour Moments',
      lines: [
        input.moments.attemptedCellCount > 0
          ? 'Contour-moment fallback: attempted.'
          : 'Contour-moment fallback: not needed for this run.',
        `Moment cells attempted: ${input.moments.attemptedCellCount}.`,
        `Moment boundary samples: ${input.moments.sampleCount}.`,
        `Moment seeds generated: ${input.moments.generatedSeedCount}.`,
        `Moment seeds accepted: ${input.moments.acceptedSeedCount}.`,
        `Moment inconclusive attempts: ${input.moments.inconclusiveCount}.`,
        ...input.moments.fallbackReasons.slice(0, 3).map((reason) => `Moment fallback reason: ${reason}.`),
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
      title: 'Complex Local Box Validation',
      lines: localBoxValidationLines({
        target: input.target,
        complexExactForm: input.complexExactForm,
        boxes: input.localBoxes,
      }),
    },
    {
      title: 'Complex Contour Verification',
      lines: contourLines(input.contour),
    },
  );
  return sections;
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

function needsComplexRegionOutcome(input: { target: string }): DisplayOutcome {
  return unsupportedRegionOutcome({
    error: 'This complex equation needs Complex Region bounds before a bounded numeric search can run.',
    detailSections: [
      {
        title: 'Complex Region Needed',
        lines: [
          `Selected target: ${input.target}.`,
          'Exact Complex routes did not close this holomorphic nonlinear equation.',
          'Complex Region solving searches a finite rectangle and reports roots verified inside that chosen region.',
        ],
      },
      {
        title: 'What To Try',
        lines: [
          'Enable Complex Region, keep Complex On, choose finite real and imaginary bounds, then run again.',
          'Start with [-2, 2] for real and imaginary bounds; widen only when the bounded evidence says the region is incomplete.',
        ],
      },
    ],
  });
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
    input.sharedOutcome.kind !== 'error'
    || !NUMERIC_FALLBACK_ELIGIBLE_ERRORS.has(input.sharedOutcome.error)
  ) {
    return undefined;
  }

  if (!input.complexRegion) {
    const classification = classifyEquationNumericShape({
      equationLatex: input.equationLatex,
      equationSolveTarget: input.equationSolveTarget,
      angleUnit: input.angleUnit,
    });
    return classification.numericReady && classification.selectedTarget
      ? needsComplexRegionOutcome({
          target: classification.selectedTarget,
        })
      : undefined;
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
  const selectedTarget = classification.selectedTarget;

  const locusPolicy = diagnoseComplexLocusPolicyForLatex(input.equationLatex, {
    target: selectedTarget,
  });
  if (locusPolicy.hasLocusDeferredCarrier) {
    return unsupportedComplexLocusOutcome(locusPolicy, {
      equationLatex: input.equationLatex,
      target: selectedTarget,
      complexRegion: input.complexRegion,
    });
  }

  const branchPolicy = diagnosePrincipalBranchPolicyForLatex(input.equationLatex, {
    target: selectedTarget,
    region,
  });
  const gridSize = input.complexRegion.gridSize ?? DEFAULT_GRID_SIZE;
  const randomSeedCount = input.complexRegion.randomSeedCount ?? DEFAULT_RANDOM_SEED_COUNT;
  const samplesPerEdge = input.complexRegion.samplesPerEdge ?? DEFAULT_SAMPLES_PER_EDGE;
  const subdivisionDepth = input.complexRegion.subdivisionDepth ?? DEFAULT_SUBDIVISION_DEPTH;
  const cellBudget = input.complexRegion.cellBudget ?? DEFAULT_CELL_BUDGET;
  const subdivisionEnabled = subdivisionDepth > 0 && cellBudget > 1;
  const meromorphicPolicy = diagnoseMeromorphicPolicyForLatex(input.equationLatex, {
    target: selectedTarget,
    region,
  });
  const infiniteFamilyPolicy = diagnoseComplexInfiniteFamilyPolicyForLatex(input.equationLatex, {
    target: selectedTarget,
  });
  if (branchPolicy.shouldStop && !subdivisionEnabled) {
    return unsupportedRegionOutcome({
      error: 'Complex region crosses an unsupported principal branch cut.',
      detailSections: [{
        title: 'Complex Branch-Cut Policy',
        lines: branchPolicy.detailLines,
      }],
    });
  }
  if (meromorphicPolicy.shouldStop && !subdivisionEnabled) {
    return unsupportedRegionOutcome({
      error: 'Complex region has unresolved or boundary pole evidence.',
      detailSections: [{
        title: 'Complex Pole Policy',
        lines: meromorphicPolicy.detailLines,
      }],
    });
  }

  const evaluator = createComplexNumericEvaluator({
    expressionLatex: input.equationLatex,
    target: selectedTarget,
  });
  const search = searchComplexRegionWithSubdivision({
    evaluator,
    region,
    gridSize,
    randomSeedCount,
    samplesPerEdge,
    residualTolerance: COMPLEX_REGION_RESIDUAL_TOLERANCE,
    subdivisionDepth,
    cellBudget,
    cellPolicyForRegion: (cellRegion) => {
      const cellBranchPolicy = diagnosePrincipalBranchPolicyForLatex(input.equationLatex, {
        target: selectedTarget,
        region: cellRegion,
      });
      const cellPolePolicy = diagnoseMeromorphicPolicyForLatex(input.equationLatex, {
        target: selectedTarget,
        region: cellRegion,
      });
      return {
        shouldStop: cellBranchPolicy.shouldStop || cellPolePolicy.shouldStop,
        reason: [
          ...(cellBranchPolicy.shouldStop ? ['Complex region cell crosses an unsupported principal branch cut.'] : []),
          ...(cellPolePolicy.shouldStop ? ['Complex region cell has unresolved or boundary pole evidence.'] : []),
        ].join(' '),
        knownPoleCount: cellPolePolicy.knownPoleCount,
        branchDiagnosticCount: cellBranchPolicy.diagnostics.length,
        poleDiagnosticCount: cellPolePolicy.diagnostics.length,
      };
    },
  });
  const { accepted, contour, newton, subdivision } = search;
  const { moments } = search;
  const localBoxes = validateComplexRootBoxes({
    evaluator,
    roots: accepted.map((candidate) => candidate.value),
    region,
  });
  if (contour.kind === 'unsafe') {
    return unsupportedRegionOutcome({
      error: 'Complex region contour is unsafe for verified nonlinear solving.',
      detailSections: diagnosticsSections({
        region,
        gridSize,
        randomSeedCount,
        samplesPerEdge,
        subdivisionDepth,
        cellBudget,
        newton,
        moments,
        contour,
        accepted,
        localBoxes,
        branchPolicyLines: branchPolicy.detailLines,
        meromorphicPolicyLines: meromorphicPolicy.detailLines,
        infiniteFamilyPolicyLines: infiniteFamilyPolicy.detailLines,
        target: selectedTarget,
        complexExactForm: input.complexExactForm,
        subdivision,
      }),
    });
  }

  if (contour.kind === 'inconclusive') {
    return unsupportedRegionOutcome({
      error: 'Complex region subdivision did not verify root-count agreement.',
      detailSections: diagnosticsSections({
        region,
        gridSize,
        randomSeedCount,
        samplesPerEdge,
        subdivisionDepth,
        cellBudget,
        newton,
        moments,
        contour,
        accepted,
        localBoxes,
        branchPolicyLines: branchPolicy.detailLines,
        meromorphicPolicyLines: meromorphicPolicy.detailLines,
        infiniteFamilyPolicyLines: infiniteFamilyPolicy.detailLines,
        target: selectedTarget,
        complexExactForm: input.complexExactForm,
        subdivision,
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
        subdivisionDepth,
        cellBudget,
        newton,
        moments,
        contour,
        accepted,
        localBoxes,
        branchPolicyLines: branchPolicy.detailLines,
        meromorphicPolicyLines: meromorphicPolicy.detailLines,
        infiniteFamilyPolicyLines: infiniteFamilyPolicy.detailLines,
        target: selectedTarget,
        complexExactForm: input.complexExactForm,
        subdivision,
      }),
    });
  }

  const roots = accepted.map((candidate) => candidate.value);
  const targetLatex = equationTargetLatex(selectedTarget);
  const branchesLatex = roots.map((root) => formatComplexRootLatex(root, input.complexExactForm));
  return {
    kind: 'success',
    title: 'Solve',
    exactLatex: approximateEquationLatex(targetLatex, roots, input.complexExactForm),
    approxText: approximateText(selectedTarget, roots, input.complexExactForm),
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
      subdivisionDepth,
      cellBudget,
      newton,
      moments,
      contour,
      accepted,
      localBoxes,
      branchPolicyLines: branchPolicy.detailLines,
      meromorphicPolicyLines: meromorphicPolicy.detailLines,
      infiniteFamilyPolicyLines: infiniteFamilyPolicy.detailLines,
      target: selectedTarget,
      complexExactForm: input.complexExactForm,
      subdivision,
    }),
  };
}
