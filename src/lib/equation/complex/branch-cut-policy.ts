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
  if (input.argument !== input.target) {
    return containsTarget(input.argument, input.target)
      ? {
        severity: 'warning',
        details: [
          'The branch-sensitive argument depends on the target but is not a direct target coordinate.',
          'A future complex region solver must map this argument before certifying branch-cut avoidance.',
        ],
      }
      : null;
  }
  if (input.family === 'principal-inverse-trig') {
    return inverseTrigCutCrossing(input.region, input.operator)
      ? {
        severity: 'unsafe',
        details: ['The requested region crosses a principal inverse-trig branch cut.'],
      }
      : {
        severity: 'info',
        details: ['The direct target region does not cross the detected principal inverse-trig branch cut.'],
      };
  }
  if (containsBranchPointZero(input.region)) {
    return {
      severity: 'unsafe',
      details: ['The requested region contains the principal branch point at 0.'],
    };
  }
  if (negativeRealAxisCrossed(input.region)) {
    return {
      severity: 'unsafe',
      details: ['The requested region crosses the principal negative-real-axis branch cut.'],
    };
  }
  return {
    severity: 'info',
    details: ['The direct target region does not cross the principal negative-real-axis branch cut.'],
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
