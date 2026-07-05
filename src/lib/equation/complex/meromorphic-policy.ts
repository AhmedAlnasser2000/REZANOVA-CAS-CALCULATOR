import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  exactPolynomialCoefficientArray,
  exactScalarToNumber,
  parseExactPolynomial,
} from '../../algebra/polynomial-core';
import { solvePolynomialRoots } from '../../algebra/polynomial-roots';
import { complexAbs, complexSub, type ComplexValue } from '../../numeric/complex';
import { containsTarget, isArrayNode, latexForNode, simplifyNode } from './math-json';
import type { MathJson } from './types';

export type ComplexMeromorphicPoleKind = 'denominator' | 'negative-power' | 'tangent';

export type ComplexMeromorphicPoleDiagnostic = {
  kind: ComplexMeromorphicPoleKind;
  carrierLatex: string;
  status: 'safe' | 'interior-poles' | 'boundary-pole' | 'unknown';
  knownPoleCount: number;
  details: string[];
};

export type ComplexMeromorphicPolicyReport = {
  status: 'safe' | 'meromorphic' | 'unsafe' | 'unknown';
  shouldStop: boolean;
  knownPoleCount: number;
  diagnostics: ComplexMeromorphicPoleDiagnostic[];
  detailLines: string[];
};

export type ComplexRectangularRegion = {
  reMin: number;
  reMax: number;
  imMin: number;
  imMax: number;
};

type PoleSource = {
  kind: ComplexMeromorphicPoleKind;
  node: MathJson;
};

const ce = new ComputeEngine();
const MAX_POLE_POLYNOMIAL_DEGREE = 64;
const REGION_TOLERANCE = 1e-8;

function zeroFormNode(node: MathJson): MathJson {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? ['Subtract', node[1] as MathJson, node[2] as MathJson]
    : node;
}

function orderedRegion(region: ComplexRectangularRegion) {
  return {
    reMin: Math.min(region.reMin, region.reMax),
    reMax: Math.max(region.reMin, region.reMax),
    imMin: Math.min(region.imMin, region.imMax),
    imMax: Math.max(region.imMin, region.imMax),
  };
}

function isNegativeIntegerExponent(node: unknown) {
  return typeof node === 'number' && Number.isInteger(node) && node < 0;
}

function isBoundaryPoint(value: ComplexValue, region: ComplexRectangularRegion) {
  const ordered = orderedRegion(region);
  const inRealBand = value.re >= ordered.reMin - REGION_TOLERANCE && value.re <= ordered.reMax + REGION_TOLERANCE;
  const inImagBand = value.im >= ordered.imMin - REGION_TOLERANCE && value.im <= ordered.imMax + REGION_TOLERANCE;
  if (!inRealBand || !inImagBand) {
    return false;
  }
  return Math.abs(value.re - ordered.reMin) <= REGION_TOLERANCE
    || Math.abs(value.re - ordered.reMax) <= REGION_TOLERANCE
    || Math.abs(value.im - ordered.imMin) <= REGION_TOLERANCE
    || Math.abs(value.im - ordered.imMax) <= REGION_TOLERANCE;
}

function isInteriorPoint(value: ComplexValue, region: ComplexRectangularRegion) {
  const ordered = orderedRegion(region);
  return value.re > ordered.reMin + REGION_TOLERANCE
    && value.re < ordered.reMax - REGION_TOLERANCE
    && value.im > ordered.imMin + REGION_TOLERANCE
    && value.im < ordered.imMax - REGION_TOLERANCE;
}

function rootMultiplicity(root: ComplexValue, roots: ReturnType<typeof solvePolynomialRoots>) {
  if (roots.kind !== 'success') {
    return 1;
  }
  const estimate = roots.diagnostics.multiplicityEstimates.find((entry) =>
    complexAbs(complexSub(entry.root, root)) <= 1e-4);
  return Math.max(1, Math.round(estimate?.estimatedMultiplicity ?? 1));
}

function collectPoleSources(node: MathJson, target: string, sources: PoleSource[]) {
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return;
  }

  if (node[0] === 'Divide' && node.length === 3) {
    const denominator = node[2] as MathJson;
    if (containsTarget(denominator, target)) {
      sources.push({ kind: 'denominator', node: denominator });
    }
  }
  if (node[0] === 'Power' && node.length === 3 && isNegativeIntegerExponent(node[2])) {
    const base = node[1] as MathJson;
    if (containsTarget(base, target)) {
      sources.push({ kind: 'negative-power', node: base });
    }
  }
  if (node[0] === 'Tan' && node.length === 2) {
    const argument = node[1] as MathJson;
    if (containsTarget(argument, target)) {
      sources.push({ kind: 'tangent', node: argument });
    }
  }

  for (const child of node.slice(1)) {
    collectPoleSources(child as MathJson, target, sources);
  }
}

function uniqueSources(sources: PoleSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = `${source.kind}:${JSON.stringify(source.node)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function polynomialPoleDiagnostic(source: PoleSource, target: string, region: ComplexRectangularRegion): ComplexMeromorphicPoleDiagnostic {
  const carrierLatex = latexForNode(source.node);
  const polynomial = parseExactPolynomial(simplifyNode(source.node), target, MAX_POLE_POLYNOMIAL_DEGREE);
  if (!polynomial) {
    return {
      kind: source.kind,
      carrierLatex,
      status: 'unknown',
      knownPoleCount: 0,
      details: [
        `Pole carrier: ${carrierLatex}`,
        'The target-dependent denominator could not be reduced to a degree-capped polynomial.',
        'Complex contour verification stops until this pole set is isolated.',
      ],
    };
  }

  const coefficients = exactPolynomialCoefficientArray(polynomial).map(exactScalarToNumber);
  const roots = solvePolynomialRoots({ coefficients });
  if (roots.kind === 'error') {
    return {
      kind: source.kind,
      carrierLatex,
      status: 'unknown',
      knownPoleCount: 0,
      details: [
        `Pole carrier: ${carrierLatex}`,
        `Pole root solve failed: ${roots.error}`,
      ],
    };
  }

  let knownPoleCount = 0;
  let boundaryPoleCount = 0;
  for (const root of roots.roots) {
    const multiplicity = rootMultiplicity(root, roots);
    if (isBoundaryPoint(root, region)) {
      boundaryPoleCount += multiplicity;
    } else if (isInteriorPoint(root, region)) {
      knownPoleCount += multiplicity;
    }
  }

  if (boundaryPoleCount > 0) {
    return {
      kind: source.kind,
      carrierLatex,
      status: 'boundary-pole',
      knownPoleCount,
      details: [
        `Pole carrier: ${carrierLatex}`,
        `Boundary pole multiplicity: ${boundaryPoleCount}.`,
        'The contour passes through or too near a denominator pole.',
      ],
    };
  }
  if (knownPoleCount > 0) {
    return {
      kind: source.kind,
      carrierLatex,
      status: 'interior-poles',
      knownPoleCount,
      details: [
        `Pole carrier: ${carrierLatex}`,
        `Known interior pole multiplicity: ${knownPoleCount}.`,
        'Contour winding is interpreted as zeros minus known poles for this carrier.',
      ],
    };
  }
  return {
    kind: source.kind,
    carrierLatex,
    status: 'safe',
    knownPoleCount: 0,
    details: [
      `Pole carrier: ${carrierLatex}`,
      'No denominator poles from this carrier lie inside the selected region.',
    ],
  };
}

function tangentPoleDiagnostic(source: PoleSource, target: string, region: ComplexRectangularRegion): ComplexMeromorphicPoleDiagnostic {
  const carrierLatex = latexForNode(source.node);
  if (source.node !== target) {
    return {
      kind: 'tangent',
      carrierLatex,
      status: 'unknown',
      knownPoleCount: 0,
      details: [
        `Tangent carrier: ${carrierLatex}`,
        'Target-dependent tangent poles are not mapped unless the carrier is the direct solve target.',
      ],
    };
  }

  const ordered = orderedRegion(region);
  if (ordered.imMin > REGION_TOLERANCE || ordered.imMax < -REGION_TOLERANCE) {
    return {
      kind: 'tangent',
      carrierLatex,
      status: 'safe',
      knownPoleCount: 0,
      details: ['Direct tangent poles lie on the real axis; this region does not cross that axis.'],
    };
  }

  let knownPoleCount = 0;
  let boundaryPoleCount = 0;
  const minK = Math.ceil((ordered.reMin - Math.PI / 2) / Math.PI);
  const maxK = Math.floor((ordered.reMax - Math.PI / 2) / Math.PI);
  for (let k = minK; k <= maxK; k += 1) {
    const pole = { re: Math.PI / 2 + k * Math.PI, im: 0 };
    if (isBoundaryPoint(pole, ordered)) {
      boundaryPoleCount += 1;
    } else if (isInteriorPoint(pole, ordered)) {
      knownPoleCount += 1;
    }
  }

  if (boundaryPoleCount > 0) {
    return {
      kind: 'tangent',
      carrierLatex,
      status: 'boundary-pole',
      knownPoleCount,
      details: [
        `Tangent carrier: ${carrierLatex}`,
        `Boundary tangent poles: ${boundaryPoleCount}.`,
      ],
    };
  }
  if (knownPoleCount > 0) {
    return {
      kind: 'tangent',
      carrierLatex,
      status: 'interior-poles',
      knownPoleCount,
      details: [
        `Tangent carrier: ${carrierLatex}`,
        `Known interior tangent poles: ${knownPoleCount}.`,
      ],
    };
  }
  return {
    kind: 'tangent',
    carrierLatex,
    status: 'safe',
    knownPoleCount: 0,
    details: ['No direct tangent poles lie inside the selected region.'],
  };
}

export function diagnoseMeromorphicPolicyForLatex(
  expressionLatex: string,
  options: { target: string; region: ComplexRectangularRegion },
): ComplexMeromorphicPolicyReport {
  const parsed = zeroFormNode(ce.parse(expressionLatex).json as MathJson);
  const sources: PoleSource[] = [];
  collectPoleSources(parsed, options.target, sources);
  const diagnostics = uniqueSources(sources).map((source) =>
    source.kind === 'tangent'
      ? tangentPoleDiagnostic(source, options.target, options.region)
      : polynomialPoleDiagnostic(source, options.target, options.region));
  const knownPoleCount = diagnostics.reduce((sum, diagnostic) => sum + diagnostic.knownPoleCount, 0);
  const hasBoundaryPole = diagnostics.some((diagnostic) => diagnostic.status === 'boundary-pole');
  const hasUnknown = diagnostics.some((diagnostic) => diagnostic.status === 'unknown');
  const status = hasBoundaryPole
    ? 'unsafe'
    : hasUnknown
      ? 'unknown'
      : knownPoleCount > 0
        ? 'meromorphic'
        : 'safe';
  return {
    status,
    shouldStop: hasBoundaryPole || hasUnknown,
    knownPoleCount,
    diagnostics,
    detailLines: diagnostics.length === 0
      ? ['No target-dependent denominator or tangent pole carriers were detected.']
      : [
        `Known interior pole count: ${knownPoleCount}.`,
        ...diagnostics.flatMap((diagnostic) => diagnostic.details),
        knownPoleCount > 0
          ? 'Winding evidence is pole-aware: roots equal winding plus known interior pole multiplicity.'
          : 'No pole correction is needed for the selected region.',
      ],
  };
}
