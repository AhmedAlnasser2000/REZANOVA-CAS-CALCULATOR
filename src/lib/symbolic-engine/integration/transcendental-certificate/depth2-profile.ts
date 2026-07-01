import { readExactScalarNode } from '../../../algebra/polynomial-core';
import { normalizeAst } from '../../normalize';
import {
  boxLatex,
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import { parseSymbolicAffine } from '../symbolic-coefficients';
import { sameNode } from '../node-helpers';
import { normalizeCertificateProofNode } from './proof-diff';

export type Depth2TowerStopReason =
  | 'branch-sensitive'
  | 'inexact-coefficient'
  | 'malformed'
  | 'missing-derivative-carrier'
  | 'no-supported-depth2-family'
  | 'non-affine-argument'
  | 'selected-variable-dependent-coefficient'
  | 'unsupported-depth2-tower'
  | 'unsupported-depth3-tower'
  | 'unsupported-head';

export type Depth2TowerFact = {
  kind: 'nonzero' | 'positive' | 'negative' | 'interval';
  expressionLatex: string;
  relation: '\\ne0' | '>0' | '<0' | '0<expr<1' | '>1';
};

export type Depth2ExtensionStep =
  | {
    kind: 'sin' | 'cos' | 'exp' | 'ln';
    argumentLatex: string;
  }
  | {
    kind: 'quotient';
    denominatorLatex: string;
  };

export type Depth2DerivativeCarrier =
  | {
    kind: 'affine-slope';
    slopeNode: unknown;
    slopeLatex: string;
  }
  | {
    kind: 'structural-factor';
    factorNode: unknown;
    factorLatex: string;
  }
  | {
    kind: 'not-required';
  };

export type Depth2TowerProfileReady = {
  kind: 'ready';
  variable: string;
  family:
    | 'sine-integral-affine-quotient'
    | 'cosine-integral-affine-quotient'
    | 'exponential-integral-affine-quotient'
    | 'logarithmic-integral-affine-reciprocal'
    | 'sine-integral-exp-composition'
    | 'cosine-integral-exp-composition'
    | 'exponential-integral-exp-composition'
    | 'nested-exp-derivative-substitution'
    | 'nested-sin-exp-derivative-substitution';
  consumer: 'certificate-special-function' | 'risch-norman-substitution';
  coefficientScope: 'exact-rational-target-free-symbolic';
  normalizedInput: unknown;
  coreArgumentNode: unknown;
  coreArgumentLatex: string;
  coefficientNode?: unknown;
  coefficientLatex?: string;
  extensionChain: Depth2ExtensionStep[];
  derivativeCarrier: Depth2DerivativeCarrier;
  requiredFacts: Depth2TowerFact[];
  branchFacts: Depth2TowerFact[];
};

export type Depth2TowerProfileStop = {
  kind: 'stop';
  variable: string;
  reason: Depth2TowerStopReason;
  detail: string;
  normalizedInput?: unknown;
};

export type Depth2TowerProfile = Depth2TowerProfileReady | Depth2TowerProfileStop;

const BRANCH_SENSITIVE_HEADS = new Set(['Abs', 'AbsoluteValue']);
const UNSUPPORTED_COEFFICIENT_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Ln',
  'Log',
  'Sqrt',
]);
const TOWER_HEADS = new Set([
  'Sin',
  'Cos',
  'Tan',
  'Cot',
  'Sec',
  'Csc',
  'Ln',
  'Log',
]);

function stop(
  variable: string,
  reason: Depth2TowerStopReason,
  detail: string,
  normalizedInput?: unknown,
): Depth2TowerProfileStop {
  return {
    kind: 'stop',
    variable,
    reason,
    detail,
    normalizedInput,
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

function isExp(node: unknown): node is ['Power', unknown, unknown] {
  return isNodeArray(node)
    && node[0] === 'Power'
    && node.length === 3
    && node[1] === 'ExponentialE';
}

function towerDepth(node: unknown): number {
  if (!isNodeArray(node) || typeof node[0] !== 'string') {
    return 0;
  }

  const childDepth = Math.max(0, ...node.slice(1).map(towerDepth));
  if (TOWER_HEADS.has(node[0]) || isExp(node)) {
    return childDepth + 1;
  }

  return childDepth;
}

function factsForAffineSlope(slopeNode: unknown, slopeLatex: string): Depth2TowerFact[] {
  const scalar = readExactScalarNode(slopeNode);
  return scalar && scalar.numerator !== 0
    ? []
    : [{ kind: 'nonzero', expressionLatex: slopeLatex, relation: '\\ne0' }];
}

function nonzeroFact(expressionLatex: string): Depth2TowerFact {
  return {
    kind: 'nonzero',
    expressionLatex,
    relation: '\\ne0',
  };
}

function positiveFact(expressionLatex: string): Depth2TowerFact {
  return {
    kind: 'positive',
    expressionLatex,
    relation: '>0',
  };
}

function splitScalarCarrierProduct(node: unknown, carrierHead: 'Sin' | 'Cos' | 'Power', variable: string) {
  const factors = isNodeArray(node) && node[0] === 'Multiply'
    ? flattenMultiply(node)
    : [node];
  const carriers: unknown[] = [];
  const coefficientFactors: unknown[] = [];

  for (const factor of factors) {
    const isCarrier = carrierHead === 'Power'
      ? isExp(factor)
      : isNodeArray(factor) && factor[0] === carrierHead && factor.length === 2;
    if (isCarrier) {
      carriers.push(factor);
      continue;
    }

    const isOtherSupportedCarrier = isExp(factor)
      || (isNodeArray(factor)
        && (factor[0] === 'Sin' || factor[0] === 'Cos')
        && factor.length === 2);
    if (isOtherSupportedCarrier) {
      return { kind: 'none' as const };
    }

    if (dependsOnVariable(factor, variable)) {
      return {
        kind: 'stop' as const,
        reason: 'selected-variable-dependent-coefficient' as const,
      };
    }
    if (findHead(factor, UNSUPPORTED_COEFFICIENT_HEADS)) {
      return {
        kind: 'stop' as const,
        reason: 'unsupported-head' as const,
      };
    }
    coefficientFactors.push(factor);
  }

  if (carriers.length !== 1) {
    return { kind: 'none' as const };
  }

  const coefficientNode = coefficientFactors.length === 0
    ? undefined
    : coefficientFactors.length === 1
      ? coefficientFactors[0]
      : ['Multiply', ...coefficientFactors];

  return {
    kind: 'success' as const,
    carrier: carriers[0],
    coefficientNode,
  };
}

function quotientProfile(
  normalizedInput: unknown,
  variable: string,
): Depth2TowerProfile | undefined {
  if (!isNodeArray(normalizedInput) || normalizedInput[0] !== 'Divide' || normalizedInput.length !== 3) {
    return undefined;
  }

  const numerator = normalizedInput[1];
  const denominator = normalizedInput[2];

  for (const [head, family] of [
    ['Sin', 'sine-integral-affine-quotient'],
    ['Cos', 'cosine-integral-affine-quotient'],
    ['Power', 'exponential-integral-affine-quotient'],
  ] as const) {
    const split = splitScalarCarrierProduct(numerator, head, variable);
    if (split.kind === 'stop') {
      return stop(
        variable,
        split.reason,
        'Depth-2 quotient profiling found a selected-variable-dependent or unsupported coefficient factor.',
        normalizedInput,
      );
    }
    if (split.kind !== 'success') {
      continue;
    }

    const argument = head === 'Power'
      ? (isExp(split.carrier) ? split.carrier[2] : undefined)
      : (isNodeArray(split.carrier) ? split.carrier[1] : undefined);
    if (argument === undefined) {
      return stop(variable, 'malformed', 'Depth-2 quotient carrier is malformed.', normalizedInput);
    }
    if (!sameNode(argument, denominator)) {
      continue;
    }

    const affine = parseSymbolicAffine(argument, variable);
    if (!affine) {
      return stop(
        variable,
        'non-affine-argument',
        'Depth-2 special-function quotient support currently requires an affine argument.',
        normalizedInput,
      );
    }

    const coreArgumentLatex = affine.latex;
    const fn = head === 'Power'
      ? 'exp'
      : head === 'Sin'
        ? 'sin'
        : 'cos';
    return {
      kind: 'ready',
      variable,
      family,
      consumer: 'certificate-special-function',
      coefficientScope: 'exact-rational-target-free-symbolic',
      normalizedInput,
      coreArgumentNode: argument,
      coreArgumentLatex,
      coefficientNode: split.coefficientNode,
      coefficientLatex: split.coefficientNode === undefined ? undefined : boxLatex(split.coefficientNode),
      extensionChain: [
        { kind: fn, argumentLatex: coreArgumentLatex },
        { kind: 'quotient', denominatorLatex: coreArgumentLatex },
      ],
      derivativeCarrier: {
        kind: 'affine-slope',
        slopeNode: affine.slope,
        slopeLatex: affine.slopeLatex,
      },
      requiredFacts: factsForAffineSlope(affine.slope, affine.slopeLatex),
      branchFacts: [nonzeroFact(coreArgumentLatex)],
    };
  }

  if (numerator === 1 && isNodeArray(denominator) && denominator[0] === 'Ln' && denominator.length === 2) {
    const argument = denominator[1];
    const affine = parseSymbolicAffine(argument, variable);
    if (!affine) {
      return stop(
        variable,
        'non-affine-argument',
        'Logarithmic-integral readiness currently requires an affine logarithm argument.',
        normalizedInput,
      );
    }

    return {
      kind: 'ready',
      variable,
      family: 'logarithmic-integral-affine-reciprocal',
      consumer: 'certificate-special-function',
      coefficientScope: 'exact-rational-target-free-symbolic',
      normalizedInput,
      coreArgumentNode: argument,
      coreArgumentLatex: affine.latex,
      extensionChain: [
        { kind: 'ln', argumentLatex: affine.latex },
        { kind: 'quotient', denominatorLatex: `\\ln\\left(${affine.latex}\\right)` },
      ],
      derivativeCarrier: {
        kind: 'affine-slope',
        slopeNode: affine.slope,
        slopeLatex: affine.slopeLatex,
      },
      requiredFacts: factsForAffineSlope(affine.slope, affine.slopeLatex),
      branchFacts: [
        positiveFact(affine.latex),
        nonzeroFact(`\\ln\\left(${affine.latex}\\right)`),
      ],
    };
  }

  return undefined;
}

function expCompositionProfile(
  normalizedInput: unknown,
  variable: string,
): Depth2TowerProfile | undefined {
  const factors = isNodeArray(normalizedInput) && normalizedInput[0] === 'Multiply'
    ? flattenMultiply(normalizedInput)
    : [normalizedInput];

  for (const [head, family] of [
    ['Sin', 'sine-integral-exp-composition'],
    ['Cos', 'cosine-integral-exp-composition'],
    ['Power', 'exponential-integral-exp-composition'],
  ] as const) {
    const hasCandidateCarrier = factors.some((factor) => {
      if (head === 'Power') {
        return isExp(factor) && isExp(factor[2]);
      }
      return isNodeArray(factor)
        && factor[0] === head
        && factor.length === 2
        && isExp(factor[1]);
    });
    if (!hasCandidateCarrier) {
      continue;
    }

    const split = splitScalarCarrierProduct(normalizedInput, head, variable);
    if (split.kind === 'stop') {
      return stop(
        variable,
        split.reason,
        'Depth-2 composition profiling found a selected-variable-dependent or unsupported coefficient factor.',
        normalizedInput,
      );
    }
    if (split.kind !== 'success') {
      continue;
    }

    const argument = head === 'Power'
      ? (isExp(split.carrier) ? split.carrier[2] : undefined)
      : (isNodeArray(split.carrier) ? split.carrier[1] : undefined);
    if (!isExp(argument)) {
      continue;
    }

    const innerAffine = parseSymbolicAffine(argument[2], variable);
    if (!innerAffine) {
      return stop(
        variable,
        'non-affine-argument',
        'Depth-2 exp-composition certificates currently require an affine inner exponential exponent.',
        normalizedInput,
      );
    }

    const coreArgumentLatex = String.raw`e^{${innerAffine.latex}}`;
    const outerKind = head === 'Power'
      ? 'exp'
      : head === 'Sin'
        ? 'sin'
        : 'cos';

    return {
      kind: 'ready',
      variable,
      family,
      consumer: 'certificate-special-function',
      coefficientScope: 'exact-rational-target-free-symbolic',
      normalizedInput,
      coreArgumentNode: argument,
      coreArgumentLatex,
      coefficientNode: split.coefficientNode,
      coefficientLatex: split.coefficientNode === undefined ? undefined : boxLatex(split.coefficientNode),
      extensionChain: [
        { kind: 'exp', argumentLatex: innerAffine.latex },
        { kind: outerKind, argumentLatex: coreArgumentLatex },
      ],
      derivativeCarrier: {
        kind: 'affine-slope',
        slopeNode: innerAffine.slope,
        slopeLatex: innerAffine.slopeLatex,
      },
      requiredFacts: factsForAffineSlope(innerAffine.slope, innerAffine.slopeLatex),
      branchFacts: [positiveFact(coreArgumentLatex)],
    };
  }

  return undefined;
}

function nestedDerivativeSubstitutionProfile(
  normalizedInput: unknown,
  variable: string,
): Depth2TowerProfile | undefined {
  const factors = isNodeArray(normalizedInput) && normalizedInput[0] === 'Multiply'
    ? flattenMultiply(normalizedInput)
    : [normalizedInput];

  for (const outer of factors) {
    if (!isExp(outer) || !isExp(outer[2])) {
      continue;
    }

    const derivativeFactor = outer[2];
    const hasCarrier = factors.some((factor) => factor !== outer && sameNode(factor, derivativeFactor));
    if (!hasCarrier) {
      if (factors.length > 1) {
        return stop(
          variable,
          'missing-derivative-carrier',
          'Nested exponential substitution requires the inner exponential derivative factor.',
          normalizedInput,
        );
      }
      continue;
    }

    return {
      kind: 'ready',
      variable,
      family: 'nested-exp-derivative-substitution',
      consumer: 'risch-norman-substitution',
      coefficientScope: 'exact-rational-target-free-symbolic',
      normalizedInput,
      coreArgumentNode: derivativeFactor,
      coreArgumentLatex: boxLatex(derivativeFactor),
      extensionChain: [
        { kind: 'exp', argumentLatex: boxLatex(isExp(derivativeFactor) ? derivativeFactor[2] : derivativeFactor) },
        { kind: 'exp', argumentLatex: boxLatex(derivativeFactor) },
      ],
      derivativeCarrier: {
        kind: 'structural-factor',
        factorNode: derivativeFactor,
        factorLatex: boxLatex(derivativeFactor),
      },
      requiredFacts: [],
      branchFacts: [],
    };
  }

  for (const outer of factors) {
    if (!isExp(outer) || !isNodeArray(outer[2]) || outer[2][0] !== 'Sin' || outer[2].length !== 2) {
      continue;
    }

    const sineArgument = outer[2][1];
    const derivativeFactor = ['Cos', sineArgument];
    const hasCarrier = factors.some((factor) => factor !== outer && sameNode(factor, derivativeFactor));
    if (!hasCarrier) {
      if (factors.length > 1) {
        return stop(
          variable,
          'missing-derivative-carrier',
          'Nested sine-exponential substitution requires the cosine derivative factor.',
          normalizedInput,
        );
      }
      continue;
    }

    return {
      kind: 'ready',
      variable,
      family: 'nested-sin-exp-derivative-substitution',
      consumer: 'risch-norman-substitution',
      coefficientScope: 'exact-rational-target-free-symbolic',
      normalizedInput,
      coreArgumentNode: outer[2],
      coreArgumentLatex: boxLatex(outer[2]),
      extensionChain: [
        { kind: 'sin', argumentLatex: boxLatex(sineArgument) },
        { kind: 'exp', argumentLatex: boxLatex(outer[2]) },
      ],
      derivativeCarrier: {
        kind: 'structural-factor',
        factorNode: derivativeFactor,
        factorLatex: boxLatex(derivativeFactor),
      },
      requiredFacts: [],
      branchFacts: [],
    };
  }

  return undefined;
}

export function profileDepth2TranscendentalTower(
  node: unknown,
  variable = 'x',
): Depth2TowerProfile {
  const normalizedInput = normalizeAst(normalizeCertificateProofNode(node));

  if (containsInexactNumber(normalizedInput)) {
    return stop(
      variable,
      'inexact-coefficient',
      'Depth-2 tower profiling rejects decimal or inexact numeric leaves.',
      normalizedInput,
    );
  }

  const branchHead = findHead(normalizedInput, BRANCH_SENSITIVE_HEADS);
  if (branchHead) {
    return stop(
      variable,
      'branch-sensitive',
      `Depth-2 tower profiling rejects branch-sensitive carrier ${branchHead}.`,
      normalizedInput,
    );
  }

  const quotient = quotientProfile(normalizedInput, variable);
  if (quotient) {
    return quotient;
  }

  const expComposition = expCompositionProfile(normalizedInput, variable);
  if (expComposition) {
    return expComposition;
  }

  const nestedSubstitution = nestedDerivativeSubstitutionProfile(normalizedInput, variable);
  if (nestedSubstitution) {
    return nestedSubstitution;
  }

  const depth = towerDepth(normalizedInput);
  if (depth >= 3) {
    return stop(
      variable,
      'unsupported-depth3-tower',
      'Depth-3 and deeper transcendental towers are outside the current practical certificate/RN scope.',
      normalizedInput,
    );
  }
  if (depth === 2) {
    return stop(
      variable,
      'unsupported-depth2-tower',
      'This depth-2 tower is recognized as out of scope until a dedicated family owns it.',
      normalizedInput,
    );
  }

  return stop(
    variable,
    'no-supported-depth2-family',
    'No supported depth-2 certificate or RN substitution family matched this expression.',
    normalizedInput,
  );
}
