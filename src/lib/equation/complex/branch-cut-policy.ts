import { ComputeEngine } from '@cortex-js/compute-engine';
import { exactScalarIsZero, normalizeExactComplexScalar, parseExactComplexConstantNode } from './exact';
import { containsTarget, isArrayNode, latexForNode, simplifyNode } from './math-json';
import type { MathJson } from './types';

export type ComplexRectangularRegion = {
  reMin: number;
  reMax: number;
  imMin: number;
  imMax: number;
};

type RealAffinePullback = {
  scale: number;
  offset: number;
};

export type ComplexPrincipalBranchFamily =
  | 'principal-log'
  | 'principal-root'
  | 'principal-fractional-power'
  | 'principal-inverse-trig';

export type ComplexBranchCutSeverity = 'info' | 'warning' | 'unsafe';

export type ComplexPrincipalBranchDiagnostic = {
  family: ComplexPrincipalBranchFamily;
  operator: string;
  argumentLatex: string;
  severity: ComplexBranchCutSeverity;
  message: string;
  details: string[];
};

export type ComplexPrincipalBranchPolicyReport = {
  status: 'safe' | 'unsafe' | 'unknown';
  shouldStop: boolean;
  diagnostics: ComplexPrincipalBranchDiagnostic[];
  detailLines: string[];
};

const ce = new ComputeEngine();

const PRINCIPAL_LOG_OPERATORS = new Set(['Ln', 'Log']);
const PRINCIPAL_ROOT_OPERATORS = new Set(['Sqrt', 'Root']);
const PRINCIPAL_INVERSE_TRIG_OPERATORS = new Set([
  'Arcsin',
  'Arccos',
  'Arctan',
  'asin',
  'acos',
  'atan',
]);

function finiteOrderedRegion(region: ComplexRectangularRegion): ComplexRectangularRegion {
  const reMin = Math.min(region.reMin, region.reMax);
  const reMax = Math.max(region.reMin, region.reMax);
  const imMin = Math.min(region.imMin, region.imMax);
  const imMax = Math.max(region.imMin, region.imMax);
  return { reMin, reMax, imMin, imMax };
}

function exactScalarSign(value: ReturnType<typeof normalizeExactComplexScalar>['re']) {
  const normalized = value;
  if (exactScalarIsZero(normalized)) {
    return 0;
  }
  return normalized.numerator > 0 ? 1 : -1;
}

function exactPointSeverity(node: MathJson, family: ComplexPrincipalBranchFamily): ComplexBranchCutSeverity | null {
  const exact = parseExactComplexConstantNode(simplifyNode(node));
  if (!exact) {
    return null;
  }
  const normalized = normalizeExactComplexScalar(exact);
  const realSign = exactScalarSign(normalized.re);
  const imagSign = exactScalarSign(normalized.im);
  if (realSign === 0 && imagSign === 0) {
    return family === 'principal-log' ? 'unsafe' : 'warning';
  }
  return imagSign === 0 && realSign < 0 ? 'warning' : 'info';
}

function isFractionalPower(node: unknown): node is ['Power', MathJson, MathJson] {
  if (!isArrayNode(node) || node[0] !== 'Power' || node.length !== 3) {
    return false;
  }
  const exponent = node[2];
  if (typeof exponent === 'number') {
    return !Number.isInteger(exponent);
  }
  return isArrayNode(exponent)
    && exponent[0] === 'Rational'
    && typeof exponent[2] === 'number'
    && exponent[2] !== 1;
}

function branchFamilyForNode(node: unknown): {
  family: ComplexPrincipalBranchFamily;
  operator: string;
  argument: MathJson;
} | null {
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return null;
  }
  const operator = node[0];
  if (PRINCIPAL_LOG_OPERATORS.has(operator) && node.length >= 2) {
    return { family: 'principal-log', operator, argument: node[1] as MathJson };
  }
  if (PRINCIPAL_ROOT_OPERATORS.has(operator) && node.length >= 2) {
    return { family: 'principal-root', operator, argument: node[1] as MathJson };
  }
  if (isFractionalPower(node)) {
    return { family: 'principal-fractional-power', operator, argument: node[1] };
  }
  if (PRINCIPAL_INVERSE_TRIG_OPERATORS.has(operator) && node.length >= 2) {
    return { family: 'principal-inverse-trig', operator, argument: node[1] as MathJson };
  }
  return null;
}

function negativeRealAxisCrossed(region: ComplexRectangularRegion) {
  const ordered = finiteOrderedRegion(region);
  return ordered.imMin <= 0 && ordered.imMax >= 0 && ordered.reMin <= 0;
}

function containsBranchPointZero(region: ComplexRectangularRegion) {
  const ordered = finiteOrderedRegion(region);
  return ordered.reMin <= 0 && ordered.reMax >= 0 && ordered.imMin <= 0 && ordered.imMax >= 0;
}

function inverseTrigCutCrossing(region: ComplexRectangularRegion, operator: string) {
  const ordered = finiteOrderedRegion(region);
  if (operator === 'Arctan' || operator === 'atan') {
    return ordered.reMin <= 0 && ordered.reMax >= 0 && (ordered.imMin <= -1 || ordered.imMax >= 1);
  }
  return ordered.imMin <= 0 && ordered.imMax >= 0 && (ordered.reMin <= -1 || ordered.reMax >= 1);
}

function numericConstant(node: MathJson, target: string): number | null {
  if (containsTarget(node, target)) {
    return null;
  }
  if (typeof node === 'number') {
    return Number.isFinite(node) ? node : null;
  }
  if (
    isArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  const exact = parseExactComplexConstantNode(simplifyNode(node));
  if (!exact) {
    return null;
  }
  const normalized = normalizeExactComplexScalar(exact);
  if (!exactScalarIsZero(normalized.im)) {
    return null;
  }
  const denominator = normalized.re.denominator;
  return denominator === 0 ? null : normalized.re.numerator / denominator;
}

function addAffine(left: RealAffinePullback, right: RealAffinePullback): RealAffinePullback {
  return {
    scale: left.scale + right.scale,
    offset: left.offset + right.offset,
  };
}

function scaleAffine(affine: RealAffinePullback, factor: number): RealAffinePullback {
  return {
    scale: affine.scale * factor,
    offset: affine.offset * factor,
  };
}

function realAffinePullback(node: MathJson, target: string): RealAffinePullback | null {
  if (node === target) {
    return { scale: 1, offset: 0 };
  }
  const constant = numericConstant(node, target);
  if (constant !== null) {
    return { scale: 0, offset: constant };
  }
  if (!isArrayNode(node) || typeof node[0] !== 'string') {
    return null;
  }
  const operator = node[0];
  const args = node.slice(1) as MathJson[];
  if (operator === 'Add') {
    return args.reduce<RealAffinePullback | null>((current, arg) => {
      const next = realAffinePullback(arg, target);
      return current && next ? addAffine(current, next) : null;
    }, { scale: 0, offset: 0 });
  }
  if (operator === 'Subtract' && args.length === 2) {
    const left = realAffinePullback(args[0], target);
    const right = realAffinePullback(args[1], target);
    return left && right ? addAffine(left, scaleAffine(right, -1)) : null;
  }
  if (operator === 'Negate' && args.length === 1) {
    const value = realAffinePullback(args[0], target);
    return value ? scaleAffine(value, -1) : null;
  }
  if (operator === 'Multiply') {
    let scalar = 1;
    let affine: RealAffinePullback | null = null;
    for (const arg of args) {
      const constantArg = numericConstant(arg, target);
      if (constantArg !== null) {
        scalar *= constantArg;
        continue;
      }
      const affineArg = realAffinePullback(arg, target);
      if (!affineArg || affine) {
        return null;
      }
      affine = affineArg;
    }
    return affine ? scaleAffine(affine, scalar) : { scale: 0, offset: scalar };
  }
  if (operator === 'Divide' && args.length === 2) {
    const numerator = realAffinePullback(args[0], target);
    const denominator = numericConstant(args[1], target);
    return numerator && denominator !== null && denominator !== 0
      ? scaleAffine(numerator, 1 / denominator)
      : null;
  }
  return null;
}

function imageRegionForRealAffine(
  region: ComplexRectangularRegion,
  affine: RealAffinePullback,
): ComplexRectangularRegion {
  const corners = [
    { re: region.reMin, im: region.imMin },
    { re: region.reMin, im: region.imMax },
    { re: region.reMax, im: region.imMin },
    { re: region.reMax, im: region.imMax },
  ].map((point) => ({
    re: affine.scale * point.re + affine.offset,
    im: affine.scale * point.im,
  }));
  return {
    reMin: Math.min(...corners.map((point) => point.re)),
    reMax: Math.max(...corners.map((point) => point.re)),
    imMin: Math.min(...corners.map((point) => point.im)),
    imMax: Math.max(...corners.map((point) => point.im)),
  };
}

function affinePullbackDetails(input: {
  argumentLatex: string;
  affine: RealAffinePullback;
  imageRegion: ComplexRectangularRegion;
}) {
  return [
    `Branch pullback: ${input.argumentLatex} was recognized as a real-affine target map.`,
    `Affine image scale: ${input.affine.scale}; offset: ${input.affine.offset}.`,
    `Mapped real bounds: [${input.imageRegion.reMin}, ${input.imageRegion.reMax}].`,
    `Mapped imaginary bounds: [${input.imageRegion.imMin}, ${input.imageRegion.imMax}].`,
  ];
}

function regionSeverity(input: {
  family: ComplexPrincipalBranchFamily;
  operator: string;
  argument: MathJson;
  target: string;
  region?: ComplexRectangularRegion;
}): { severity: ComplexBranchCutSeverity; details: string[] } | null {
  if (!input.region) {
    return null;
  }
  const argumentLatex = latexForNode(input.argument);
  let testedRegion = input.region;
  let pullbackDetails: string[] = [];
  if (input.argument !== input.target) {
    if (!containsTarget(input.argument, input.target)) {
      return null;
    }
    const affine = realAffinePullback(input.argument, input.target);
    if (!affine) {
      return {
        severity: 'unsafe',
        details: [
          `Branch pullback: ${argumentLatex} depends on the target through a non-affine or unsupported map.`,
          'Broad branch-cut pullback could not certify this composed argument safely.',
          'Complex region solving fails closed instead of crossing an uncertain principal branch cut.',
        ],
      };
    }
    testedRegion = imageRegionForRealAffine(input.region, affine);
    pullbackDetails = affinePullbackDetails({ argumentLatex, affine, imageRegion: testedRegion });
  }
  if (input.family === 'principal-inverse-trig') {
    return inverseTrigCutCrossing(testedRegion, input.operator)
      ? {
        severity: 'unsafe',
        details: [...pullbackDetails, 'The requested region crosses a principal inverse-trig branch cut after branch pullback.'],
      }
      : {
        severity: 'info',
        details: [...pullbackDetails, 'The pulled-back target region does not cross the detected principal inverse-trig branch cut.'],
      };
  }
  if (containsBranchPointZero(testedRegion)) {
    return {
      severity: 'unsafe',
      details: [...pullbackDetails, 'The requested region contains the principal branch point at 0 after branch pullback.'],
    };
  }
  if (negativeRealAxisCrossed(testedRegion)) {
    return {
      severity: 'unsafe',
      details: [...pullbackDetails, 'The requested region crosses the principal negative-real-axis branch cut after branch pullback.'],
    };
  }
  return {
    severity: 'info',
    details: [...pullbackDetails, 'The pulled-back target region does not cross the principal negative-real-axis branch cut.'],
  };
}

function diagnosticMessage(family: ComplexPrincipalBranchFamily, severity: ComplexBranchCutSeverity) {
  if (severity === 'unsafe') {
    return `${family} branch policy cannot certify this region safely.`;
  }
  if (severity === 'warning') {
    return `${family} branch policy needs branch-cut diagnostics.`;
  }
  return `${family} branch policy is principal-branch only.`;
}

function collectDiagnostics(
  node: MathJson,
  options: { target: string; region?: ComplexRectangularRegion },
  diagnostics: ComplexPrincipalBranchDiagnostic[],
) {
  const branch = branchFamilyForNode(node);
  if (branch) {
    const pointSeverity = exactPointSeverity(branch.argument, branch.family);
    const region = regionSeverity({ ...branch, target: options.target, region: options.region });
    const severity = region?.severity ?? pointSeverity ?? 'info';
    const argumentLatex = latexForNode(branch.argument);
    diagnostics.push({
      family: branch.family,
      operator: branch.operator,
      argumentLatex,
      severity,
      message: diagnosticMessage(branch.family, severity),
      details: [
        `Principal branch argument: ${argumentLatex}`,
        ...(
          branch.family === 'principal-inverse-trig'
            ? ['Principal inverse-trig cuts use the standard complex inverse-function cuts.']
            : ['Principal log/root/power cuts use the negative real axis with branch point 0.']
        ),
        ...(pointSeverity === 'warning' ? ['The exact argument lies on the principal branch cut.'] : []),
        ...(pointSeverity === 'unsafe' ? ['The exact argument is the logarithm branch point 0.'] : []),
        ...(region?.details ?? []),
      ],
    });
  }
  if (isArrayNode(node)) {
    for (const child of node.slice(1)) {
      collectDiagnostics(child as MathJson, options, diagnostics);
    }
  } else if (node && typeof node === 'object') {
    for (const child of Object.values(node)) {
      if (child !== undefined) {
        collectDiagnostics(child as MathJson, options, diagnostics);
      }
    }
  }
}

export function diagnosePrincipalBranchPolicyForNode(
  node: MathJson,
  options: { target: string; region?: ComplexRectangularRegion },
): ComplexPrincipalBranchPolicyReport {
  const diagnostics: ComplexPrincipalBranchDiagnostic[] = [];
  collectDiagnostics(node, options, diagnostics);
  const shouldStop = diagnostics.some((diagnostic) => diagnostic.severity === 'unsafe');
  const status = shouldStop
    ? 'unsafe'
    : diagnostics.some((diagnostic) => diagnostic.severity === 'warning')
      ? 'unknown'
      : 'safe';
  return {
    status,
    shouldStop,
    diagnostics,
    detailLines: diagnostics.length === 0
      ? ['No principal branch-sensitive nonlinear functions were detected.']
      : diagnostics.flatMap((diagnostic) => [
        diagnostic.message,
        ...diagnostic.details,
      ]),
  };
}

export function diagnosePrincipalBranchPolicyForLatex(
  expressionLatex: string,
  options: { target: string; region?: ComplexRectangularRegion },
): ComplexPrincipalBranchPolicyReport {
  return diagnosePrincipalBranchPolicyForNode(ce.parse(expressionLatex).json as MathJson, options);
}
