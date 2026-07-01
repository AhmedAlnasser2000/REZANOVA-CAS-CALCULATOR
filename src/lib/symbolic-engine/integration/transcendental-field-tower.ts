import { normalizeExactScalar, readExactScalarNode } from '../../algebra/polynomial-core';
import { normalizeAst } from '../normalize';
import { boxLatex, dependsOnVariable, isNodeArray } from '../patterns';
import {
  mergeSymbolicCoefficientFacts,
  symbolicCoefficientFact,
  type SymbolicCoefficientFact,
} from '../primitives/coefficient-domain';
import {
  getSymbolicPolynomialCoefficient,
  parseSymbolicPolynomial,
} from '../primitives/symbolic-polynomial';
import { parseSymbolicAffine } from './symbolic-coefficients';
import { normalizeCertificateProofNode } from './transcendental-certificate/proof-diff';

export type TranscendentalFieldTowerFamily =
  | 'exp'
  | 'positive-base-exp'
  | 'log'
  | 'trig'
  | 'special-function';

export type TranscendentalFieldArgumentKind =
  | 'target-free'
  | 'selected-variable'
  | 'affine'
  | 'polynomial'
  | 'nested-transcendental'
  | 'unsupported';

export type TranscendentalFieldTowerStopReason =
  | 'branch-sensitive-carrier'
  | 'decimal-coefficient'
  | 'depth-over-cap'
  | 'invalid-exponential-base'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-algebraic-head'
  | 'unsupported-depth2-composition'
  | 'unsupported-head'
  | 'unsupported-polynomial-argument';

export type TranscendentalFieldTowerFact = {
  kind: 'nonzero' | 'positive' | 'nonunit';
  expressionLatex: string;
  relation: '\\ne0' | '>0' | '\\ne1';
};

export type TranscendentalFieldTowerExtension = {
  family: TranscendentalFieldTowerFamily;
  head: string;
  depth: number;
  argumentKind: TranscendentalFieldArgumentKind;
  argumentNode?: unknown;
  argumentLatex?: string;
  polynomialDegree?: number;
  baseNode?: unknown;
  baseLatex?: string;
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
};

export type TranscendentalFieldTowerReadiness =
  | 'base-rational'
  | 'depth1-exp-polynomial'
  | 'depth1-fresnel-candidate'
  | 'depth1-log-or-trig'
  | 'depth1-special-function'
  | 'depth2-exp-exp-candidate'
  | 'depth2-trig-exp-candidate'
  | 'depth2-log-log-candidate'
  | 'depth2-special-exp-candidate'
  | 'linear-combination-profile';

export type TranscendentalFieldTowerReady = {
  kind: 'ready';
  variable: string;
  coefficientScope: 'exact-rational-target-free-symbolic';
  normalizedInput: unknown;
  depth: number;
  extensions: TranscendentalFieldTowerExtension[];
  readiness: TranscendentalFieldTowerReadiness[];
  requiredFacts: TranscendentalFieldTowerFact[];
  branchFacts: TranscendentalFieldTowerFact[];
};

export type TranscendentalFieldTowerStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalFieldTowerStopReason;
  detail: string;
  normalizedInput: unknown;
  depth: number;
  extensions: TranscendentalFieldTowerExtension[];
};

export type TranscendentalFieldTowerProfile =
  | TranscendentalFieldTowerReady
  | TranscendentalFieldTowerStop;

type ExtensionScan = {
  depth: number;
  extensions: TranscendentalFieldTowerExtension[];
};

type ArgumentProfile =
  | {
    kind: TranscendentalFieldArgumentKind;
    latex: string;
    polynomialDegree?: number;
    facts: SymbolicCoefficientFact[];
  }
  | {
    kind: 'stop';
    reason: Extract<
      TranscendentalFieldTowerStopReason,
      'selected-variable-dependent-coefficient' | 'unsupported-polynomial-argument'
    >;
    detail: string;
  };

const MAX_TOWER_DEPTH = 2;
const ARGUMENT_POLYNOMIAL_CAP = 8;

const BRANCH_SENSITIVE_HEADS = new Set(['Abs', 'AbsoluteValue']);
const TRIG_HEADS = new Set(['Sin', 'Cos', 'Tan', 'Cot', 'Sec', 'Csc']);
const LOG_HEADS = new Set(['Ln', 'Log']);
const SPECIAL_FUNCTION_HEADS = new Set([
  'Erf',
  'erf',
  'Erfi',
  'erfi',
  'Si',
  'si',
  'Ci',
  'ci',
  'Ei',
  'ei',
  'li',
  'FresnelS',
  'FresnelC',
]);
const ALGEBRAIC_HEADS = new Set(['Sqrt', 'Root']);

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

function isExpNode(node: unknown): node is ['Power', unknown, unknown] {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE';
}

function isPositiveBaseExpNode(node: unknown, variable: string): node is ['Power', unknown, unknown] {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] !== 'ExponentialE'
    && !dependsOnVariable(node[1], variable)
    && dependsOnVariable(node[2], variable);
}

function fact(kind: TranscendentalFieldTowerFact['kind'], expressionLatex: string): TranscendentalFieldTowerFact {
  if (kind === 'positive') {
    return { kind, expressionLatex, relation: '>0' };
  }
  if (kind === 'nonunit') {
    return { kind, expressionLatex, relation: '\\ne1' };
  }
  return { kind, expressionLatex, relation: '\\ne0' };
}

function coefficientFactsToTowerFacts(facts: SymbolicCoefficientFact[]): TranscendentalFieldTowerFact[] {
  return facts.map((entry) => fact('nonzero', entry.expressionLatex));
}

function mergeTowerFacts(facts: TranscendentalFieldTowerFact[]) {
  const seen = new Set<string>();
  const merged: TranscendentalFieldTowerFact[] = [];
  for (const entry of facts) {
    const key = `${entry.kind}:${entry.expressionLatex}:${entry.relation}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
}

function exactPositiveNonUnitBase(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return undefined;
  }

  const normalized = normalizeExactScalar(scalar);
  return normalized.denominator > 0
    && normalized.numerator > 0
    && normalized.numerator !== normalized.denominator;
}

function exactInvalidBase(node: unknown) {
  const scalar = readExactScalarNode(node);
  if (!scalar) {
    return false;
  }

  const normalized = normalizeExactScalar(scalar);
  return normalized.denominator <= 0
    || normalized.numerator <= 0
    || normalized.numerator === normalized.denominator;
}

function normalizePolynomialNegates(node: unknown): unknown {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return node;
  }

  if (node[0] === 'Negate' && node.length === 2) {
    return ['Multiply', -1, normalizePolynomialNegates(node[1])];
  }

  return [node[0], ...node.slice(1).map(normalizePolynomialNegates)];
}

function classifyArgument(node: unknown, variable: string, childDepth: number): ArgumentProfile {
  const latex = boxLatex(node);
  if (!dependsOnVariable(node, variable)) {
    return { kind: 'target-free', latex, facts: [] };
  }

  if (node === variable) {
    return { kind: 'selected-variable', latex, polynomialDegree: 1, facts: [] };
  }

  if (childDepth > 0) {
    return { kind: 'nested-transcendental', latex, facts: [] };
  }

  const affine = parseSymbolicAffine(node, variable);
  if (affine) {
    const scalar = readExactScalarNode(affine.slope);
    const facts = scalar && scalar.numerator !== 0
      ? []
      : [symbolicCoefficientFact(affine.slopeLatex)];
    return {
      kind: 'affine',
      latex: affine.latex,
      polynomialDegree: 1,
      facts,
    };
  }

  const parsed = parseSymbolicPolynomial(
    normalizePolynomialNegates(node),
    variable,
    ARGUMENT_POLYNOMIAL_CAP,
  );
  if (parsed.kind === 'success') {
    const leading = getSymbolicPolynomialCoefficient(parsed.polynomial, parsed.polynomial.degree);
    const scalar = readExactScalarNode(leading.node);
    const leadingFacts = scalar && scalar.numerator !== 0
      ? []
      : [symbolicCoefficientFact(leading.latex)];
    return {
      kind: 'polynomial',
      latex,
      polynomialDegree: parsed.polynomial.degree,
      facts: mergeSymbolicCoefficientFacts([...parsed.polynomial.facts, ...leadingFacts]),
    };
  }

  if (parsed.reason === 'coefficient-stop' && parsed.coefficientReason === 'selected-variable-dependent-coefficient') {
    return {
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
      detail: 'The tower argument has a coefficient that depends on the selected variable.',
    };
  }

  return {
    kind: 'stop',
    reason: 'unsupported-polynomial-argument',
    detail: parsed.detail ?? `Tower argument polynomial parsing stopped: ${parsed.reason}.`,
  };
}

function extensionFamily(node: unknown, variable: string): TranscendentalFieldTowerFamily | undefined {
  if (isExpNode(node)) {
    return 'exp';
  }
  if (isPositiveBaseExpNode(node, variable)) {
    return 'positive-base-exp';
  }
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return undefined;
  }
  if (LOG_HEADS.has(node[0])) {
    return 'log';
  }
  if (TRIG_HEADS.has(node[0])) {
    return 'trig';
  }
  if (SPECIAL_FUNCTION_HEADS.has(node[0])) {
    return 'special-function';
  }
  return undefined;
}

function extensionArgument(node: unknown, family: TranscendentalFieldTowerFamily) {
  if ((family === 'exp' || family === 'positive-base-exp') && isNodeArray(node) && node.length === 3) {
    return node[2];
  }
  if (isNodeArray(node) && node.length >= 2) {
    return node[1];
  }
  return undefined;
}

function scanExtensions(node: unknown, variable: string): ExtensionScan {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return { depth: 0, extensions: [] };
  }

  const family = extensionFamily(node, variable);
  if (family) {
    const argument = extensionArgument(node, family);
    const argumentScan = argument === undefined
      ? { depth: 0, extensions: [] }
      : scanExtensions(argument, variable);
    const argumentProfile = argument === undefined
      ? { kind: 'unsupported' as const, latex: '', facts: [] }
      : classifyArgument(argument, variable, argumentScan.depth);
    const requiredFacts: TranscendentalFieldTowerFact[] = [];
    const branchFacts: TranscendentalFieldTowerFact[] = [];
    const baseNode = family === 'positive-base-exp' && isNodeArray(node) ? node[1] : undefined;
    const baseLatex = baseNode === undefined ? undefined : boxLatex(baseNode);

    if (argumentProfile.kind !== 'stop') {
      requiredFacts.push(...coefficientFactsToTowerFacts(argumentProfile.facts));
      if ((family === 'log' || node[0] === 'Ci' || node[0] === 'ci' || node[0] === 'Ei' || node[0] === 'ei')
        && argumentProfile.latex) {
        branchFacts.push(fact('positive', argumentProfile.latex));
      }
      if (node[0] === 'li' && argumentProfile.latex) {
        branchFacts.push(fact('positive', argumentProfile.latex));
        branchFacts.push(fact('nonzero', `\\ln\\left(${argumentProfile.latex}\\right)`));
      }
    }

    if (family === 'positive-base-exp' && baseLatex) {
      if (!exactPositiveNonUnitBase(baseNode)) {
        requiredFacts.push(fact('positive', baseLatex), fact('nonunit', baseLatex));
      }
    }

    const depth = argumentScan.depth + 1;
    return {
      depth,
      extensions: [
        ...argumentScan.extensions,
        {
          family,
          head: family === 'exp' ? 'Exp' : String(node[0]),
          depth,
          argumentKind: argumentProfile.kind === 'stop' ? 'unsupported' : argumentProfile.kind,
          argumentNode: argument,
          argumentLatex: argumentProfile.kind === 'stop' ? undefined : argumentProfile.latex,
          polynomialDegree: argumentProfile.kind === 'stop' ? undefined : argumentProfile.polynomialDegree,
          baseNode,
          baseLatex,
          requiredFacts: mergeTowerFacts(requiredFacts),
          branchFacts: mergeTowerFacts(branchFacts),
        },
      ],
    };
  }

  const childScans = node.slice(1).map((child) => scanExtensions(child, variable));
  return {
    depth: Math.max(0, ...childScans.map((scan) => scan.depth)),
    extensions: childScans.flatMap((scan) => scan.extensions),
  };
}

function stop(
  variable: string,
  reason: TranscendentalFieldTowerStopReason,
  detail: string,
  normalizedInput: unknown,
  scan: ExtensionScan,
): TranscendentalFieldTowerStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalizedInput,
    depth: scan.depth,
    extensions: scan.extensions,
  };
}

function readinessFor(extensions: TranscendentalFieldTowerExtension[]): TranscendentalFieldTowerReadiness[] {
  if (extensions.length === 0) {
    return ['base-rational'];
  }

  const deepest = extensions.reduce(
    (best, entry) => (entry.depth > best.depth ? entry : best),
    extensions[0],
  );
  const readiness: TranscendentalFieldTowerReadiness[] = [];

  if (extensions.length > 1 && deepest.depth <= 1) {
    readiness.push('linear-combination-profile');
  }

  if (deepest.depth === 1) {
    if (deepest.family === 'exp') {
      readiness.push('depth1-exp-polynomial');
    } else if (
      deepest.family === 'trig'
      && (deepest.head === 'Sin' || deepest.head === 'Cos')
      && deepest.polynomialDegree === 2
    ) {
      readiness.push('depth1-fresnel-candidate');
    } else if (deepest.family === 'special-function') {
      readiness.push('depth1-special-function');
    } else {
      readiness.push('depth1-log-or-trig');
    }
  }

  if (deepest.depth === 2) {
    const outer = deepest;
    const inner = extensions.find((entry) => entry.depth === 1);
    if (outer.family === 'exp' && inner?.family === 'exp') {
      readiness.push('depth2-exp-exp-candidate');
    } else if (outer.family === 'trig' && inner?.family === 'exp') {
      readiness.push('depth2-trig-exp-candidate');
    } else if (outer.family === 'special-function' && inner?.family === 'exp') {
      readiness.push('depth2-special-exp-candidate');
    } else if (outer.family === 'log' && inner?.family === 'log') {
      readiness.push('depth2-log-log-candidate');
    }
  }

  return readiness.length === 0 ? ['linear-combination-profile'] : Array.from(new Set(readiness));
}

function unsupportedDepth2Composition(scan: ExtensionScan) {
  if (scan.depth !== 2) {
    return false;
  }

  const outer = scan.extensions.find((entry) => entry.depth === 2);
  const inner = scan.extensions.find((entry) => entry.depth === 1);
  return outer?.family === 'exp' && inner?.family === 'trig';
}

function containsArgumentStop(variable: string, scan: ExtensionScan) {
  for (const extension of scan.extensions) {
    if (extension.argumentKind !== 'unsupported' || extension.argumentNode === undefined) {
      continue;
    }
    const argumentScan = scanExtensions(extension.argumentNode, variable);
    const argument = classifyArgument(extension.argumentNode, variable, argumentScan.depth);
    if (argument.kind === 'stop') {
      return argument;
    }
  }
  return undefined;
}

export function profileTranscendentalFieldTower(
  node: unknown,
  variable = 'x',
): TranscendentalFieldTowerProfile {
  const normalizedInput = normalizeAst(normalizeCertificateProofNode(node));
  const scan = scanExtensions(normalizedInput, variable);

  if (containsInexactNumber(normalizedInput)) {
    return stop(
      variable,
      'decimal-coefficient',
      'Transcendental field profiling rejects decimal or inexact numeric leaves.',
      normalizedInput,
      scan,
    );
  }

  const branchHead = findHead(normalizedInput, BRANCH_SENSITIVE_HEADS);
  if (branchHead) {
    return stop(
      variable,
      'branch-sensitive-carrier',
      `Transcendental field profiling rejects branch-sensitive carrier ${branchHead}.`,
      normalizedInput,
      scan,
    );
  }

  const algebraicHead = findHead(normalizedInput, ALGEBRAIC_HEADS);
  if (algebraicHead && dependsOnVariable(normalizedInput, variable)) {
    return stop(
      variable,
      'unsupported-algebraic-head',
      `Transcendental field profiling does not absorb selected-variable algebraic head ${algebraicHead}.`,
      normalizedInput,
      scan,
    );
  }

  const argumentStop = containsArgumentStop(variable, scan);
  if (argumentStop) {
    return stop(
      variable,
      argumentStop.reason,
      argumentStop.detail,
      normalizedInput,
      scan,
    );
  }

  const invalidBase = scan.extensions.find((extension) =>
    extension.family === 'positive-base-exp'
    && extension.baseNode !== undefined
    && exactInvalidBase(extension.baseNode));
  if (invalidBase) {
    return stop(
      variable,
      'invalid-exponential-base',
      'Positive-base exponential towers require a positive non-unit base.',
      normalizedInput,
      scan,
    );
  }

  if (scan.depth > MAX_TOWER_DEPTH) {
    return stop(
      variable,
      'depth-over-cap',
      'Depth-3 and deeper transcendental towers are outside the current bounded field profile.',
      normalizedInput,
      scan,
    );
  }

  if (unsupportedDepth2Composition(scan)) {
    return stop(
      variable,
      'unsupported-depth2-composition',
      'This depth-2 tower is recognized, but its outer exponential over trig extension is not in the current proof scope.',
      normalizedInput,
      scan,
    );
  }

  return {
    kind: 'ready',
    variable,
    coefficientScope: 'exact-rational-target-free-symbolic',
    normalizedInput,
    depth: scan.depth,
    extensions: scan.extensions,
    readiness: readinessFor(scan.extensions),
    requiredFacts: mergeTowerFacts(scan.extensions.flatMap((entry) => entry.requiredFacts)),
    branchFacts: mergeTowerFacts(scan.extensions.flatMap((entry) => entry.branchFacts)),
  };
}
