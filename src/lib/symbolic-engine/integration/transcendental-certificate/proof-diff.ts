import {
  classifyDerivativePreflight,
  type DerivativePreflightResult,
} from '../../differentiation-preflight';
import {
  differentiateAstWithMetadata,
  UnsupportedDifferentiationFallbackError,
} from '../../differentiation';
import { normalizeAst } from '../../normalize';
import { boxLatex, isNodeArray } from '../../patterns';

export type CertificateDifferentiationStopReason =
  | 'branch-sensitive'
  | 'compute-engine-fallback-required'
  | 'inexact-number'
  | 'malformed'
  | 'too-complex'
  | 'unsupported-head';

export type CertificateDifferentiationSuccess = {
  kind: 'success';
  variable: string;
  normalizedInput: unknown;
  derivativeNode: unknown;
  strategies: string[];
  closureHeads: string[];
  proofSafe: true;
};

export type CertificateDifferentiationStop = {
  kind: 'stop';
  variable: string;
  reason: CertificateDifferentiationStopReason;
  detail: string;
  proofSafe: false;
  preflight?: DerivativePreflightResult;
};

export type CertificateDifferentiationResult =
  | CertificateDifferentiationSuccess
  | CertificateDifferentiationStop;

const BRANCH_SENSITIVE_HEADS = new Set(['Abs', 'AbsoluteValue']);
const SPECIAL_FUNCTION_HEADS = new Set([
  'Erfc',
  'FresnelS',
  'FresnelC',
]);

function stop(
  variable: string,
  reason: CertificateDifferentiationStopReason,
  detail: string,
  preflight?: DerivativePreflightResult,
): CertificateDifferentiationStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    proofSafe: false,
    preflight,
  };
}

function containsInexactNumber(node: unknown): boolean {
  if (typeof node === 'number') {
    return Number.isFinite(node) && !Number.isInteger(node);
  }

  return isNodeArray(node) && node.slice(1).some(containsInexactNumber);
}

function findHead(node: unknown, heads: Set<string>): string | undefined {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }

  if (heads.has(node[0])) {
    return node[0];
  }

  for (const child of node.slice(1)) {
    const found = findHead(child, heads);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function collectHeads(node: unknown, heads = new Set<string>()) {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return heads;
  }

  heads.add(node[0]);
  node.slice(1).forEach((child) => collectHeads(child, heads));
  return heads;
}

export function normalizeCertificateProofNode(node: unknown): unknown {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return node;
  }

  const normalizedChildren = node.slice(1).map(normalizeCertificateProofNode);
  if (node[0] === 'Exp' && normalizedChildren.length === 1) {
    return ['Power', 'ExponentialE', normalizedChildren[0]];
  }

  return [node[0], ...normalizedChildren];
}

export function differentiateForCertificateProof(
  node: unknown,
  variable = 'x',
): CertificateDifferentiationResult {
  const normalizedInput = normalizeAst(normalizeCertificateProofNode(node));

  if (containsInexactNumber(normalizedInput)) {
    return stop(
      variable,
      'inexact-number',
      'Certificate proof differentiation rejects decimal or inexact numeric leaves.',
    );
  }

  const branchHead = findHead(normalizedInput, BRANCH_SENSITIVE_HEADS);
  if (branchHead) {
    return stop(
      variable,
      'branch-sensitive',
      `Certificate proof differentiation rejects branch-sensitive carrier ${branchHead}.`,
    );
  }

  const specialHead = findHead(normalizedInput, SPECIAL_FUNCTION_HEADS);
  if (specialHead) {
    return stop(
      variable,
      'unsupported-head',
      `Certificate proof differentiation does not use special-function head ${specialHead}.`,
    );
  }

  const preflight = classifyDerivativePreflight(normalizedInput, variable);
  if (preflight.kind === 'malformed') {
    return stop(variable, 'malformed', preflight.reason, preflight);
  }
  if (preflight.kind === 'too-complex') {
    return stop(variable, 'too-complex', preflight.reason, preflight);
  }
  if (preflight.kind === 'unsupported') {
    return stop(variable, 'unsupported-head', preflight.reason, preflight);
  }
  if (preflight.kind === 'compute-engine-fallback') {
    return stop(variable, 'compute-engine-fallback-required', preflight.reason, preflight);
  }

  try {
    const derivative = differentiateAstWithMetadata(normalizedInput, variable, {
      computeEngineFallback: 'deny',
    });
    return {
      kind: 'success',
      variable,
      normalizedInput,
      derivativeNode: derivative.ast,
      strategies: derivative.strategies,
      closureHeads: [...collectHeads(derivative.ast)].sort((left, right) => left.localeCompare(right)),
      proofSafe: true,
    };
  } catch (error) {
    if (error instanceof UnsupportedDifferentiationFallbackError) {
      return stop(
        variable,
        'compute-engine-fallback-required',
        error.message,
        preflight,
      );
    }

    return stop(
      variable,
      'unsupported-head',
      error instanceof Error ? error.message : 'Certificate proof differentiation failed.',
      preflight,
    );
  }
}

export function certificateProofNodeLatex(node: unknown) {
  return boxLatex(normalizeAst(node));
}
