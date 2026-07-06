import { ComputeEngine } from '@cortex-js/compute-engine';
import { formatApproxNumber } from '../../display/format';
import {
  complex,
  complexAbs,
  complexAdd,
  complexConjugate,
  complexDiv,
  complexMul,
  complexNeg,
  complexPowInteger,
  complexSub,
  normalizeComplex,
  type ComplexValue,
} from '../../numeric/complex';
import type { ComplexSolveRegion, DisplayDetailSection } from '../../../types/calculator';
import { containsTarget, isArrayNode } from './math-json';
import { normalizeComplexLocusFunctionSyntax, type ComplexLocusPolicyReport } from './locus-policy';
import type { MathJson } from './types';

type NumericRegion = {
  reMin: number;
  reMax: number;
  imMin: number;
  imMax: number;
};

type LocusEvaluationResult =
  | { status: 'finite'; value: ComplexValue; residualNorm: number }
  | { status: 'undefined' | 'unsupported' };
type FiniteLocusEvaluationResult = Extract<LocusEvaluationResult, { status: 'finite' }>;

type ProbePoint = {
  value: ComplexValue;
  source: string;
};

type CandidatePoint = ProbePoint & {
  residual: number;
};

const ce = new ComputeEngine();
const DEFAULT_GRID_SIZE = 7;
const RESIDUAL_TOLERANCE = 1e-6;
const MAX_CANDIDATE_LINES = 6;

function numericRegionFromRequest(region?: ComplexSolveRegion): NumericRegion | null {
  if (!region) {
    return null;
  }
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

function formatComplexPoint(value: ComplexValue) {
  const normalized = normalizeComplex(value, 1e-9);
  const re = formatApproxNumber(normalized.re);
  const im = formatApproxNumber(normalized.im);
  if (normalized.im === 0) {
    return re;
  }
  if (normalized.re === 0) {
    return `${im}i`;
  }
  return `${re}${normalized.im < 0 ? '-' : '+'}${formatApproxNumber(Math.abs(normalized.im))}i`;
}

function zeroFormNode(node: MathJson): MathJson {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? ['Subtract', node[1] as MathJson, node[2] as MathJson]
    : node;
}

function parseEquationNode(equationLatex: string): MathJson | null {
  try {
    return ce.parse(normalizeComplexLocusFunctionSyntax(equationLatex)).json as MathJson;
  } catch {
    return null;
  }
}

function finiteComplex(value: ComplexValue) {
  return Number.isFinite(value.re) && Number.isFinite(value.im);
}

function unsupported(): LocusEvaluationResult {
  return { status: 'unsupported' };
}

function isFiniteEvaluation(result: LocusEvaluationResult): result is FiniteLocusEvaluationResult {
  return result.status === 'finite';
}

function undefinedValue(): LocusEvaluationResult {
  return { status: 'undefined' };
}

function finite(value: ComplexValue): LocusEvaluationResult {
  if (!finiteComplex(value)) {
    return undefinedValue();
  }
  const normalized = normalizeComplex(value);
  return {
    status: 'finite',
    value: normalized,
    residualNorm: complexAbs(normalized),
  };
}

function evaluateLocusNode(node: MathJson, target: string, value: ComplexValue): LocusEvaluationResult {
  if (typeof node === 'number') {
    return finite(complex(node, 0));
  }
  if (node === target) {
    return finite(value);
  }
  if (typeof node === 'string') {
    if (node === 'Pi') {
      return finite(complex(Math.PI, 0));
    }
    if (node === 'ExponentialE') {
      return finite(complex(Math.E, 0));
    }
    if (node === 'I' || node === 'ImaginaryUnit') {
      return finite(complex(0, 1));
    }
    return unsupported();
  }
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return unsupported();
  }

  const operator = node[0];
  const children = node.slice(1).map((child) => evaluateLocusNode(child as MathJson, target, value));
  const nonFiniteChild = children.find((child) => !isFiniteEvaluation(child));
  if (nonFiniteChild) {
    return nonFiniteChild;
  }
  const args = (children as FiniteLocusEvaluationResult[]).map((child) => child.value);

  try {
    if (operator === 'Add') {
      return finite(args.reduce((sum, part) => complexAdd(sum, part), complex(0, 0)));
    }
    if (operator === 'Subtract') {
      if (args.length === 1) {
        return finite(complexNeg(args[0]));
      }
      return finite(args.slice(1).reduce((left, right) => complexSub(left, right), args[0]));
    }
    if (operator === 'Negate') {
      return args.length === 1 ? finite(complexNeg(args[0])) : unsupported();
    }
    if (operator === 'Multiply') {
      return finite(args.reduce((product, part) => complexMul(product, part), complex(1, 0)));
    }
    if (operator === 'Divide') {
      return args.length === 2 && complexAbs(args[1]) > 1e-12
        ? finite(complexDiv(args[0], args[1]))
        : undefinedValue();
    }
    if (operator === 'Square') {
      return args.length === 1 ? finite(complexMul(args[0], args[0])) : unsupported();
    }
    if (operator === 'Power') {
      const exponent = node[2];
      return args.length === 2 && typeof exponent === 'number' && Number.isInteger(exponent)
        ? finite(complexPowInteger(args[0], exponent))
        : unsupported();
    }
    if (operator === 'Abs') {
      return args.length === 1 ? finite(complex(complexAbs(args[0]), 0)) : unsupported();
    }
    if (operator === 'Re') {
      return args.length === 1 ? finite(complex(args[0].re, 0)) : unsupported();
    }
    if (operator === 'Im') {
      return args.length === 1 ? finite(complex(args[0].im, 0)) : unsupported();
    }
    if (
      operator === 'OverBar'
      || operator === 'Conjugate'
      || operator === 'Conj'
      || operator === 'conj'
      || operator === 'conjugate'
    ) {
      return args.length === 1 ? finite(complexConjugate(args[0])) : unsupported();
    }
  } catch {
    return undefinedValue();
  }
  return unsupported();
}

function evaluateConstant(node: MathJson, target: string): ComplexValue | null {
  if (containsTarget(node, target)) {
    return null;
  }
  const evaluated = evaluateLocusNode(node, target, complex(0, 0));
  return evaluated.status === 'finite' ? evaluated.value : null;
}

function isRealValue(value: ComplexValue, tolerance = 1e-9) {
  return Math.abs(value.im) <= tolerance;
}

function realConstant(node: MathJson, target: string) {
  const value = evaluateConstant(node, target);
  return value && isRealValue(value) ? value.re : null;
}

function pointInRegion(point: ComplexValue, region: NumericRegion, tolerance = 1e-9) {
  return point.re >= region.reMin - tolerance
    && point.re <= region.reMax + tolerance
    && point.im >= region.imMin - tolerance
    && point.im <= region.imMax + tolerance;
}

function addProbe(probes: ProbePoint[], value: ComplexValue, source: string) {
  if (!finiteComplex(value)) {
    return;
  }
  if (probes.some((probe) => complexAbs(complexSub(probe.value, value)) <= 1e-8)) {
    return;
  }
  probes.push({ value: normalizeComplex(value), source });
}

function addProbeIfInRegion(probes: ProbePoint[], value: ComplexValue, source: string, region: NumericRegion) {
  if (pointInRegion(value, region)) {
    addProbe(probes, value, source);
  }
}

function splitEquationSides(node: MathJson) {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? { left: node[1] as MathJson, right: node[2] as MathJson }
    : null;
}

function locusOperator(node: MathJson) {
  return isArrayNode(node) && typeof node[0] === 'string'
    ? node[0]
    : null;
}

function isConjugateOperator(operator: string | null) {
  return operator === 'OverBar'
    || operator === 'Conjugate'
    || operator === 'Conj'
    || operator === 'conj'
    || operator === 'conjugate';
}

function isDirectTargetCarrier(node: MathJson, operator: string, target: string) {
  return isArrayNode(node)
    && node[0] === operator
    && node.length === 2
    && node[1] === target;
}

function parseAffineCenter(node: MathJson, target: string): ComplexValue | null {
  if (node === target) {
    return complex(0, 0);
  }
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return null;
  }
  const operator = node[0];
  const args = node.slice(1) as MathJson[];
  if (operator === 'Add' && args.length === 2) {
    if (args[0] === target) {
      const constant = evaluateConstant(args[1], target);
      return constant ? complexNeg(constant) : null;
    }
    if (args[1] === target) {
      const constant = evaluateConstant(args[0], target);
      return constant ? complexNeg(constant) : null;
    }
  }
  if (operator === 'Subtract' && args.length === 2) {
    if (args[0] === target) {
      return evaluateConstant(args[1], target);
    }
    if (args[1] === target) {
      return evaluateConstant(args[0], target);
    }
  }
  if (operator === 'Negate' && args.length === 1) {
    return parseAffineCenter(args[0], target);
  }
  return null;
}

function analyzeDirectLocus(input: {
  equationNode: MathJson | null;
  target: string;
  region: NumericRegion;
}) {
  const lines: string[] = [];
  const probes: ProbePoint[] = [];
  const sides = input.equationNode ? splitEquationSides(input.equationNode) : null;
  if (!sides) {
    return { lines, probes };
  }

  const candidates = [
    { carrier: sides.left, other: sides.right },
    { carrier: sides.right, other: sides.left },
  ];
  for (const candidate of candidates) {
    const operator = locusOperator(candidate.carrier);
    if (operator === 'Abs' && isArrayNode(candidate.carrier) && candidate.carrier.length === 2) {
      const radius = realConstant(candidate.other, input.target);
      const center = parseAffineCenter(candidate.carrier[1] as MathJson, input.target);
      if (radius === null || !center) {
        lines.push('Absolute-value carrier detected, but its simple circle or point parameters were not isolated.');
        continue;
      }
      if (radius < 0) {
        lines.push('Absolute-value magnitude equals a negative real value, so the realified locus is empty.');
      } else if (Math.abs(radius) <= 1e-10) {
        lines.push(`Absolute-value magnitude collapses to the candidate point ${input.target}=${formatComplexPoint(center)}.`);
        addProbeIfInRegion(probes, center, 'absolute-value point locus', input.region);
      } else {
        lines.push(
          `Absolute-value magnitude describes a circle-like locus centered at ${formatComplexPoint(center)} with radius ${formatDiagnosticNumber(radius)}.`,
        );
        addProbeIfInRegion(probes, complex(center.re + radius, center.im), 'circle real-axis probe', input.region);
        addProbeIfInRegion(probes, complex(center.re - radius, center.im), 'circle real-axis probe', input.region);
        addProbeIfInRegion(probes, complex(center.re, center.im + radius), 'circle imaginary-axis probe', input.region);
        addProbeIfInRegion(probes, complex(center.re, center.im - radius), 'circle imaginary-axis probe', input.region);
      }
    } else if (operator === 'Re' && isDirectTargetCarrier(candidate.carrier, 'Re', input.target)) {
      const constant = realConstant(candidate.other, input.target);
      if (constant === null) {
        lines.push('Real-part carrier detected, but its real constant was not isolated.');
      } else {
        lines.push(`Real-part condition describes the vertical line ${input.target}=x+iy with x=${formatDiagnosticNumber(constant)}.`);
        for (const y of [input.region.imMin, (input.region.imMin + input.region.imMax) / 2, input.region.imMax]) {
          addProbeIfInRegion(probes, complex(constant, y), 'real-part line probe', input.region);
        }
      }
    } else if (operator === 'Im' && isDirectTargetCarrier(candidate.carrier, 'Im', input.target)) {
      const constant = realConstant(candidate.other, input.target);
      if (constant === null) {
        lines.push('Imaginary-part carrier detected, but its real constant was not isolated.');
      } else {
        lines.push(`Imaginary-part condition describes the horizontal line ${input.target}=x+iy with y=${formatDiagnosticNumber(constant)}.`);
        for (const x of [input.region.reMin, (input.region.reMin + input.region.reMax) / 2, input.region.reMax]) {
          addProbeIfInRegion(probes, complex(x, constant), 'imaginary-part line probe', input.region);
        }
      }
    } else if (isConjugateOperator(operator) && isDirectTargetCarrier(candidate.carrier, operator ?? '', input.target)) {
      if (candidate.other === input.target) {
        lines.push('Conjugate equality with the target describes the real-axis locus y=0.');
        for (const x of [input.region.reMin, (input.region.reMin + input.region.reMax) / 2, input.region.reMax]) {
          addProbeIfInRegion(probes, complex(x, 0), 'conjugate real-axis probe', input.region);
        }
      } else {
        const constant = evaluateConstant(candidate.other, input.target);
        if (constant) {
          const point = complexConjugate(constant);
          lines.push(`Conjugate equality isolates the candidate point ${input.target}=${formatComplexPoint(point)}.`);
          addProbeIfInRegion(probes, point, 'conjugate point probe', input.region);
        } else {
          lines.push('Conjugate carrier detected, but its companion side was not isolated.');
        }
      }
    }
  }
  return { lines, probes };
}

function sampleLocus(input: {
  equationNode: MathJson;
  target: string;
  region: NumericRegion;
  gridSize: number;
  probes: readonly ProbePoint[];
}) {
  const cellsPerAxis = Math.max(1, Math.min(64, Math.floor(input.gridSize) || DEFAULT_GRID_SIZE));
  const zeroForm = zeroFormNode(input.equationNode);
  const dx = (input.region.reMax - input.region.reMin) / cellsPerAxis;
  const dy = (input.region.imMax - input.region.imMin) / cellsPerAxis;
  let finiteCount = 0;
  let unsupportedCount = 0;
  let residualMin = Number.POSITIVE_INFINITY;
  let residualMax = 0;
  const candidates: CandidatePoint[] = [];

  const inspectPoint = (point: ComplexValue, source: string) => {
    const evaluated = evaluateLocusNode(zeroForm, input.target, point);
    if (evaluated.status !== 'finite') {
      unsupportedCount += 1;
      return;
    }
    finiteCount += 1;
    residualMin = Math.min(residualMin, evaluated.residualNorm);
    residualMax = Math.max(residualMax, evaluated.residualNorm);
    if (evaluated.residualNorm <= RESIDUAL_TOLERANCE) {
      const duplicate = candidates.some((candidate) =>
        complexAbs(complexSub(candidate.value, point)) <= 1e-8);
      if (!duplicate) {
        candidates.push({
          value: normalizeComplex(point),
          residual: evaluated.residualNorm,
          source,
        });
      }
    }
  };

  for (let ix = 0; ix < cellsPerAxis; ix += 1) {
    for (let iy = 0; iy < cellsPerAxis; iy += 1) {
      inspectPoint(
        complex(input.region.reMin + (ix + 0.5) * dx, input.region.imMin + (iy + 0.5) * dy),
        'sampled cell center',
      );
    }
  }
  for (const probe of input.probes) {
    inspectPoint(probe.value, probe.source);
  }

  return {
    cellsPerAxis,
    sampledCellCount: cellsPerAxis * cellsPerAxis,
    evaluatedPointCount: cellsPerAxis * cellsPerAxis + input.probes.length,
    finiteCount,
    unsupportedCount,
    residualMin: Number.isFinite(residualMin) ? residualMin : null,
    residualMax: finiteCount > 0 ? residualMax : null,
    candidates,
  };
}

function regionLines(region: NumericRegion, gridSize: number) {
  return [
    `Real bounds: [${formatApproxNumber(region.reMin)}, ${formatApproxNumber(region.reMax)}].`,
    `Imaginary bounds: [${formatApproxNumber(region.imMin)}, ${formatApproxNumber(region.imMax)}].`,
    `Locus sample grid: ${gridSize} by ${gridSize} cells.`,
  ];
}

function candidateLines(candidates: readonly CandidatePoint[]) {
  if (candidates.length === 0) {
    return ['Candidate finite points from bounded sampling/probes: none at the current tolerance.'];
  }
  return [
    `Candidate finite points from bounded sampling/probes: ${candidates.length}.`,
    ...candidates.slice(0, MAX_CANDIDATE_LINES).map((candidate) =>
      `z≈${formatComplexPoint(candidate.value)} with residual ${formatDiagnosticNumber(candidate.residual)} (${candidate.source}).`),
    ...(candidates.length > MAX_CANDIDATE_LINES
      ? [`Additional candidate points suppressed: ${candidates.length - MAX_CANDIDATE_LINES}.`]
      : []),
  ];
}

export function buildComplexLocusEvidenceSections(input: {
  report: ComplexLocusPolicyReport;
  equationLatex?: string;
  target?: string;
  complexRegion?: ComplexSolveRegion;
}): DisplayDetailSection[] {
  const target = input.target ?? 'z';
  const sections: DisplayDetailSection[] = [{
    title: 'Complex Locus Evidence',
    lines: [
      `Realified target: ${target}=x+iy.`,
      'Evidence scope: locus-deferred.',
      'Analytic contour/root-count solving is skipped for absolute-value, conjugate, real-part, and imaginary-part carriers.',
      'This route records bounded evidence only; it does not emit a curve, region, or solution-set readback yet.',
    ],
  }];

  if (!input.complexRegion) {
    sections.push({
      title: 'Complex Locus Region',
      lines: ['No Complex Region bounds were supplied, so bounded locus sampling was not run.'],
    });
    return sections;
  }

  const region = numericRegionFromRequest(input.complexRegion);
  if (!region) {
    sections.push({
      title: 'Complex Locus Region',
      lines: ['Complex Region bounds were supplied but were not finite ordered bounds, so bounded locus sampling was skipped.'],
    });
    return sections;
  }

  const equationNode = input.equationLatex ? parseEquationNode(input.equationLatex) : null;
  const gridSize = input.complexRegion.gridSize ?? DEFAULT_GRID_SIZE;
  const direct = analyzeDirectLocus({ equationNode, target, region });
  if (!equationNode) {
    sections.push({
      title: 'Complex Locus Region',
      lines: [
        ...regionLines(region, gridSize),
        'The equation could not be parsed into MathJSON for bounded locus sampling.',
      ],
    });
    sections.push({
      title: 'Complex Locus Diagnostics',
      lines: [
        ...input.report.detailLines,
        'Curve-like loci remain controlled evidence until a later curve/readback/graph contract exists.',
      ],
    });
    return sections;
  }

  const sample = sampleLocus({
    equationNode,
    target,
    region,
    gridSize,
    probes: direct.probes,
  });
  sections.push({
    title: 'Complex Locus Region',
    lines: [
      ...regionLines(region, sample.cellsPerAxis),
      `Sampled cells: ${sample.sampledCellCount}.`,
      `Evaluated sample/probe points: ${sample.evaluatedPointCount}.`,
      `Finite evaluations: ${sample.finiteCount}; unsupported evaluations: ${sample.unsupportedCount}.`,
    ],
  });
  sections.push({
    title: 'Complex Locus Residual Band',
    lines: sample.residualMin === null || sample.residualMax === null
      ? ['Residual band across sampled cell centers/probes: unavailable because no finite evaluations completed.']
      : [
        `Residual band across sampled cell centers/probes: ${formatDiagnosticNumber(sample.residualMin)} to ${formatDiagnosticNumber(sample.residualMax)}.`,
        `Candidate tolerance: ${RESIDUAL_TOLERANCE}.`,
      ],
  });
  sections.push({
    title: 'Complex Locus Candidates',
    lines: candidateLines(sample.candidates),
  });
  sections.push({
    title: 'Complex Locus Diagnostics',
    lines: [
      ...(direct.lines.length > 0 ? direct.lines : input.report.detailLines),
      'Curve-like loci remain controlled evidence until a later curve/readback/graph contract exists.',
      'Do not treat sampled/probed points as a complete Complex solution set.',
    ],
  });
  return sections;
}
